const { findMeasurement } = require('../qualification/value-utils');

const TYPE_COST = Object.freeze({
  boolean: 1,
  enum: 1,
  integer: 1,
  money: 2,
  date: 2,
  list: 3
});

function requirementState(profile, requirement) {
  return findMeasurement(profile, requirement.baseKey, {
    year: requirement.year,
    unit: requirement.unit,
    periodType: requirement.period?.type
  }).state;
}

class MissingFieldSchemaBuilder {
  build({ profile, requirements, generatedAt }) {
    const merged = new Map();

    for (const requirement of requirements) {
      const state = requirementState(profile, requirement);
      if (state === 'known') continue;

      const current = merged.get(requirement.key);
      if (current) {
        current.requiredFor = [
          ...new Set([...current.requiredFor, ...requirement.requiredFor])
        ];
        current.blocking ||= requirement.blocking;
        current.validationState =
          current.validationState === 'missing' ? state : current.validationState;
        continue;
      }

      merged.set(requirement.key, {
        key: requirement.key,
        label: requirement.label,
        type: requirement.type,
        unit: requirement.unit || null,
        period: requirement.period || null,
        requiredFor: [...requirement.requiredFor],
        validation: requirement.validation || {},
        sensitivity: requirement.sensitivity || 'business_sensitive',
        blocking: requirement.blocking !== false,
        helpText:
          requirement.helpText ||
          '请按对应政策口径填写；用户填写不等于审计或主管部门确认。',
        validationState: state
      });
    }

    const fields = [...merged.values()].sort((left, right) => {
      if (left.blocking !== right.blocking) return left.blocking ? -1 : 1;
      const costDifference = (TYPE_COST[left.type] || 9) - (TYPE_COST[right.type] || 9);
      return costDifference || left.key.localeCompare(right.key);
    });

    return {
      enterpriseId: profile.id,
      schemaVersion: '1.0',
      generatedAt,
      fields
    };
  }
}

module.exports = { MissingFieldSchemaBuilder, requirementState };
