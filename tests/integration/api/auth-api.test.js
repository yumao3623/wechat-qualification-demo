const assert = require('node:assert/strict');
const test = require('node:test');
const { createTestContext, login, request } = require('../../helpers/phase4');

test('Demo 登录创建随机 Session，查询时不返回 token/hash，Repository 只保存摘要', async (t) => {
  const { baseUrl, runtimeRepositories } = await createTestContext(t);
  const auth = await login(baseUrl, 'session');
  assert.match(auth.token, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(auth.session.authMode, 'demo');

  const current = await request(baseUrl, '/api/auth/session', { token: auth.token });
  assert.equal(current.response.status, 200);
  assert.equal(current.body.data.id, auth.session.id);
  assert.equal(Object.hasOwn(current.body.data, 'token'), false);
  assert.equal(Object.hasOwn(current.body.data, 'tokenHash'), false);

  const stored = await runtimeRepositories.sessionRepository.findById(auth.session.id);
  assert.match(stored.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(stored).includes(auth.token), false);
});

test('登录幂等、payload 冲突、code 单次使用与输入校验均有效', async (t) => {
  const { baseUrl } = await createTestContext(t);
  const payload = {
    code: 'wx-demo-idempotent',
    client: { platform: 'wechat-miniprogram', version: '0.4.0' }
  };
  const first = await request(baseUrl, '/api/auth/login', { method: 'POST', key: 'same-login', body: payload });
  const second = await request(baseUrl, '/api/auth/login', { method: 'POST', key: 'same-login', body: payload });
  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 200);
  assert.equal(second.body.data.token, first.body.data.token);

  const conflict = await request(baseUrl, '/api/auth/login', {
    method: 'POST', key: 'same-login', body: { ...payload, code: 'changed-code' }
  });
  assert.equal(conflict.response.status, 409);
  assert.equal(conflict.body.error.code, 'STATE_CONFLICT');

  const reused = await request(baseUrl, '/api/auth/login', { method: 'POST', key: 'new-key', body: payload });
  assert.equal(reused.response.status, 409);
  assert.equal(reused.body.error.code, 'STATE_CONFLICT');

  for (const body of [
    { code: '', client: payload.client },
    { code: 1, client: payload.client },
    { code: 'ok', client: { platform: 'web', version: '1' } }
  ]) {
    const invalid = await request(baseUrl, '/api/auth/login', { method: 'POST', key: `bad-${Math.random()}`, body });
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    assert.equal(Object.hasOwn(invalid.body.error, 'stack'), false);
  }
});

test('退出 Session 后原 token 立即失效，但不会删除用户数据', async (t) => {
  const { baseUrl } = await createTestContext(t);
  const auth = await login(baseUrl, 'logout');
  const logout = await request(baseUrl, '/api/auth/session', {
    method: 'DELETE', token: auth.token, key: 'logout-1'
  });
  assert.equal(logout.response.status, 204);
  const current = await request(baseUrl, '/api/auth/session', { token: auth.token });
  assert.equal(current.response.status, 401);
  assert.equal(current.body.error.code, 'SESSION_INVALID');
});

test('缺失、格式错误、未知与过期 Session 返回稳定 401', async (t) => {
  const { baseUrl, clock } = await createTestContext(t, { sessionTtlMs: 500 });
  const missing = await request(baseUrl, '/api/auth/session');
  assert.equal(missing.response.status, 401);
  assert.equal(missing.body.error.code, 'AUTH_REQUIRED');
  const malformed = await request(baseUrl, '/api/auth/session', { token: 'short' });
  assert.equal(malformed.response.status, 401);
  assert.equal(malformed.body.error.code, 'SESSION_INVALID');
  const unknown = await request(baseUrl, '/api/auth/session', { token: 'x'.repeat(43) });
  assert.equal(unknown.response.status, 401);
  assert.equal(unknown.body.error.code, 'SESSION_INVALID');
  const auth = await login(baseUrl, 'expiry');
  clock.advance(501);
  const expired = await request(baseUrl, '/api/auth/session', { token: auth.token });
  assert.equal(expired.response.status, 401);
  assert.equal(expired.body.error.code, 'SESSION_EXPIRED');
});
