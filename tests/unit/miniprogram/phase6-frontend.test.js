const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  clearStoredAuth, createSessionFromUserAction, getStoredAuth,
  saveStoredAuth, validateStoredAuth
} = require('../../../miniprogram/services/auth');
const { buildAgreement, buildAssessmentBody } = require('../../../miniprogram/services/assessment-flow');
const { clearAllDrafts, saveDraft, setCurrentEnterprise } = require('../../../miniprogram/services/draft');
const { createIdempotencyKey } = require('../../../miniprogram/utils/idempotency');
const { validateLeadForm } = require('../../../miniprogram/utils/lead');
const {
  loginForReportsAfterAgreement, openReportLoginAgreement
} = require('../../../miniprogram/services/report-access');
const {
  STATUS_TEXT, STAGE_TEXT, formatActualValue, prepareEvidence, prepareReportListItem
} = require('../../../miniprogram/utils/report');

function fakeStorage() {
  const values = new Map();
  return {
    getStorageSync(key) { return values.get(key); },
    setStorageSync(key, value) { values.set(key, structuredClone(value)); },
    removeStorageSync(key) { values.delete(key); },
    getStorageInfoSync() { return { keys: [...values.keys()] }; },
    values
  };
}

test('只有明确用户动作调用 Session 创建函数后才执行 wx.login，并保存后端 Session', async () => {
  const storage = fakeStorage();
  const calls = [];
  const wxApi = {
    login(options) { calls.push('wx.login'); options.success({ code: 'wx-code-phase6' }); }
  };
  const apiClient = {
    async login(code, key, client) {
      calls.push('api.login');
      assert.equal(code, 'wx-code-phase6');
      assert.match(key, /^login-/);
      assert.equal(client.platform, 'wechat-miniprogram');
      return { token: 't'.repeat(43), session: { id: 'ses_demo', expiresAt: '2099-01-01T00:00:00.000Z', authMode: 'demo' } };
    },
    async getSession() { throw new Error('没有本地 Session 时不应验证后端'); }
  };
  assert.equal(getStoredAuth({ storage }), null);
  assert.deepEqual(calls, []);
  const auth = await createSessionFromUserAction({ storage, wxApi, apiClient });
  assert.deepEqual(calls, ['wx.login', 'api.login']);
  assert.equal(auth.token, 't'.repeat(43));
  assert.equal(getStoredAuth({ storage }).session.authMode, 'demo');
});

test('游客 AppID 下 wx.login 失败时仅在 Demo 配置中降级为本地 code', async () => {
  const storage = fakeStorage();
  const calls = [];
  const wxApi = {
    login(options) {
      calls.push('wx.login');
      options.fail({ errMsg: 'login:fail tourist mode' });
    }
  };
  const apiClient = {
    async getSession() { return null; },
    async login(code) {
      calls.push('api.login');
      assert.match(code, /^local-demo-[a-z0-9]+-[a-z0-9]+$/);
      return { token: 'd'.repeat(43), session: { id: 'ses_fallback', expiresAt: '2099-01-01T00:00:00.000Z', authMode: 'demo' } };
    }
  };

  const auth = await createSessionFromUserAction({ storage, wxApi, apiClient, allowDemoFallback: true });

  assert.deepEqual(calls, ['wx.login', 'api.login']);
  assert.equal(auth.session.id, 'ses_fallback');
});

test('关闭 Demo 登录降级后 wx.login 失败必须终止，不能请求后端登录', async () => {
  const storage = fakeStorage();
  let apiLoginCount = 0;
  const wxApi = { login(options) { options.fail({ errMsg: 'login:fail' }); } };
  const apiClient = {
    async getSession() { return null; },
    async login() { apiLoginCount += 1; }
  };

  await assert.rejects(
    createSessionFromUserAction({ storage, wxApi, apiClient, allowDemoFallback: false }),
    /微信登录未完成/
  );
  assert.equal(apiLoginCount, 0);
});

test('开发者工具重复返回已消费 wx.login code 时，Demo 使用新 code 和幂等键重试一次', async () => {
  const storage = fakeStorage();
  const loginRequests = [];
  const wxApi = { login(options) { options.success({ code: 'reused-devtools-code' }); } };
  const apiClient = {
    async getSession() { return null; },
    async login(code, key) {
      loginRequests.push({ code, key });
      if (loginRequests.length === 1) {
        const error = new Error('code reused');
        error.code = 'AUTH_CODE_REUSED';
        throw error;
      }
      return { token: 'r'.repeat(43), session: { id: 'ses_retried', expiresAt: '2099-01-01T00:00:00.000Z', authMode: 'demo' } };
    }
  };

  const auth = await createSessionFromUserAction({ storage, wxApi, apiClient, allowDemoFallback: true });

  assert.equal(loginRequests.length, 2);
  assert.equal(loginRequests[0].code, 'reused-devtools-code');
  assert.match(loginRequests[1].code, /^local-demo-/);
  assert.notEqual(loginRequests[0].key, loginRequests[1].key);
  assert.match(loginRequests[1].key, /^login-fallback-/);
  assert.equal(auth.session.id, 'ses_retried');
});

test('非 code 重复冲突不能触发 Demo 登录重试', async () => {
  const storage = fakeStorage();
  let apiLoginCount = 0;
  const apiClient = {
    async getSession() { return null; },
    async login() {
      apiLoginCount += 1;
      const error = new Error('conflict');
      error.code = 'STATE_CONFLICT';
      throw error;
    }
  };

  await assert.rejects(
    createSessionFromUserAction({
      storage,
      wxApi: { login(options) { options.success({ code: 'fresh-code' }); } },
      apiClient,
      allowDemoFallback: true
    }),
    /conflict/
  );
  assert.equal(apiLoginCount, 1);
});

test('已有 Session 只验证后端，不重复调用 wx.login；失效时清除', async () => {
  const storage = fakeStorage();
  saveStoredAuth({ token: 't'.repeat(43), session: { id: 'ses_old', expiresAt: '2099-01-01T00:00:00.000Z' } }, { storage });
  let loginCount = 0;
  const valid = await createSessionFromUserAction({
    storage,
    wxApi: { login() { loginCount += 1; } },
    apiClient: {
      async getSession() { return { id: 'ses_old', expiresAt: '2099-01-01T00:00:00.000Z', authMode: 'demo' }; }
    }
  });
  assert.equal(valid.session.id, 'ses_old');
  assert.equal(loginCount, 0);

  const invalid = await validateStoredAuth({
    storage,
    apiClient: { async getSession() { const error = new Error('expired'); error.code = 'SESSION_EXPIRED'; throw error; } }
  });
  assert.equal(invalid, null);
  assert.equal(getStoredAuth({ storage }), null);
  clearStoredAuth({ storage });
});

test('协议快照使用冻结版本且 assessment body 保留 Backend 契约', () => {
  const agreement = buildAgreement('2026-08-10T01:00:00.000Z');
  assert.deepEqual(agreement, {
    accepted: true,
    userAgreementVersion: '2026-08-10', privacyPolicyVersion: '2026-08-10', disclaimerVersion: '2026-08-10',
    agreedAt: '2026-08-10T01:00:00.000Z', agreementSource: 'assessment-dialog'
  });
  const body = buildAssessmentBody('demo-b-001', { fields: { x: { value: 0 } } }, agreement.agreedAt);
  assert.equal(body.enterpriseId, 'demo-b-001');
  assert.equal(body.context.targetApplicationYear, 2026);
  assert.equal(body.supplements.fields.x.value, 0);
  assert.deepEqual(body.agreement, agreement);
});

test('协议组件 open 每次强制 checked=false，未勾选不会发出 confirm', () => {
  const root = path.resolve(__dirname, '../../..');
  const source = fs.readFileSync(path.join(root, 'miniprogram/components/agreement-dialog/agreement-dialog.js'), 'utf8');
  assert.match(source, /open\(\)\s*\{[\s\S]*checked:\s*false/);
  assert.match(source, /if\s*\(!this\.data\.checked\)[\s\S]*return;/);
  assert.match(source, /triggerEvent\('confirm'/);
});

test('Report Tab 登录按钮只打开默认未勾选协议，不创建 Session', () => {
  const calls = [];
  const page = {
    selectComponent(selector) {
      assert.equal(selector, '#reportAgreementDialog');
      return { open() { calls.push('dialog.open'); } };
    }
  };
  openReportLoginAgreement(page);
  assert.deepEqual(calls, ['dialog.open']);

  const root = path.resolve(__dirname, '../../..');
  const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/report-list/report-list.wxml'), 'utf8');
  assert.match(wxml, /bindtap="openLoginAgreement"/);
  assert.doesNotMatch(wxml, /bindtap="loginForReports"/);
});

test('Report Tab 仅在协议 confirm 后创建 Session，再加载报告列表', async () => {
  const calls = [];
  const dialog = {
    setBusy(text) { calls.push(`busy:${text}`); },
    closeAfterSuccess() { calls.push('dialog.close'); },
    setError(message) { calls.push(`error:${message}`); }
  };
  const page = {
    selectComponent() { return dialog; },
    async loadReports() { calls.push('reports.load'); }
  };
  const result = await loginForReportsAfterAgreement(page, {
    async createSession() { calls.push('session.create'); }
  });
  assert.equal(result, true);
  assert.deepEqual(calls, [
    'busy:正在建立 Demo Session', 'session.create', 'dialog.close', 'reports.load'
  ]);
});

test('报告状态、阶段、Evidence 实际值使用冻结中文映射且保留 0', () => {
  assert.deepEqual(STATUS_TEXT, {
    promising: '较有希望', opportunity: '存在机会', needs_data: '需补充数据', not_met: '暂不满足', not_applicable: '不适用'
  });
  assert.equal(STAGE_TEXT.generate_report, '生成报告');
  assert.equal(formatActualValue({ value: 0, unit: 'people' }), '0 人');
  const evidence = prepareEvidence({ result: 'manual_review', actualValue: null, sources: [], missingData: ['x'] });
  assert.equal(evidence.resultText, '需人工核验');
  assert.equal(evidence.actualValueText, '未提供');
  assert.equal(evidence.missingText, 'x');
  const item = prepareReportListItem({ status: 'processing', stage: 'evaluate_tech_sme', createdAt: '2026-08-10T01:00:00.000Z', summary: [] });
  assert.equal(item.statusText, '诊断进行中');
  assert.equal(item.stageText, '执行科技型中小企业规则');
});

test('顾问表单独立同意默认 false，手机号与方向校验正确', () => {
  const base = { contactName: '演示联系人', mobile: '13800000000', enterpriseName: 'Demo 企业', directions: ['comprehensive'], note: '', consentAccepted: false };
  assert.equal(validateLeadForm(base).consentAccepted, '请明确同意本次咨询联系用途');
  assert.deepEqual(validateLeadForm({ ...base, consentAccepted: true }), {});
  assert.equal(validateLeadForm({ ...base, consentAccepted: true, mobile: '123' }).mobile.includes('11 位'), true);
});

test('诊断成功或退出可清理单企业/全部敏感草稿，幂等键长度合法', () => {
  const storage = fakeStorage();
  saveDraft('demo-a-001', { fields: { a: { value: 1 } } }, { storage, now: 1 });
  saveDraft('demo-b-001', { fields: { b: { value: 2 } } }, { storage, now: 1 });
  setCurrentEnterprise('demo-a-001', { storage });
  clearAllDrafts({ storage });
  assert.equal([...storage.values.keys()].some((key) => key.startsWith('qualification-draft:')), false);
  assert.equal(storage.values.has('qualification-current-enterprise'), false);
  const key = createIdempotencyKey('assessment', 1000, 0.5);
  assert.ok(key.length >= 1 && key.length <= 64);
});

test('静态合规：启动/首页/报告/我的不直接调用 wx.login，且无强制手机号授权', () => {
  const root = path.resolve(__dirname, '../../..');
  const mini = path.join(root, 'miniprogram');
  for (const file of ['app.js', 'pages/home/home.js', 'pages/report-list/report-list.js', 'pages/me/me.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(mini, file), 'utf8'), /(?:wx|wxApi)\.login\s*\(/, `${file} 不得直接登录`);
  }
  const all = fs.readdirSync(mini, { recursive: true })
    .filter((file) => /\.(js|wxml|json)$/.test(file))
    .map((file) => fs.readFileSync(path.join(mini, file), 'utf8')).join('\n');
  assert.doesNotMatch(all, /getPhoneNumber|getUserProfile|button\s+open-type=["']getPhoneNumber/);
  assert.doesNotMatch(all, /企查查数据/);
});
