const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { QualificationEngine } = require('../../../server/src/domain/qualification/QualificationEngine');
const { aggregateStatus } = require('../../../server/src/domain/qualification/result-builder');
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

function assertUnifiedResult(result) {
  for (const key of [
    'qualificationType', 'status', 'summary', 'criteria', 'evidence',
    'missingFields', 'gaps', 'actions', 'ruleVersion', 'applicableRegion'
  ]) {
    assert.equal(Object.hasOwn(result, key), true, `${result.qualificationType} 缺少 ${key}`);
  }
  assert.ok(['promising', 'opportunity', 'needs_data', 'not_met', 'not_applicable'].includes(result.status));
  assert.equal(typeof result.ruleVersion.id, 'string');
  assert.equal(result.ruleVersion.checkedAt, '2026-08-10');
  for (const criterion of result.criteria) {
    for (const key of ['criterion', 'requirement', 'actualValue', 'source', 'result', 'missingData', 'action']) {
      assert.equal(Object.hasOwn(criterion, key), true, `${criterion.id} 缺少 ${key}`);
    }
  }
  for (const evidence of result.evidence) {
    for (const key of [
      'ruleId', 'criterion', 'requirement', 'actualValue', 'sources',
      'result', 'missingData', 'explanation', 'action', 'policyRef'
    ]) {
      assert.equal(Object.hasOwn(evidence, key), true, `${evidence.id} 缺少 ${key}`);
    }
  }
}

test('QualificationEngine 对 A/B/C/D 返回四类统一结构和目标分支', async () => {
  const engine = new QualificationEngine();
  const allProfiles = await profiles();
  const byScenario = Object.fromEntries(allProfiles.map((profile) => [profile.scenario, engine.evaluate(profile, context)]));

  for (const results of Object.values(byScenario)) {
    assert.equal(results.length, 4);
    assert.equal(new Set(results.map((item) => item.qualificationType)).size, 4);
    results.forEach(assertUnifiedResult);
  }

  assert.deepEqual(byScenario.A.map((item) => item.status), [
    'opportunity', 'opportunity', 'opportunity', 'opportunity'
  ]);
  assert.ok(byScenario.B.every((item) => item.status === 'needs_data'));
  assert.ok(byScenario.C.every((item) => item.status === 'not_met'));
  assert.equal(byScenario.D.find((item) => item.qualificationType === 'eagle_enterprise').status, 'not_applicable');
});

test('Scenario B 真正产生动态缺失字段，补齐后 schema 和结果改变', async () => {
  const engine = new QualificationEngine();
  const [scenarioA, scenarioB] = (await profiles()).slice(0, 2);
  const initialSchema = engine.getMissingFieldSchema(scenarioB, context);
  assert.ok(initialSchema.fields.length >= 10);
  assert.ok(initialSchema.fields.some((field) => field.key === 'rdExpense.2025'));
  assert.ok(initialSchema.fields.some((field) => field.key === 'intellectualProperties'));

  const supplementFields = {};
  for (const field of initialSchema.fields) {
    const match = /^(.*)\.(\d{4})$/.exec(field.key);
    const baseKey = match ? match[1] : field.key;
    const year = match ? Number(match[2]) : undefined;
    const sourceField = scenarioA.fields[baseKey];
    const measurement = Array.isArray(sourceField)
      ? sourceField.find((item) => item.period?.year === year)
      : sourceField;
    assert.ok(measurement, `A 场景应可为 ${field.key} 提供测试值`);
    supplementFields[field.key] = structuredClone(measurement);
  }

  const supplementedContext = { ...context, supplements: { fields: supplementFields } };
  const completedSchema = engine.getMissingFieldSchema(scenarioB, supplementedContext);
  const results = engine.evaluate(scenarioB, supplementedContext);
  assert.equal(completedSchema.fields.length, 0);
  assert.ok(results.every((item) => item.status === 'opportunity'));
});

test('Scenario C 的 0/false 保持已知，关键项为 unmet 而非因 0 变 unknown', async () => {
  const engine = new QualificationEngine();
  const scenarioC = (await profiles()).find((profile) => profile.scenario === 'C');
  const results = engine.evaluate(scenarioC, context);
  const techResult = results.find((item) => item.qualificationType === 'tech_sme');
  const personnel = techResult.criteria.find((item) => item.id === 'T-06');
  const risk = techResult.criteria.find((item) => item.id === 'T-04');

  assert.equal(personnel.result, 'unmet');
  assert.equal(personnel.missingData.length, 0);
  assert.notEqual(risk.result, 'unknown');
  assert.equal(techResult.status, 'not_met');
});

test('Engine 不修改原始企业对象，相同输入输出确定', async () => {
  const engine = new QualificationEngine();
  const scenarioA = (await profiles())[0];
  const snapshot = structuredClone(scenarioA);
  const first = engine.evaluate(scenarioA, context);
  const second = engine.evaluate(scenarioA, context);

  assert.deepEqual(scenarioA, snapshot);
  assert.deepEqual(first, second);
});

test('manual_review 保留在 criterion/evidence/gap/action，不被当作 met', async () => {
  const engine = new QualificationEngine();
  const scenarioA = (await profiles())[0];
  const highTech = engine.evaluate(scenarioA, context)[0];
  const manual = highTech.criteria.find((item) => item.id === 'H-08');
  const evidence = highTech.evidence.find((item) => item.ruleId === 'H-08');
  const gap = highTech.gaps.find((item) => item.ruleId === 'H-08');
  const action = highTech.actions.find((item) => item.gapId === gap.id);

  assert.equal(manual.result, 'manual_review');
  assert.equal(evidence.result, 'manual_review');
  assert.equal(gap.type, 'manual_review');
  assert.match(action.disclaimer, /不构成申报通过承诺/);
});

test('汇总优先级为不适用→硬门槛失败→缺数据→人工核验→预筛良好', () => {
  assert.equal(aggregateStatus([{ result: 'not_applicable' }]), 'not_applicable');
  assert.equal(aggregateStatus([{ result: 'unknown' }, { result: 'unmet' }]), 'not_met');
  assert.equal(aggregateStatus([{ result: 'manual_review' }, { result: 'unknown' }]), 'needs_data');
  assert.equal(aggregateStatus([{ result: 'met' }, { result: 'manual_review' }]), 'opportunity');
  assert.equal(aggregateStatus([{ result: 'met' }]), 'promising');
});

module.exports = { context, profiles };
