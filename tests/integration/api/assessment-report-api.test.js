const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { QualificationEngine } = require('../../../server/src/domain/qualification/QualificationEngine');
const { JsonEnterpriseRepository } = require('../../../server/src/repositories/JsonEnterpriseRepository');
const {
  agreement, assessmentBody, createTestContext, login, request
} = require('../../helpers/phase4');

async function createAssessment(baseUrl, token, clock, enterpriseId, key, supplements = { fields: {} }) {
  return request(baseUrl, '/api/assessments', {
    method: 'POST', token, key,
    body: assessmentBody(clock, enterpriseId, supplements)
  });
}

test('无 Session 或无完整协议均不能创建诊断，协议版本和 Session/User 被保存', async (t) => {
  const { baseUrl, clock, runtimeRepositories } = await createTestContext(t);
  const anonymous = await createAssessment(baseUrl, null, clock, 'demo-a-001', 'anonymous');
  assert.equal(anonymous.response.status, 401);
  assert.equal(anonymous.body.error.code, 'AUTH_REQUIRED');

  const auth = await login(baseUrl, 'consent');
  const noAgreementBody = assessmentBody(clock);
  delete noAgreementBody.agreement;
  const missing = await request(baseUrl, '/api/assessments', {
    method: 'POST', token: auth.token, key: 'missing-consent', body: noAgreementBody
  });
  assert.equal(missing.response.status, 409);
  assert.equal(missing.body.error.code, 'AGREEMENT_REQUIRED');

  const wrongVersionBody = assessmentBody(clock);
  wrongVersionBody.agreement.privacyPolicyVersion = 'old-version';
  const wrongVersion = await request(baseUrl, '/api/assessments', {
    method: 'POST', token: auth.token, key: 'wrong-version', body: wrongVersionBody
  });
  assert.equal(wrongVersion.response.status, 409);
  assert.equal(wrongVersion.body.error.code, 'AGREEMENT_REQUIRED');

  const declinedBody = assessmentBody(clock);
  declinedBody.agreement.accepted = false;
  const declined = await request(baseUrl, '/api/assessments', {
    method: 'POST', token: auth.token, key: 'declined-consent', body: declinedBody
  });
  assert.equal(declined.response.status, 409);
  assert.equal(declined.body.error.code, 'AGREEMENT_REQUIRED');

  const olderConsentBody = assessmentBody(clock);
  olderConsentBody.agreement.agreedAt = '2026-08-08T00:00:00.000Z';
  const olderConsent = await request(baseUrl, '/api/assessments', {
    method: 'POST', token: auth.token, key: 'older-consent', body: olderConsentBody
  });
  assert.equal(olderConsent.response.status, 201);

  const created = await createAssessment(baseUrl, auth.token, clock, 'demo-a-001', 'valid-consent');
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.status, 'pending');
  const consent = await runtimeRepositories.consentRepository.findByAssessmentId(created.body.data.assessmentId);
  assert.equal(consent.accepted, true);
  assert.equal(consent.userAgreementVersion, '2026-08-10');
  assert.equal(consent.sessionId, auth.session.id);
  assert.equal(consent.userId, auth.session.userId);
  assert.equal(consent.context.purpose, 'qualification_pre_assessment');
});

test('诊断幂等键避免重复创建，payload 变化返回冲突', async (t) => {
  const { baseUrl, clock, runtimeRepositories } = await createTestContext(t);
  const auth = await login(baseUrl, 'assessment-idempotency');
  const first = await createAssessment(baseUrl, auth.token, clock, 'demo-a-001', 'same-assessment');
  const second = await createAssessment(baseUrl, auth.token, clock, 'demo-a-001', 'same-assessment');
  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 200);
  assert.equal(second.body.data.assessmentId, first.body.data.assessmentId);
  assert.equal((await runtimeRepositories.assessmentRepository.listByUser(auth.session.userId)).length, 1);

  const changed = await createAssessment(baseUrl, auth.token, clock, 'demo-c-001', 'same-assessment');
  assert.equal(changed.response.status, 409);
  assert.equal(changed.body.error.code, 'STATE_CONFLICT');
});

test('诊断真实经历 pending → processing → ready，报告只持久化一次', async (t) => {
  const { baseUrl, clock, runtimeRepositories } = await createTestContext(t);
  const auth = await login(baseUrl, 'lifecycle');
  const created = await createAssessment(baseUrl, auth.token, clock, 'demo-a-001', 'lifecycle');
  const id = created.body.data.assessmentId;

  const pending = await request(baseUrl, `/api/assessments/${id}/status`, { token: auth.token });
  assert.equal(pending.body.data.status, 'pending');
  assert.equal(pending.body.data.stage, 'prepare_enterprise_data');
  clock.advance(101);
  const processing = await request(baseUrl, `/api/assessments/${id}/status`, { token: auth.token });
  assert.equal(processing.body.data.status, 'processing');
  assert.equal(processing.body.data.stageIndex, 1);
  clock.advance(800);
  const ready = await request(baseUrl, `/api/assessments/${id}/status`, { token: auth.token });
  assert.equal(ready.body.data.status, 'ready');
  assert.match(ready.body.data.reportId, /^rpt_/);

  const again = await request(baseUrl, `/api/assessments/${id}/status`, { token: auth.token });
  assert.equal(again.body.data.reportId, ready.body.data.reportId);
  assert.equal((await runtimeRepositories.reportRepository.listByUser(auth.session.userId)).length, 1);
});

test('报告未就绪返回 409；ready 后按诊断、报告 ID 和列表读取持久化快照', async (t) => {
  const { baseUrl, clock } = await createTestContext(t);
  const auth = await login(baseUrl, 'report-flow');
  const empty = await request(baseUrl, '/api/reports', { token: auth.token });
  assert.equal(empty.response.status, 200);
  assert.deepEqual(empty.body.data.items, []);

  const created = await createAssessment(baseUrl, auth.token, clock, 'demo-a-001', 'report-flow');
  const id = created.body.data.assessmentId;
  const notReady = await request(baseUrl, `/api/assessments/${id}/report`, { token: auth.token });
  assert.equal(notReady.response.status, 409);
  assert.equal(notReady.body.error.code, 'REPORT_NOT_READY');
  assert.doesNotMatch(JSON.stringify(notReady.body), /stack|AssessmentService/);

  const processingList = await request(baseUrl, '/api/reports', { token: auth.token });
  assert.equal(processingList.body.data.items[0].status, 'pending');
  clock.advance(901);
  const byAssessment = await request(baseUrl, `/api/assessments/${id}/report`, { token: auth.token });
  assert.equal(byAssessment.response.status, 200);
  assert.equal(byAssessment.body.data.qualifications.length, 4);
  assert.match(byAssessment.body.data.inputSnapshotHash, /^sha256:/);
  const reportId = byAssessment.body.data.id;
  const byId = await request(baseUrl, `/api/reports/${reportId}`, { token: auth.token });
  assert.deepEqual(byId.body.data, byAssessment.body.data);
  const list = await request(baseUrl, '/api/reports', { token: auth.token });
  assert.equal(list.body.data.items[0].status, 'ready');
  assert.equal(list.body.data.items[0].summary.length, 4);
});

test('A/B/C/D 通过后端诊断生成目标报告状态，B 允许带缺失数据生成 needs_data', async (t) => {
  const { baseUrl, clock } = await createTestContext(t);
  const auth = await login(baseUrl, 'scenarios');
  const ids = {};
  for (const scenario of ['a', 'b', 'c', 'd']) {
    const result = await createAssessment(baseUrl, auth.token, clock, `demo-${scenario}-001`, `scenario-${scenario}`);
    assert.equal(result.response.status, 201);
    ids[scenario] = result.body.data.assessmentId;
  }
  clock.advance(901);
  const reports = {};
  for (const scenario of Object.keys(ids)) {
    const result = await request(baseUrl, `/api/assessments/${ids[scenario]}/report`, { token: auth.token });
    assert.equal(result.response.status, 200);
    reports[scenario] = result.body.data;
  }
  assert.ok(reports.a.qualifications.every((item) => item.status === 'opportunity'));
  assert.ok(reports.b.qualifications.every((item) => item.status === 'needs_data'));
  assert.ok(reports.c.qualifications.every((item) => item.status === 'not_met'));
  assert.equal(
    reports.d.qualifications.find((item) => item.qualificationType === 'eagle_enterprise').status,
    'not_applicable'
  );
});

test('用户补充保留 user 来源、企业快照与输入 hash，且不修改 Mock fixture', async (t) => {
  const { baseUrl, clock, runtimeRepositories } = await createTestContext(t);
  const auth = await login(baseUrl, 'supplements');
  const fixturePath = path.resolve(__dirname, '../../../server/data/fixtures/mock-enterprises.json');
  const repo = new JsonEnterpriseRepository({ filePath: fixturePath });
  const [a, b] = (await repo.findAll()).slice(0, 2);
  const schemaResult = await request(baseUrl, '/api/assessments/missing-fields', {
    method: 'POST',
    body: { enterpriseId: b.id, supplements: { fields: {} }, context: { targetApplicationYear: 2026 } }
  });
  assert.equal(schemaResult.response.status, 200);
  const fields = {};
  for (const field of schemaResult.body.data.fields) {
    const match = /^(.*)\.(\d{4})$/.exec(field.key);
    const baseKey = match ? match[1] : field.key;
    const year = match ? Number(match[2]) : undefined;
    const source = a.fields[baseKey];
    fields[field.key] = structuredClone(Array.isArray(source)
      ? source.find((item) => item.period?.year === year)
      : source);
  }
  const created = await createAssessment(baseUrl, auth.token, clock, b.id, 'supplemented-b', { fields });
  assert.equal(created.response.status, 201);
  const stored = await runtimeRepositories.assessmentRepository.findById(created.body.data.assessmentId);
  assert.equal(stored.inputSnapshot.enterprise.supplementalData.fields['rdExpense.2025'].source.sourceType, 'user');
  assert.match(stored.inputSnapshotHash, /^sha256:[a-f0-9]{64}$/);
  const fixtureAfter = await repo.findById(b.id);
  assert.deepEqual(fixtureAfter, b);
  clock.advance(901);
  const report = await request(baseUrl, `/api/assessments/${stored.id}/report`, { token: auth.token });
  assert.ok(report.body.data.qualifications.every((item) => item.status === 'opportunity'));
  assert.equal(report.body.data.inputSnapshotHash, stored.inputSnapshotHash);
});

test('非法 Supplemental Data 与不存在企业在创建前被拒绝', async (t) => {
  const { baseUrl, clock, runtimeRepositories } = await createTestContext(t);
  const auth = await login(baseUrl, 'invalid-input');
  const invalid = await createAssessment(baseUrl, auth.token, clock, 'demo-b-001', 'bad-supplement', {
    fields: {
      'rdExpense.2025': {
        value: 100,
        unit: 'USD',
        period: { type: 'fiscal_year', year: 2024 }
      }
    }
  });
  assert.equal(invalid.response.status, 422);
  assert.equal(invalid.body.error.code, 'BUSINESS_RULE_INPUT_INVALID');
  assert.equal(Object.hasOwn(invalid.body.error, 'stack'), false);

  const missing = await createAssessment(baseUrl, auth.token, clock, 'demo-z-999', 'missing-enterprise');
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error.code, 'ENTERPRISE_NOT_FOUND');
  assert.deepEqual(await runtimeRepositories.assessmentRepository.listByUser(auth.session.userId), []);
});

test('诊断与报告按 userId 隔离，其他 Session 统一得到 404', async (t) => {
  const { baseUrl, clock } = await createTestContext(t);
  const userA = await login(baseUrl, 'owner-a');
  const userB = await login(baseUrl, 'owner-b');
  const created = await createAssessment(baseUrl, userA.token, clock, 'demo-a-001', 'owned-by-a');
  const id = created.body.data.assessmentId;
  const forbiddenStatus = await request(baseUrl, `/api/assessments/${id}/status`, { token: userB.token });
  assert.equal(forbiddenStatus.response.status, 404);
  assert.equal(forbiddenStatus.body.error.code, 'ASSESSMENT_NOT_FOUND');
  clock.advance(901);
  const ownerReport = await request(baseUrl, `/api/assessments/${id}/report`, { token: userA.token });
  const reportId = ownerReport.body.data.id;
  const forbiddenReport = await request(baseUrl, `/api/reports/${reportId}`, { token: userB.token });
  assert.equal(forbiddenReport.response.status, 404);
  assert.equal(forbiddenReport.body.error.code, 'REPORT_NOT_FOUND');
  const userBList = await request(baseUrl, '/api/reports', { token: userB.token });
  assert.deepEqual(userBList.body.data.items, []);
});

test('Rule Engine 异常安全转换为 failed，列表表达失败且不暴露内部错误', async (t) => {
  const engine = new QualificationEngine();
  engine.evaluateAssessmentInput = () => { throw new Error('private stack and path C:\\secret'); };
  const { baseUrl, clock } = await createTestContext(t, { qualificationEngine: engine });
  const auth = await login(baseUrl, 'engine-failure');
  const created = await createAssessment(baseUrl, auth.token, clock, 'demo-a-001', 'engine-failure');
  clock.advance(101);
  const processing = await request(baseUrl, `/api/assessments/${created.body.data.assessmentId}/status`, { token: auth.token });
  assert.equal(processing.body.data.status, 'processing');
  clock.advance(800);
  const status = await request(baseUrl, `/api/assessments/${created.body.data.assessmentId}/status`, { token: auth.token });
  assert.equal(status.body.data.status, 'failed');
  assert.equal(status.body.data.error.code, 'ASSESSMENT_PROCESSING_FAILED');
  assert.doesNotMatch(JSON.stringify(status.body), /private stack|secret|AssessmentService/);
  const list = await request(baseUrl, '/api/reports', { token: auth.token });
  assert.equal(list.body.data.items[0].status, 'failed');
});
