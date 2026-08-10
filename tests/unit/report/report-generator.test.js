const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { QualificationEngine } = require('../../../server/src/domain/qualification/QualificationEngine');
const { DISCLAIMER, ReportGenerator, inputHash } = require('../../../server/src/domain/report/ReportGenerator');
const { JsonEnterpriseRepository } = require('../../../server/src/repositories/JsonEnterpriseRepository');

const fixturePath = path.resolve(__dirname, '../../../server/data/fixtures/mock-enterprises.json');
const context = {
  assessmentDate: '2026-08-10',
  targetApplicationYear: 2026,
  ruleSetVersion: '2026-08-10',
  jurisdictionPreference: 'CN-ZJ-HZ',
  supplements: { fields: {} }
};

test('ReportGenerator 组合企业快照、四类结果、证据、缺口、行动和规则版本', async () => {
  const repository = new JsonEnterpriseRepository({ filePath: fixturePath });
  const profile = await repository.findById('demo-a-001');
  const engine = new QualificationEngine();
  const assessmentInput = engine.buildAssessmentInput(profile, context);
  const results = engine.evaluate(profile, context);
  const report = new ReportGenerator().generate({
    reportId: 'rpt_phase3_a',
    assessmentId: 'asm_phase3_a',
    userId: 'demo_user_phase3',
    assessmentInput,
    qualificationResults: results,
    ruleSetVersion: context.ruleSetVersion,
    generatedAt: '2026-08-10T01:00:08.000Z'
  });

  assert.equal(report.status, 'ready');
  assert.equal(report.qualifications.length, 4);
  assert.equal(report.ruleVersions.length, 4);
  assert.equal(report.evidence.length, results.reduce((sum, item) => sum + item.evidence.length, 0));
  assert.equal(report.gaps.length, results.reduce((sum, item) => sum + item.gaps.length, 0));
  assert.equal(report.actions.length, results.reduce((sum, item) => sum + item.actions.length, 0));
  assert.equal(report.enterprise.isDemoData, true);
  assert.equal(report.enterprise.snapshot.fields.employeeCount.value, 120);
  assert.equal(report.disclaimer, DISCLAIMER);
  assert.match(report.inputSnapshotHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(report.generatedAt, '2026-08-10T01:00:08.000Z');
});

test('Report input hash 不受对象 key 顺序影响，输入改变时改变', () => {
  assert.equal(inputHash({ a: 1, b: 2 }), inputHash({ b: 2, a: 1 }));
  assert.notEqual(inputHash({ a: 1, b: 2 }), inputHash({ a: 1, b: 3 }));
});

test('ReportGenerator 拒绝非四类或重复 qualificationType', () => {
  const generator = new ReportGenerator();
  const base = {
    reportId: 'rpt_invalid', assessmentId: 'asm_invalid', userId: 'user',
    assessmentInput: { id: 'demo', name: 'Demo', subjectCode: 'DEMO', isDemoData: true },
    ruleSetVersion: '2026-08-10', generatedAt: '2026-08-10T00:00:00.000Z'
  };
  assert.throws(() => generator.generate({ ...base, qualificationResults: [] }), /恰好包含四类/);
  assert.throws(() => generator.generate({ ...base, qualificationResults: Array.from({ length: 4 }, () => ({ qualificationType: 'same', evidence: [], gaps: [], actions: [] })) }), /必须唯一/);
});
