const assert = require('node:assert/strict');
const test = require('node:test');
const { MissingFieldSchemaBuilder } = require('../../../server/src/domain/dynamic-form/MissingFieldSchemaBuilder');
const { mergeSupplementalData } = require('../../../server/src/domain/dynamic-form/mergeSupplementalData');
const { requirement } = require('../../../server/src/domain/qualification/evaluator-utils');

function measurement(value, { unit = 'integer', year = 2025, periodType = 'fiscal_year' } = {}) {
  return {
    value,
    unit,
    period: { type: periodType, year },
    source: { sourceType: 'demo_mock', sourceLabel: '虚构 Demo 企业画像' }
  };
}

test('MissingFieldSchemaBuilder 区分 0、false、null 和字段不存在', () => {
  const builder = new MissingFieldSchemaBuilder();
  const profile = {
    id: 'demo-boundary',
    fields: {
      zeroValue: measurement(0),
      falseValue: measurement(false, { unit: 'boolean' }),
      nullValue: null
    }
  };
  const requirements = [
    requirement({ key: 'zeroValue', year: 2025, label: '零值', type: 'integer', unit: 'integer', requiredFor: ['X-01'] }),
    requirement({ key: 'falseValue', year: 2025, label: '否', type: 'boolean', unit: 'boolean', requiredFor: ['X-02'] }),
    requirement({ key: 'nullValue', year: 2025, label: '空值', type: 'integer', unit: 'integer', requiredFor: ['X-03'] }),
    requirement({ key: 'absentValue', year: 2025, label: '不存在', type: 'integer', unit: 'integer', requiredFor: ['X-04'] })
  ];
  const schema = builder.build({ profile, requirements, generatedAt: '2026-08-10T00:00:00.000Z' });

  assert.deepEqual(schema.fields.map((field) => field.key).sort(), ['absentValue.2025', 'nullValue.2025']);
});

test('统计期或单位错误会进入 schema 并保留原因', () => {
  const builder = new MissingFieldSchemaBuilder();
  const profile = {
    id: 'demo-invalid',
    fields: {
      wrongYear: measurement(10, { year: 2024 }),
      wrongUnit: measurement(10, { unit: 'USD' })
    }
  };
  const requirements = [
    requirement({ key: 'wrongYear', year: 2025, label: '年度', type: 'integer', unit: 'integer', requiredFor: ['X-01'] }),
    requirement({ key: 'wrongUnit', year: 2025, label: '单位', type: 'money', unit: 'CNY', requiredFor: ['X-02'] })
  ];
  const schema = builder.build({ profile, requirements, generatedAt: '2026-08-10T00:00:00.000Z' });

  assert.equal(schema.fields.find((field) => field.key === 'wrongYear.2025').validationState, 'invalid_period');
  assert.equal(schema.fields.find((field) => field.key === 'wrongUnit.2025').validationState, 'invalid_unit');
});

test('重复字段需求只生成一项并合并 requiredFor', () => {
  const builder = new MissingFieldSchemaBuilder();
  const base = requirement({ key: 'rdExpense', year: 2025, label: '2025 研发费用', type: 'money', unit: 'CNY', requiredFor: ['H-06'] });
  const schema = builder.build({
    profile: { id: 'demo-merge', fields: {} },
    requirements: [base, { ...base, requiredFor: ['T-07', 'S-05'] }],
    generatedAt: '2026-08-10T00:00:00.000Z'
  });
  assert.equal(schema.fields.length, 1);
  assert.deepEqual(schema.fields[0].requiredFor, ['H-06', 'T-07', 'S-05']);
});

test('用户补充数据合并为 user/user_supplied，不修改原对象', () => {
  const profile = { id: 'demo-user', fields: { rdExpense: null } };
  const snapshot = structuredClone(profile);
  const merged = mergeSupplementalData(profile, {
    fields: {
      'rdExpense.2025': measurement(1_200_000, { unit: 'CNY' })
    }
  });

  assert.deepEqual(profile, snapshot);
  assert.equal(merged.fields.rdExpense[0].source.sourceType, 'user');
  assert.equal(merged.fields.rdExpense[0].source.sourceLabel, 'user_supplied');
  assert.equal(merged.fields.rdExpense[0].origin, 'user_supplied');
  assert.equal(merged.fields.rdExpense[0].period.year, 2025);
});

test('用户补充不静默覆盖已有 Provider/Mock 值，冲突留待人工核验', () => {
  const existing = measurement(100, { unit: 'people' });
  const profile = { id: 'demo-conflict', fields: { employeeCount: existing } };
  const merged = mergeSupplementalData(profile, {
    fields: { 'employeeCount.2025': measurement(120, { unit: 'people' }) }
  });

  assert.equal(merged.fields.employeeCount.value, 100);
  assert.equal(merged.fields.employeeCount.source.sourceType, 'demo_mock');
  assert.equal(merged.fieldConflicts.length, 1);
  assert.equal(merged.fieldConflicts[0].resolution, 'manual_review');
});

test('用户补充字段 key 与 measurement 年度不一致时拒绝', () => {
  assert.throws(
    () => mergeSupplementalData(
      { id: 'demo-invalid-supplement', fields: {} },
      { fields: { 'rdExpense.2025': measurement(1, { unit: 'CNY', year: 2024 }) } }
    ),
    /统计年度不一致/
  );
});
