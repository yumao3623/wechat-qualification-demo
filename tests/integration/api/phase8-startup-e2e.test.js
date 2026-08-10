const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { request } = require('../../helpers/phase4');

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForHealth(baseUrl, child) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Backend 提前退出，code=${child.exitCode}`);
    try {
      const result = await request(baseUrl, '/api/health');
      if (result.response.status === 200) return result.body.data;
    } catch {
      // Backend 监听前的连接拒绝属于正常启动窗口。
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Backend 未在验收窗口内就绪。');
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000))
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

test('Phase 8 独立 Backend 进程完整链路与 Admin 只读脱敏', async (t) => {
  const root = path.resolve(__dirname, '../../..');
  const runtimePath = await fs.mkdtemp(path.join(os.tmpdir(), 'qualification-phase8-'));
  const port = await reservePort();
  const child = spawn(process.execPath, ['server/src/server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      RUNTIME_DATA_PATH: runtimePath,
      ASSESSMENT_PENDING_MS: '120',
      ASSESSMENT_STAGE_MS: '20'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  const stderr = [];
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  t.after(async () => {
    await stopChild(child);
    await fs.rm(runtimePath, { recursive: true, force: true });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const health = await waitForHealth(baseUrl, child).catch((error) => {
    error.message += ` stderr=${Buffer.concat(stderr).toString('utf8')}`;
    throw error;
  });
  assert.equal(health.status, 'ok');
  assert.equal(health.enterpriseProvider, 'mock');

  const search = await request(baseUrl, '/api/enterprises?keyword=Demo&limit=4');
  assert.equal(search.response.status, 200);
  assert.equal(search.body.data.items.length, 4);
  assert.equal(search.body.data.items.every((item) => item.isDemoData), true);

  const detail = await request(baseUrl, '/api/enterprises/demo-b-001');
  assert.equal(detail.body.data.isDemoData, true);
  const missing = await request(baseUrl, '/api/assessments/missing-fields', {
    method: 'POST',
    body: {
      enterpriseId: 'demo-b-001', supplements: { fields: {} },
      context: { targetApplicationYear: 2026 }
    }
  });
  assert.ok(missing.body.data.fields.length > 0);

  const login = await request(baseUrl, '/api/auth/login', {
    method: 'POST', key: 'phase8-process-login',
    body: {
      code: 'wx-phase8-process-code',
      client: { platform: 'wechat-miniprogram', version: '0.6.0' }
    }
  });
  assert.equal(login.response.status, 201);
  assert.equal(login.body.data.session.authMode, 'demo');
  const token = login.body.data.token;

  const created = await request(baseUrl, '/api/assessments', {
    method: 'POST', token, key: 'phase8-process-assessment',
    body: {
      enterpriseId: 'demo-b-001', supplements: { fields: {} },
      context: { targetApplicationYear: 2026 },
      agreement: {
        accepted: true,
        userAgreementVersion: '2026-08-10',
        privacyPolicyVersion: '2026-08-10',
        disclaimerVersion: '2026-08-10',
        agreedAt: new Date().toISOString(),
        agreementSource: 'assessment-dialog'
      }
    }
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.status, 'pending');
  const assessmentId = created.body.data.assessmentId;

  await new Promise((resolve) => setTimeout(resolve, 140));
  const processing = await request(baseUrl, `/api/assessments/${assessmentId}/status`, { token });
  assert.equal(processing.body.data.status, 'processing');
  await new Promise((resolve) => setTimeout(resolve, 240));
  const ready = await request(baseUrl, `/api/assessments/${assessmentId}/status`, { token });
  assert.equal(ready.body.data.status, 'ready');

  const report = await request(baseUrl, `/api/assessments/${assessmentId}/report`, { token });
  assert.equal(report.body.data.qualifications.length, 4);
  assert.ok(report.body.data.evidence.length > 0);
  assert.ok(report.body.data.gaps.length > 0);
  assert.ok(report.body.data.actions.length > 0);
  const reports = await request(baseUrl, '/api/reports', { token });
  assert.equal(reports.body.data.items[0].reportId, report.body.data.id);

  const lead = await request(baseUrl, '/api/leads', {
    method: 'POST', key: 'phase8-process-lead',
    body: {
      enterprise: { enterpriseId: 'demo-b-001', name: '杭州市云舟微研 Demo 有限公司' },
      contactName: 'Phase8 演示联系人', mobile: '13800000000',
      directions: ['comprehensive'], note: 'Phase 8 最终验收',
      consent: {
        accepted: true, noticeVersion: 'lead-privacy-2026-08-10',
        agreedAt: new Date().toISOString(), purpose: 'consultant_contact'
      }
    }
  });
  assert.equal(lead.response.status, 201);

  const adminAssessments = await request(baseUrl, '/api/admin/assessments');
  const adminLeads = await request(baseUrl, '/api/admin/leads');
  assert.equal(adminAssessments.body.data.items.length, 1);
  assert.equal(adminLeads.body.data.items.length, 1);
  const adminJson = JSON.stringify(adminLeads.body);
  assert.doesNotMatch(adminJson, /13800000000/);
  assert.doesNotMatch(adminJson, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(adminLeads.body.data.items[0].maskedMobile, /^138\*+0000$/);

  const logout = await request(baseUrl, '/api/auth/session', {
    method: 'DELETE', token, key: 'phase8-process-logout'
  });
  assert.equal(logout.response.status, 204);
  const denied = await request(baseUrl, '/api/reports', { token });
  assert.equal(denied.response.status, 401);
});
