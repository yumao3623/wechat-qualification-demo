class DynamicFieldService {
  constructor({ enterpriseService, qualificationEngine, supplementalValidator, clock }) {
    Object.assign(this, { enterpriseService, qualificationEngine, supplementalValidator, clock });
  }

  async getMissingFields({ enterpriseId, supplements, targetApplicationYear }) {
    const profile = await this.enterpriseService.getById({ enterpriseId });
    const context = {
      assessmentDate: this.clock.now().toISOString().slice(0, 10),
      targetApplicationYear,
      ruleSetVersion: '2026-08-10',
      jurisdictionPreference: 'CN-ZJ-HZ',
      supplements
    };
    this.supplementalValidator.validate({ profile, supplements, context });
    return this.qualificationEngine.getMissingFieldSchema(profile, context);
  }
}

module.exports = { DynamicFieldService };
