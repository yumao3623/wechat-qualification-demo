const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const { maskMobile } = require('../../../server/src/services/AdminService');
const {
  assessmentBody, createTestContext, login, request
} = require('../../helpers/phase4');

function leadBody(clock) {
  return {
    enterprise: { enterpriseId: 'demo-a-001', name: '杭州市星澜智造 Demo 有限公司' },
    contactName: '演示联系人',
    mobile: '13800000000',
    directions: ['high_tech_enterprise', 'specialized_innovative'],
    note: 'Phase 7 Admin 真实线索',
    consent: {
      accepted: true,
      noticeVersion: 'lead-privacy-2026-08-10',
      agreedAt: clock.now().toISOString(),
      purpose: 'consultant_contact'
    }
  };
}

test('本地 Admin 页面与两个只读 API 可打开，空数据返回 Empty 所需结构', async (t) => {
  const { baseUrl } = await createTestContext(t);
  const page = await fetch(`${baseUrl}/admin/`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /本地 Demo 管理页，不具备生产权限安全/);
  assert.match(html, /诊断记录/);
  assert.match(html, /顾问线索/);

  const [assessments, leads] = await Promise.all([
    request(baseUrl, '/api/admin/assessments'),
    request(baseUrl, '/api/admin/leads')
  ]);
  assert.equal(assessments.response.status, 200);
  assert.deepEqual(assessments.body.data.items, []);
  assert.equal(leads.response.status, 200);
  assert.deepEqual(leads.body.data.items, []);
});

test('Admin 展示真实持久化诊断与 Lead，报告关联正确且手机号及内部字段被过滤', async (t) => {
  const { baseUrl, clock } = await createTestContext(t);
  const auth = await login(baseUrl, 'admin-data');
  const created = await request(baseUrl, '/api/assessments', {
    method: 'POST',
    token: auth.token,
    key: 'admin-assessment',
    body: assessmentBody(clock, 'demo-a-001')
  });
  assert.equal(created.response.status, 201);

  const lead = await request(baseUrl, '/api/leads', {
    method: 'POST', key: 'admin-lead', body: leadBody(clock)
  });
  assert.equal(lead.response.status, 201);

  const pending = await request(baseUrl, '/api/admin/assessments');
  assert.equal(pending.body.data.items[0].assessmentId, created.body.data.assessmentId);
  assert.equal(pending.body.data.items[0].status, 'pending');
  assert.equal(pending.body.data.items[0].reportStatus, 'pending');
  assert.equal(pending.body.data.items[0].enterprise.isDemoData, true);

  clock.advance(901);
  await request(baseUrl, `/api/assessments/${created.body.data.assessmentId}/status`, {
    token: auth.token
  });
  const assessments = await request(baseUrl, '/api/admin/assessments');
  const assessmentItem = assessments.body.data.items[0];
  assert.equal(assessmentItem.status, 'ready');
  assert.equal(assessmentItem.reportStatus, 'ready');
  assert.match(assessmentItem.reportId, /^rpt_/);

  const leads = await request(baseUrl, '/api/admin/leads');
  const leadItem = leads.body.data.items[0];
  assert.equal(leadItem.leadId, lead.body.data.leadId);
  assert.equal(leadItem.maskedMobile, '138****0000');
  assert.deepEqual(leadItem.directions, ['high_tech_enterprise', 'specialized_innovative']);

  const output = JSON.stringify({ assessmentItem, leadItem });
  assert.doesNotMatch(output, /13800000000|userId|sessionId|tokenHash|idempotencyKeyHash|requestHash|consent|agreementSnapshot|inputSnapshot/);
});

test('Admin 对非本地请求统一返回 403，且不暴露静态页面或内部错误', async (t) => {
  const { baseUrl } = await createTestContext(t, { adminRequestPolicy: () => false });
  for (const pathname of ['/api/admin/assessments', '/api/admin/leads', '/admin/']) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.error.code, 'FORBIDDEN');
    assert.equal(Object.hasOwn(body.error, 'stack'), false);
  }
});

test('Admin API 读取失败返回安全 Error，静态资源包含 Loading/Empty/Error/Success 状态实现', async (t) => {
  const { baseUrl } = await createTestContext(t, {
    configureRepositories(repositories) {
      repositories.assessmentRepository.listAll = async () => {
        throw new Error('private runtime path C:\\secret\\assessments.json');
      };
    }
  });
  const failed = await request(baseUrl, '/api/admin/assessments');
  assert.equal(failed.response.status, 500);
  assert.equal(failed.body.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(JSON.stringify(failed.body), /private runtime|secret|stack/);

  const script = await fs.readFile(
    path.resolve(__dirname, '../../../server/public/admin/admin.js'),
    'utf8'
  );
  for (const state of ['loading', 'empty', 'error', 'success']) {
    assert.match(script, new RegExp(`['\"]${state}['\"]`));
  }
});

test('手机号脱敏不回传异常值或完整手机号', () => {
  assert.equal(maskMobile('13800000000'), '138****0000');
  assert.equal(maskMobile('invalid'), '未提供');
  assert.equal(maskMobile(null), '未提供');
});
