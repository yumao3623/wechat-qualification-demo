const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const { createApp } = require('../../../server/src/app');
const { createRuntimeRepositories } = require('../../../server/src/repositories/JsonRuntimeRepositories');
const {
  assessmentBody, createTestContext, login, request
} = require('../../helpers/phase4');

test('服务重建后从 JSON 恢复 pending 诊断并推进到 ready', async (t) => {
  const { baseUrl, clock, runtimePath } = await createTestContext(t);
  const auth = await login(baseUrl, 'restart');
  const created = await request(baseUrl, '/api/assessments', {
    method: 'POST', token: auth.token, key: 'restart-assessment',
    body: assessmentBody(clock)
  });
  clock.advance(901);

  const app2 = createApp({
    runtimeRepositories: createRuntimeRepositories({ runtimePath }),
    clock,
    sessionTtlMs: 60_000,
    assessmentPendingMs: 100,
    assessmentStageMs: 100
  });
  const server2 = app2.listen(0, '127.0.0.1');
  await once(server2, 'listening');
  t.after(async () => {
    server2.close();
    await once(server2, 'close');
  });
  const baseUrl2 = `http://127.0.0.1:${server2.address().port}`;
  const status = await request(baseUrl2, `/api/assessments/${created.body.data.assessmentId}/status`, {
    token: auth.token
  });
  assert.equal(status.response.status, 200);
  assert.equal(status.body.data.status, 'ready');
  const report = await request(baseUrl2, `/api/reports/${status.body.data.reportId}`, { token: auth.token });
  assert.equal(report.response.status, 200);
});

test('Report Repository 保存异常被转换为 failed，不暴露文件路径或 stack', async (t) => {
  const { baseUrl, clock } = await createTestContext(t, {
    configureRepositories(repositories) {
      const original = repositories.reportRepository;
      repositories.reportRepository = {
        create: async () => { throw new Error('private path C:\\runtime\\reports.json'); },
        findById: original.findById.bind(original),
        findByAssessmentId: original.findByAssessmentId.bind(original),
        listByUser: original.listByUser.bind(original)
      };
    }
  });
  const auth = await login(baseUrl, 'report-save-failure');
  const created = await request(baseUrl, '/api/assessments', {
    method: 'POST', token: auth.token, key: 'report-save-failure', body: assessmentBody(clock)
  });
  clock.advance(901);
  const status = await request(baseUrl, `/api/assessments/${created.body.data.assessmentId}/status`, { token: auth.token });
  assert.equal(status.body.data.status, 'failed');
  assert.equal(status.body.data.error.code, 'REPORT_PERSISTENCE_FAILED');
  assert.doesNotMatch(JSON.stringify(status.body), /private path|reports\.json|stack/);
});

test('注销只吊销访问能力，不删除已生成诊断和报告', async (t) => {
  const { baseUrl, clock, runtimeRepositories } = await createTestContext(t);
  const auth = await login(baseUrl, 'retention');
  const created = await request(baseUrl, '/api/assessments', {
    method: 'POST', token: auth.token, key: 'retained-assessment', body: assessmentBody(clock)
  });
  clock.advance(901);
  const ready = await request(baseUrl, `/api/assessments/${created.body.data.assessmentId}/status`, { token: auth.token });
  const logout = await request(baseUrl, '/api/auth/session', {
    method: 'DELETE', token: auth.token, key: 'retention-logout'
  });
  assert.equal(logout.response.status, 204);
  const denied = await request(baseUrl, `/api/reports/${ready.body.data.reportId}`, { token: auth.token });
  assert.equal(denied.response.status, 401);
  const assessment = await runtimeRepositories.assessmentRepository.findById(created.body.data.assessmentId);
  const report = await runtimeRepositories.reportRepository.findById(ready.body.data.reportId);
  assert.equal(assessment.status, 'ready');
  assert.equal(report.status, 'ready');
});

test('损坏 runtime JSON 返回安全 500，原损坏文件不会被覆盖为空', async (t) => {
  const { baseUrl, runtimePath } = await createTestContext(t);
  const sessionsPath = path.join(runtimePath, 'sessions.json');
  await fs.writeFile(sessionsPath, '{broken-json', 'utf8');
  const response = await request(baseUrl, '/api/auth/login', {
    method: 'POST', key: 'corrupt-runtime',
    body: {
      code: 'wx-corrupt-runtime',
      client: { platform: 'wechat-miniprogram', version: '0.4.0' }
    }
  });
  assert.equal(response.response.status, 500);
  assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  assert.equal(await fs.readFile(sessionsPath, 'utf8'), '{broken-json');
  assert.doesNotMatch(JSON.stringify(response.body), /JSON|sessions\.json|stack/);
});
