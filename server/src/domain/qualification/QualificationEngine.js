const { MissingFieldSchemaBuilder } = require('../dynamic-form/MissingFieldSchemaBuilder');
const { mergeSupplementalData } = require('../dynamic-form/mergeSupplementalData');
const { EagleEnterpriseEvaluator } = require('./EagleEnterpriseEvaluator');
const { HighTechEnterpriseEvaluator } = require('./HighTechEnterpriseEvaluator');
const { SpecializedInnovativeEvaluator } = require('./SpecializedInnovativeEvaluator');
const { TechSMEEvaluator } = require('./TechSMEEvaluator');

function assertContext(context) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(context?.assessmentDate || '')) {
    throw new TypeError('context.assessmentDate 必须是 YYYY-MM-DD。');
  }
  if (!Number.isInteger(context.targetApplicationYear)) {
    throw new TypeError('context.targetApplicationYear 必须是整数年度。');
  }
  if (typeof context.ruleSetVersion !== 'string' || !context.ruleSetVersion) {
    throw new TypeError('context.ruleSetVersion 必须是非空字符串。');
  }
  if (typeof context.jurisdictionPreference !== 'string') {
    throw new TypeError('context.jurisdictionPreference 必须是字符串。');
  }
}

class QualificationEngine {
  constructor({ evaluators, schemaBuilder } = {}) {
    this.evaluators = evaluators || [
      new HighTechEnterpriseEvaluator(),
      new TechSMEEvaluator(),
      new SpecializedInnovativeEvaluator(),
      new EagleEnterpriseEvaluator()
    ];
    this.schemaBuilder = schemaBuilder || new MissingFieldSchemaBuilder();
  }

  buildAssessmentInput(profile, context) {
    assertContext(context);
    return mergeSupplementalData(profile, context.supplements || { fields: {} });
  }

  evaluate(profile, context) {
    const assessmentInput = this.buildAssessmentInput(profile, context);
    return this.evaluators.map((evaluator) => evaluator.evaluate(assessmentInput, context));
  }

  getMissingFieldSchema(profile, context) {
    const assessmentInput = this.buildAssessmentInput(profile, context);
    const requirements = this.evaluators.flatMap((evaluator) =>
      evaluator.getFieldRequirements(context, assessmentInput)
    );

    return this.schemaBuilder.build({
      profile: assessmentInput,
      requirements,
      generatedAt: `${context.assessmentDate}T00:00:00.000Z`
    });
  }
}

module.exports = { QualificationEngine, assertContext };
