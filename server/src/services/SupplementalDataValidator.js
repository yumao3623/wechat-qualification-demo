const { AppError } = require('../middleware/errors');

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function validateValue(requirement, measurement) {
  const value = measurement.value;
  const type = requirement.type;
  if (['integer', 'money'].includes(type)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || (type === 'integer' && !Number.isInteger(value))) return '值类型无效';
    if (requirement.validation?.min !== undefined && value < requirement.validation.min) return `不能小于 ${requirement.validation.min}`;
    if (requirement.validation?.max !== undefined && value > requirement.validation.max) return `不能大于 ${requirement.validation.max}`;
  } else if (type === 'boolean' && typeof value !== 'boolean') {
    return '必须是布尔值';
  } else if (type === 'list' && !Array.isArray(value)) {
    return '必须是数组';
  } else if (type === 'enum' && typeof value !== 'string') {
    return '必须是枚举字符串';
  } else if (type === 'date' && (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) {
    return '必须是有效日期';
  }
  return null;
}

class SupplementalDataValidator {
  constructor({ qualificationEngine }) {
    this.qualificationEngine = qualificationEngine;
  }

  validate({ profile, supplements, context }) {
    if (!isPlainObject(supplements) || !isPlainObject(supplements.fields)) {
      throw this.#invalid([{ field: 'supplements.fields', reason: '必须是对象' }]);
    }
    const requirements = this.qualificationEngine.evaluators.flatMap((evaluator) =>
      evaluator.getFieldRequirements(context, profile)
    );
    const byKey = new Map(requirements.map((item) => [item.key, item]));
    const errors = [];

    for (const [key, supplied] of Object.entries(supplements.fields)) {
      const requirement = byKey.get(key);
      if (!requirement) {
        errors.push({ field: `supplements.fields.${key}`, reason: '不是当前规则需要的可补充字段' });
        continue;
      }
      const measurement = isPlainObject(supplied) && Object.hasOwn(supplied, 'value') ? supplied : { value: supplied };
      if (measurement.value === null || measurement.value === undefined) {
        errors.push({ field: `supplements.fields.${key}`, reason: '必须提供有效值' });
        continue;
      }
      const valueError = validateValue(requirement, measurement);
      if (valueError) errors.push({ field: `supplements.fields.${key}.value`, reason: valueError });
      if (requirement.unit && measurement.unit !== requirement.unit) {
        errors.push({ field: `supplements.fields.${key}.unit`, reason: `必须是 ${requirement.unit}` });
      }
      if (requirement.period) {
        if (!isPlainObject(measurement.period) || measurement.period.type !== requirement.period.type || measurement.period.year !== requirement.period.year) {
          errors.push({ field: `supplements.fields.${key}.period`, reason: '统计期与字段要求不一致' });
        }
      }
    }
    if (errors.length) throw this.#invalid(errors);

    let assessmentInput;
    try {
      assessmentInput = this.qualificationEngine.buildAssessmentInput(profile, { ...context, supplements });
    } catch (error) {
      throw this.#invalid([{ field: 'supplements', reason: error.message }]);
    }
    this.#validateRelationships(assessmentInput);
    return assessmentInput;
  }

  #validateRelationships(input) {
    const latest = (key) => {
      const value = input.fields?.[key];
      const item = Array.isArray(value) ? value.at(-1) : value;
      return item?.value;
    };
    const errors = [];
    const employee = latest('employeeCount');
    for (const key of ['rdEmployeeCount', 'techEmployeeCount']) {
      const count = latest(key);
      if (typeof count === 'number' && typeof employee === 'number' && count > employee) {
        errors.push({ field: `supplements.fields.${key}`, reason: '不能大于企业总人数' });
      }
    }
    const revenue = latest('operatingRevenue');
    const main = latest('mainBusinessRevenue');
    if (typeof main === 'number' && typeof revenue === 'number' && main > revenue) {
      errors.push({ field: 'supplements.fields.mainBusinessRevenue', reason: '不能大于营业收入' });
    }
    if (errors.length) throw this.#invalid(errors);
  }

  #invalid(fields) {
    return new AppError({
      status: 422,
      code: 'BUSINESS_RULE_INPUT_INVALID',
      message: '补充经营数据的口径或逻辑关系无效。',
      fields
    });
  }
}

module.exports = { SupplementalDataValidator };
