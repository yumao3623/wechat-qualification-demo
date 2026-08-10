const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { createApp } = require('../../server/src/app');
const { createRuntimeRepositories } = require('../../server/src/repositories/JsonRuntimeRepositories');

class FakeClock {
  constructor(iso = '2026-08-10T01:00:00.000Z') {
    this.value = new Date(iso);
  }
  now() { return new Date(this.value); }
  advance(ms) { this.value = new Date(this.value.getTime() + ms); }
}

async function createTestContext(t, options = {}) {
  const runtimePath = await fs.mkdtemp(path.join(os.tmpdir(), 'qualification-phase4-'));
  const clock = options.clock || new FakeClock();
  const runtimeRepositories = options.runtimeRepositories || createRuntimeRepositories({ runtimePath });
  if (options.configureRepositories) options.configureRepositories(runtimeRepositories);
  const app = createApp({
    runtimeRepositories,
    clock,
    sessionTtlMs: options.sessionTtlMs || 60_000,
    assessmentPendingMs: options.assessmentPendingMs || 100,
    assessmentStageMs: options.assessmentStageMs || 100,
    adminRequestPolicy: options.adminRequestPolicy,
    qualificationEngine: options.qualificationEngine,
    reportGenerator: options.reportGenerator
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.close();
    await once(server, 'close');
    await fs.rm(runtimePath, { recursive: true, force: true });
  });
  return { app, baseUrl, clock, runtimePath, runtimeRepositories };
}

async function request(baseUrl, pathname, { method = 'GET', token, key, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (key) headers['x-idempotency-key'] = key;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

async function login(baseUrl, suffix = 'a') {
  const result = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    key: `login-${suffix}`,
    body: {
      code: `wx-demo-code-${suffix}`,
      client: { platform: 'wechat-miniprogram', version: '0.4.0' }
    }
  });
  if (result.response.status !== 201) throw new Error(`login failed: ${JSON.stringify(result.body)}`);
  return result.body.data;
}

function agreement(clock) {
  return {
    accepted: true,
    userAgreementVersion: '2026-08-10',
    privacyPolicyVersion: '2026-08-10',
    disclaimerVersion: '2026-08-10',
    agreedAt: clock.now().toISOString(),
    agreementSource: 'assessment-dialog'
  };
}

function assessmentBody(clock, enterpriseId = 'demo-a-001', supplements = { fields: {} }) {
  return {
    enterpriseId,
    supplements,
    context: { targetApplicationYear: 2026 },
    agreement: agreement(clock)
  };
}

module.exports = {
  FakeClock,
  agreement,
  assessmentBody,
  createTestContext,
  login,
  request
};
