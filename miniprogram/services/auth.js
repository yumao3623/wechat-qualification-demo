const api = require('./api');
const { ALLOW_DEMO_LOGIN_FALLBACK, CLIENT_VERSION } = require('../config/index');
const { createIdempotencyKey } = require('../utils/idempotency');

const SESSION_STORAGE_KEY = 'qualification-demo-session';

function adapterOrDefault(storage) {
  return storage || wx;
}

function getStoredAuth({ storage } = {}) {
  const value = adapterOrDefault(storage).getStorageSync(SESSION_STORAGE_KEY);
  if (!value || typeof value.token !== 'string' || !value.session) return null;
  if (Date.parse(value.session.expiresAt) <= Date.now()) {
    clearStoredAuth({ storage });
    return null;
  }
  return value;
}

function saveStoredAuth(value, { storage } = {}) {
  adapterOrDefault(storage).setStorageSync(SESSION_STORAGE_KEY, value);
  return value;
}

function clearStoredAuth({ storage } = {}) {
  adapterOrDefault(storage).removeStorageSync(SESSION_STORAGE_KEY);
}

function wxLogin(wxApi = wx) {
  return new Promise((resolve, reject) => {
    wxApi.login({
      success(result) {
        if (result && result.code) resolve(result.code);
        else reject(new Error('微信登录未返回有效 code。'));
      },
      fail() { reject(new Error('微信登录未完成，请重试。')); }
    });
  });
}

function createDemoLoginCode(now = Date.now(), random = Math.random()) {
  return `local-demo-${now.toString(36)}-${Math.floor(random * 1e12).toString(36)}`;
}

async function validateStoredAuth({ storage, apiClient = api } = {}) {
  const stored = getStoredAuth({ storage });
  if (!stored) return null;
  try {
    const session = await apiClient.getSession(stored.token);
    return saveStoredAuth({ token: stored.token, session }, { storage });
  } catch (error) {
    if (['AUTH_REQUIRED', 'SESSION_INVALID', 'SESSION_EXPIRED'].includes(error.code)) {
      clearStoredAuth({ storage });
      return null;
    }
    throw error;
  }
}

async function createSessionFromUserAction({
  storage,
  wxApi,
  apiClient = api,
  allowDemoFallback = ALLOW_DEMO_LOGIN_FALLBACK
} = {}) {
  const existing = await validateStoredAuth({ storage, apiClient });
  if (existing) return existing;
  let code;
  try {
    code = await wxLogin(wxApi);
  } catch (error) {
    if (!allowDemoFallback) throw error;
    code = createDemoLoginCode();
  }
  const client = { platform: 'wechat-miniprogram', version: CLIENT_VERSION };
  let result;
  try {
    result = await apiClient.login(code, createIdempotencyKey('login'), client);
  } catch (error) {
    if (!allowDemoFallback || error.code !== 'AUTH_CODE_REUSED') throw error;
    result = await apiClient.login(
      createDemoLoginCode(),
      createIdempotencyKey('login-fallback'),
      client
    );
  }
  return saveStoredAuth(result, { storage });
}

async function logoutCurrentSession({ storage, apiClient = api } = {}) {
  const stored = getStoredAuth({ storage });
  if (stored) await apiClient.logout(stored.token, createIdempotencyKey('logout'));
  clearStoredAuth({ storage });
}

module.exports = {
  SESSION_STORAGE_KEY,
  clearStoredAuth,
  createDemoLoginCode,
  createSessionFromUserAction,
  getStoredAuth,
  logoutCurrentSession,
  saveStoredAuth,
  validateStoredAuth,
  wxLogin
};
