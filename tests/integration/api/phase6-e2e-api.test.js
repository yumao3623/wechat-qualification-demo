const assert = require('node:assert/strict');
const test = require('node:test');
const { assessmentBody, createTestContext, login, request } = require('../../helpers/phase4');

test('Phase 6 Backend 实际 HTTP 链路：Auth → Consent/Diagnosis → Status → Report → List → Logout，并提交游客 Lead', async (t) => {
  const { baseUrl, clock } = await createTestContext(t);
  const auth = await login(baseUrl, 'phase6-live');
  assert.equal(auth.session.authMode, 'demo');

  const created = await request(baseUrl, '/api/assessments', {
    method: 'POST', token: auth.token, key: 'phase6-live-assessment',
    body: assessmentBody(clock, 'demo-b-001')
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.status, 'pending');
  const assessmentId = created.body.data.assessmentId;

  clock.advance(101);
  const processing = await request(baseUrl, `/api/assessments/${assessmentId}/status`, { token: auth.token });
  assert.equal(processing.body.data.status, 'processing');
  clock.advance(800);
  const ready = await request(baseUrl, `/api/assessments/${assessmentId}/status`, { token: auth.token });
  assert.equal(ready.body.data.status, 'ready');

  const report = await request(baseUrl, `/api/assessments/${assessmentId}/report`, { token: auth.token });
  assert.equal(report.response.status, 200);
  assert.equal(report.body.data.qualifications.length, 4);
  assert.ok(report.body.data.evidence.length > 0);
  assert.ok(report.body.data.gaps.length > 0);
  assert.ok(report.body.data.actions.length > 0);

  const reports = await request(baseUrl, '/api/reports', { token: auth.token });
  assert.equal(reports.response.status, 200);
  assert.equal(reports.body.data.items[0].reportId, report.body.data.id);

  const lead = await request(baseUrl, '/api/leads', {
    method: 'POST', key: 'phase6-live-lead',
    body: {
      enterprise: { enterpriseId: 'demo-b-001', name: '杭州市云舟微研 Demo 有限公司' },
      contactName: '演示联系人', mobile: '13800000000', directions: ['comprehensive'], note: 'Phase 6 联调',
      consent: { accepted: true, noticeVersion: 'lead-privacy-2026-08-10', agreedAt: clock.now().toISOString(), purpose: 'consultant_contact' }
    }
  });
  assert.equal(lead.response.status, 201);
  assert.equal(lead.body.data.status, 'submitted');

  const logout = await request(baseUrl, '/api/auth/session', { method: 'DELETE', token: auth.token, key: 'phase6-live-logout' });
  assert.equal(logout.response.status, 204);
  const denied = await request(baseUrl, `/api/reports/${report.body.data.id}`, { token: auth.token });
  assert.equal(denied.response.status, 401);
});
