const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildMeasurement,
  buildSupplements,
  hydrateRawValues,
  mapServerFieldErrors,
  prepareField,
  validateRawValue
} = require('../../../miniprogram/utils/form');
const {
  createDraft,
  loadDraft,
  saveDraft,
  setCurrentEnterprise,
  getCurrentEnterprise
} = require('../../../miniprogram/services/draft');
const { normalizeApiError } = require('../../../miniprogram/services/api');

function fakeStorage() {
  const values = new Map();
  return {
    getStorageSync(key) { return values.get(key); },
    setStorageSync(key, value) { values.set(key, structuredClone(value)); },
    removeStorageSync(key) { values.delete(key); },
    values
  };
}

test('动态表单保留 0/false，按 schema 生成带单位和期间的 supplements', () => {
  const fields = [
    { key: 'rdExpense.2025', type: 'money', unit: 'CNY', period: { type: 'fiscal_year', year: 2025 }, validation: { min: 0 }, blocking: true },
    { key: 'businessAbnormal', type: 'boolean', unit: 'boolean', period: null, validation: {}, blocking: true },
    { key: 'employeeCount.2025', type: 'integer', unit: 'people', period: { type: 'fiscal_year', year: 2025 }, validation: { min: 0 }, blocking: true }
  ];
  const result = buildSupplements(fields, {
    'rdExpense.2025': '0',
    businessAbnormal: false,
    'employeeCount.2025': '12'
  });

  assert.deepEqual(result.errors, {});
  assert.equal(result.supplements.fields['rdExpense.2025'].value, 0);
  assert.equal(result.supplements.fields.businessAbnormal.value, false);
  assert.equal(result.supplements.fields['employeeCount.2025'].value, 12);
  assert.deepEqual(result.supplements.fields['rdExpense.2025'].period, { type: 'fiscal_year', year: 2025 });
});

test('动态控件支持整数、枚举和列表校验/序列化', () => {
  assert.equal(validateRawValue({ type: 'integer', validation: { min: 0 }, blocking: true }, '1.5'), '请输入整数');
  assert.equal(validateRawValue({ type: 'money', validation: { min: 0 }, blocking: true }, '-1'), '不能小于 0');
  assert.equal(buildMeasurement({ type: 'enum', unit: 'enum' }, 'sales_revenue').value, 'sales_revenue');
  const list = buildMeasurement({ type: 'list', unit: 'items' }, '专利 A\n软著 B').value;
  assert.equal(list.length, 2);
  assert.equal(list[0].status, 'self_declared');

  const prepared = prepareField({
    key: 'rdScoringMethod', type: 'enum', unit: 'enum', period: null,
    validation: { enum: ['sales_revenue', 'cost_expense'] }, requiredFor: ['T-07']
  });
  assert.deepEqual(prepared.enumLabels, ['按销售收入口径', '按成本费用口径']);
  assert.equal(prepared.requiredForText, 'T-07');
});

test('hydrateRawValues 可恢复数字、false 和用户声明列表', () => {
  const values = hydrateRawValues({ fields: {
    count: { value: 0 },
    flag: { value: false },
    list: { value: [{ id: '1', label: '项目一' }, { id: '2', label: '项目二' }] }
  } });
  assert.equal(values.count, 0);
  assert.equal(values.flag, false);
  assert.equal(values.list, '项目一\n项目二');
});

test('草稿按企业隔离、在 TTL 内恢复并在过期后清理', () => {
  const storage = fakeStorage();
  const now = 1_000;
  saveDraft('demo-a-001', { fields: { a: { value: 1 } } }, { storage, now });
  saveDraft('demo-b-001', { fields: { b: { value: 2 } } }, { storage, now });
  assert.deepEqual(Object.keys(loadDraft('demo-a-001', { storage, now: now + 1 }).supplements.fields), ['a']);
  assert.deepEqual(Object.keys(loadDraft('demo-b-001', { storage, now: now + 1 }).supplements.fields), ['b']);

  const expiredAt = loadDraft('demo-a-001', { storage, now }).expiresAt;
  const expired = loadDraft('demo-a-001', { storage, now: expiredAt });
  assert.deepEqual(expired.supplements.fields, {});
  assert.equal(expired.enterpriseId, 'demo-a-001');

  setCurrentEnterprise('demo-b-001', { storage });
  assert.equal(getCurrentEnterprise({ storage }), 'demo-b-001');
  assert.equal(createDraft('demo-c-001', now).enterpriseId, 'demo-c-001');
});

test('API 错误映射保留用户文案、字段和 request ID，不暴露额外响应', () => {
  const error = normalizeApiError({
    statusCode: 422,
    data: { error: { code: 'BUSINESS_RULE_INPUT_INVALID', message: '补充数据无效。', fields: [{ field: 'x', reason: '错误' }], requestId: 'req_demo', retryable: false, internal: 'secret' } }
  });
  assert.equal(error.code, 'BUSINESS_RULE_INPUT_INVALID');
  assert.equal(error.message, '补充数据无效。');
  assert.equal(error.requestId, 'req_demo');
  assert.deepEqual(error.fields, [{ field: 'x', reason: '错误' }]);
  assert.equal(Object.hasOwn(error, 'internal'), false);
});

test('Backend 跨字段错误可映射到带年度的动态表单字段', () => {
  const fields = [
    { key: 'rdEmployeeCount.2025' },
    { key: 'mainBusinessRevenue.2025' }
  ];
  assert.deepEqual(mapServerFieldErrors(fields, [
    { field: 'supplements.fields.rdEmployeeCount', reason: '不能大于企业总人数' },
    { field: 'supplements.fields.mainBusinessRevenue', reason: '不能大于营业收入' }
  ]), {
    'rdEmployeeCount.2025': '不能大于企业总人数',
    'mainBusinessRevenue.2025': '不能大于营业收入'
  });
});

test('Phase 6 app.json 页面成套存在，Tab 路径正确且敏感授权未引入', () => {
  const root = path.resolve(__dirname, '../../..');
  const mini = path.join(root, 'miniprogram');
  const projectConfig = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
  const appConfig = JSON.parse(fs.readFileSync(path.join(mini, 'app.json'), 'utf8'));
  assert.equal(projectConfig.miniprogramRoot, 'miniprogram/');
  assert.equal(projectConfig.appid, 'touristappid');
  for (const page of appConfig.pages) {
    for (const extension of ['js', 'json', 'wxml', 'wxss']) {
      assert.equal(fs.existsSync(path.join(mini, `${page}.${extension}`)), true, `${page}.${extension} 不存在`);
    }
  }
  assert.deepEqual(appConfig.tabBar.list.map((item) => item.pagePath), [
    'pages/home/home', 'pages/report-list/report-list', 'pages/me/me'
  ]);

  const sourceFiles = fs.readdirSync(mini, { recursive: true })
    .filter((file) => /\.(js|wxml|json)$/.test(file))
    .map((file) => fs.readFileSync(path.join(mini, file), 'utf8'))
    .join('\n');
  assert.doesNotMatch(sourceFiles, /getPhoneNumber|getUserProfile/);
  assert.doesNotMatch(sourceFiles, /TODO|Lorem ipsum|Coming soon|AppSecret/);

  const loginCallers = fs.readdirSync(mini, { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .filter((file) => /\.login\s*\(/.test(fs.readFileSync(path.join(mini, file), 'utf8')) && /wxApi\.login\s*\(/.test(fs.readFileSync(path.join(mini, file), 'utf8')));
  assert.deepEqual(loginCallers.map((file) => file.replaceAll('\\', '/')), ['services/auth.js']);

  const jsFiles = fs.readdirSync(mini, { recursive: true }).filter((file) => file.endsWith('.js'));
  const requestCallers = jsFiles.filter((file) => /wx\.request\s*\(/.test(fs.readFileSync(path.join(mini, file), 'utf8')));
  assert.deepEqual(requestCallers.map((file) => file.replaceAll('\\', '/')), ['services/api.js']);

  for (const target of [
    'pages/enterprise-search/enterprise-search',
    'pages/enterprise-confirm/enterprise-confirm',
    'pages/enterprise-profile/enterprise-profile',
    'pages/business-supplement/business-supplement',
    'pages/assessment-progress/assessment-progress',
    'pages/report-detail/report-detail',
    'pages/evidence/evidence',
    'pages/actions/actions',
    'pages/contact-consultant/contact-consultant',
    'pages/legal/legal'
  ]) {
    assert.equal(appConfig.pages.includes(target), true, `导航目标 ${target} 未注册`);
    assert.equal(fs.existsSync(path.join(mini, `${target}.js`)), true, `导航目标 ${target} 不存在`);
  }
});
