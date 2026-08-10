const assert = require('node:assert/strict');
const test = require('node:test');
const { createTestContext, request } = require('../../helpers/phase4');

function leadBody(clock) {
  return {
    enterprise: { enterpriseId: 'demo-a-001', name: '杭州市星澜智造 Demo 有限公司' },
    contactName: '演示联系人',
    mobile: '13800000000',
    directions: ['high_tech_enterprise', 'specialized_innovative'],
    note: '希望了解材料准备顺序',
    consent: {
      accepted: true,
      noticeVersion: 'lead-privacy-2026-08-10',
      agreedAt: clock.now().toISOString(),
      purpose: 'consultant_contact'
    }
  };
}

test('游客在独立明确同意后可提交顾问线索并真实保存', async (t) => {
  const { baseUrl, clock, runtimeRepositories } = await createTestContext(t);
  const body = leadBody(clock);
  body.consent.agreedAt = '2026-08-01T00:00:00.000Z';
  const result = await request(baseUrl, '/api/leads', {
    method: 'POST', key: 'lead-valid', body
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.data.status, 'submitted');
  const stored = await runtimeRepositories.leadRepository.findByIdempotency(
    require('../../../server/src/utils/ids').sha256('lead-idempotency:lead-valid')
  );
  assert.equal(stored.mobile, '13800000000');
  assert.equal(stored.consent.accepted, true);
  assert.equal(stored.consent.purpose, 'consultant_contact');
  assert.equal(stored.sessionId, null);
});

test('Lead 幂等重试返回同一记录，不同 payload 返回冲突', async (t) => {
  const { baseUrl, clock, runtimeRepositories } = await createTestContext(t);
  const body = leadBody(clock);
  const first = await request(baseUrl, '/api/leads', { method: 'POST', key: 'lead-same', body });
  const second = await request(baseUrl, '/api/leads', { method: 'POST', key: 'lead-same', body });
  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 200);
  assert.equal(second.body.data.leadId, first.body.data.leadId);
  const changed = await request(baseUrl, '/api/leads', {
    method: 'POST', key: 'lead-same', body: { ...body, note: '不同备注' }
  });
  assert.equal(changed.response.status, 409);
  assert.equal(changed.body.error.code, 'STATE_CONFLICT');
  assert.equal((await runtimeRepositories.leadRepository.collection.list()).length, 1);
});

test('非法手机号、姓名、方向、备注和缺少独立同意均不保存 Lead', async (t) => {
  const { baseUrl, clock, runtimeRepositories } = await createTestContext(t);
  const base = leadBody(clock);
  const cases = [
    { ...base, mobile: '123' },
    { ...base, contactName: 'a' },
    { ...base, directions: [] },
    { ...base, note: 'x'.repeat(501) },
    { ...base, consent: { ...base.consent, accepted: false } },
    { ...base, consent: { ...base.consent, noticeVersion: 'old' } }
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const result = await request(baseUrl, '/api/leads', {
      method: 'POST', key: `lead-invalid-${index}`, body: cases[index]
    });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error.code, 'VALIDATION_ERROR');
    assert.equal(Object.hasOwn(result.body.error, 'stack'), false);
  }
  assert.deepEqual(await runtimeRepositories.leadRepository.collection.list(), []);
});

test('Lead 企业名称必须与 Demo 主体一致，不存在企业返回 404', async (t) => {
  const { baseUrl, clock } = await createTestContext(t);
  const mismatch = leadBody(clock);
  mismatch.enterprise.name = '错误企业名称';
  const mismatchResult = await request(baseUrl, '/api/leads', {
    method: 'POST', key: 'lead-mismatch', body: mismatch
  });
  assert.equal(mismatchResult.response.status, 400);
  assert.equal(mismatchResult.body.error.fields[0].field, 'enterprise.name');

  const missing = leadBody(clock);
  missing.enterprise.enterpriseId = 'demo-z-999';
  missing.enterprise.name = '不存在 Demo 企业';
  const missingResult = await request(baseUrl, '/api/leads', {
    method: 'POST', key: 'lead-missing', body: missing
  });
  assert.equal(missingResult.response.status, 404);
  assert.equal(missingResult.body.error.code, 'ENTERPRISE_NOT_FOUND');
});
