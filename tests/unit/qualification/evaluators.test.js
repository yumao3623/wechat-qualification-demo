const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { EagleEnterpriseEvaluator } = require('../../../server/src/domain/qualification/EagleEnterpriseEvaluator');
const { HighTechEnterpriseEvaluator } = require('../../../server/src/domain/qualification/HighTechEnterpriseEvaluator');
const { SpecializedInnovativeEvaluator } = require('../../../server/src/domain/qualification/SpecializedInnovativeEvaluator');
const {
  TechSMEEvaluator,
  intellectualPropertyScore,
  rdScore,
  techPersonnelScore
} = require('../../../server/src/domain/qualification/TechSMEEvaluator');
const { JsonEnterpriseRepository } = require('../../../server/src/repositories/JsonEnterpriseRepository');

const fixturePath = path.resolve(__dirname, '../../../server/data/fixtures/mock-enterprises.json');
const context = Object.freeze({
  assessmentDate: '2026-08-10',
  targetApplicationYear: 2026,
  ruleSetVersion: '2026-08-10',
  jurisdictionPreference: 'CN-ZJ-HZ',
  supplements: { fields: {} }
});

async function profiles() {
  return new JsonEnterpriseRepository({ filePath: fixturePath }).findAll();
}

function criterion(result, id) {
  return result.criteria.find((item) => item.id === id);
}

test('高企 H-02 成立 364/365/366 天边界正确', async () => {
  const evaluator = new HighTechEnterpriseEvaluator();
  const base = (await profiles())[0];
  for (const [establishedAt, expected] of [
    ['2025-08-11', 'unmet'], ['2025-08-10', 'met'], ['2025-08-09', 'met']
  ]) {
    const profile = { ...base, establishedAt };
    assert.equal(criterion(evaluator.evaluate(profile, context), 'H-02').result, expected);
  }
});

test('高企 H-06/H-07 数值达线后仍保留审计和收入属性 manual_review', async () => {
  const result = new HighTechEnterpriseEvaluator().evaluate((await profiles())[0], context);
  assert.equal(criterion(result, 'H-06').result, 'manual_review');
  assert.equal(criterion(result, 'H-07').result, 'manual_review');
  assert.match(criterion(result, 'H-06').explanation, /审计口径/);
});

test('科技型中小企业 T-02 规模上限取等，超限 unmet', async () => {
  const evaluator = new TechSMEEvaluator();
  const base = structuredClone((await profiles())[0]);
  base.fields.employeeCount.value = 500;
  base.fields.salesRevenue.at(-1).value = 200_000_000;
  base.fields.totalAssets.value = 200_000_000;
  assert.equal(criterion(evaluator.evaluate(base, context), 'T-02').result, 'met');

  base.fields.totalAssets.value = 200_000_001;
  assert.equal(criterion(evaluator.evaluate(base, context), 'T-02').result, 'unmet');
});

test('科技型中小企业评分公开分档边界正确', () => {
  assert.deepEqual([0.3, 0.25, 0.2, 0.15, 0.1, 0.099].map(techPersonnelScore), [20, 16, 12, 8, 4, 0]);
  assert.deepEqual([0.06, 0.05, 0.04, 0.03, 0.02, 0.019].map((ratio) => rdScore('sales_revenue', ratio)), [50, 40, 30, 20, 10, 0]);
  assert.deepEqual([0.3, 0.25, 0.2, 0.15, 0.1, 0.099].map((ratio) => rdScore('cost_expense', ratio)), [50, 40, 30, 20, 10, 0]);
  assert.equal(intellectualPropertyScore([{ category: 'invention_patent' }]), 30);
  assert.equal(intellectualPropertyScore(Array.from({ length: 4 }, () => ({ category: 'software_copyright' }))), 24);
});

test('科技型中小企业未选研发评分口径时 T-07 unknown，不自动取高分', async () => {
  const profile = structuredClone((await profiles())[0]);
  delete profile.fields.rdScoringMethod;
  const result = new TechSMEEvaluator().evaluate(profile, context);
  assert.equal(criterion(result, 'T-07').result, 'unknown');
  assert.ok(criterion(result, 'T-07').missingData.includes('rdScoringMethod'));
});

test('专精特新 S-05 两年均达线才通过数值预筛', async () => {
  const evaluator = new SpecializedInnovativeEvaluator();
  const base = structuredClone((await profiles())[0]);
  assert.equal(criterion(evaluator.evaluate(base, context), 'S-05').result, 'manual_review');

  base.fields.rdExpense.find((item) => item.period.year === 2024).value = 999_999;
  assert.equal(criterion(evaluator.evaluate(base, context), 'S-05').result, 'unmet');
});

test('专精特新营收不足 1500 万时才动态追问融资替代路径', async () => {
  const evaluator = new SpecializedInnovativeEvaluator();
  const [scenarioA, , scenarioC] = await profiles();
  assert.equal(
    evaluator.getFieldRequirements(context, scenarioA).some((item) => item.key === 'equityInvestments'),
    false
  );
  assert.equal(
    evaluator.getFieldRequirements(context, scenarioC).some((item) => item.key === 'equityInvestments'),
    true
  );
  assert.ok(criterion(evaluator.evaluate(scenarioC, context), 'S-04').missingData.includes('equityInvestments'));
});

test('专精特新 S-07 市场地位和 S-08 无官方平台分数固定人工核验', async () => {
  const evaluator = new SpecializedInnovativeEvaluator();
  const base = structuredClone((await profiles())[0]);
  base.fields.specializedDevelopmentScore = {
    value: 80, unit: 'points', period: { type: 'fiscal_year', year: 2026 },
    source: { sourceType: 'user', sourceLabel: 'user_supplied' }
  };
  let result = evaluator.evaluate(base, context);
  assert.equal(criterion(result, 'S-07').result, 'manual_review');
  assert.equal(criterion(result, 'S-08').result, 'manual_review');

  base.fields.specializedDevelopmentScore.source.sourceType = 'official_platform';
  result = evaluator.evaluate(base, context);
  assert.equal(criterion(result, 'S-08').result, 'met');
});

test('杭州新雏鹰首先执行地域/有效期判断', async () => {
  const evaluator = new EagleEnterpriseEvaluator();
  const scenarioA = (await profiles())[0];
  const scenarioD = (await profiles())[3];
  assert.notEqual(evaluator.evaluate(scenarioA, context).status, 'not_applicable');
  assert.equal(evaluator.evaluate(scenarioD, context).status, 'not_applicable');
  assert.equal(evaluator.getFieldRequirements(context, scenarioD).length, 0);
  assert.equal(evaluator.evaluate(scenarioA, { ...context, assessmentDate: '2028-01-01' }).status, 'not_applicable');
});

test('杭州新雏鹰 E-03/E-04 达线仍保留口径与自研证据核验', async () => {
  const result = new EagleEnterpriseEvaluator().evaluate((await profiles())[0], context);
  assert.equal(criterion(result, 'E-03').result, 'manual_review');
  assert.equal(criterion(result, 'E-04').result, 'manual_review');
});
