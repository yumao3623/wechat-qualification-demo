const ENUM_LABELS = Object.freeze({
  sales_revenue: '按销售收入口径',
  cost_expense: '按成本费用口径'
});

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function validateRawValue(field, rawValue) {
  if (isBlank(rawValue)) return field.blocking ? '请填写或选择该项' : null;
  if (['money', 'number', 'integer'].includes(field.type)) {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return '请输入有效数字';
    if (field.type === 'integer' && !Number.isInteger(value)) return '请输入整数';
    if (field.validation?.min !== undefined && value < field.validation.min) return `不能小于 ${field.validation.min}`;
    if (field.validation?.max !== undefined && value > field.validation.max) return `不能大于 ${field.validation.max}`;
  }
  if (field.type === 'list' && String(rawValue).split(/\r?\n/).filter((item) => item.trim()).length === 0) {
    return '请至少填写一项';
  }
  return null;
}

function parseValue(field, rawValue) {
  if (['money', 'number', 'integer'].includes(field.type)) return Number(rawValue);
  if (field.type === 'boolean') return rawValue === true || rawValue === 'true';
  if (field.type === 'list') {
    return String(rawValue)
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((label, index) => ({ id: `USER-DECLARED-${index + 1}`, label, status: 'self_declared' }));
  }
  return String(rawValue).trim();
}

function buildMeasurement(field, rawValue) {
  return {
    value: parseValue(field, rawValue),
    ...(field.unit ? { unit: field.unit } : {}),
    ...(field.period ? { period: field.period } : {})
  };
}

function buildSupplements(fields, rawValues) {
  const supplements = { fields: {} };
  const errors = {};
  for (const field of fields) {
    const rawValue = rawValues[field.key];
    if (isBlank(rawValue)) continue;
    const error = validateRawValue(field, rawValue);
    if (error) {
      errors[field.key] = error;
      continue;
    }
    supplements.fields[field.key] = buildMeasurement(field, rawValue);
  }
  return { supplements, errors };
}

function hydrateRawValues(supplements) {
  const values = {};
  for (const [key, measurement] of Object.entries(supplements?.fields || {})) {
    const value = measurement?.value;
    values[key] = Array.isArray(value)
      ? value.map((item) => item.label || item.id || String(item)).join('\n')
      : value;
  }
  return values;
}

function prepareField(field) {
  const enumValues = field.validation?.enum || [];
  return {
    ...field,
    requiredForText: (field.requiredFor || []).join(' · '),
    periodText: field.period?.year ? `${field.period.year} 年` : '当前时点',
    unitText: ({ CNY: '元', people: '人', items: '项', boolean: '是/否', enum: '选项' })[field.unit] || field.unit || '',
    enumValues,
    enumLabels: enumValues.map((value) => ENUM_LABELS[value] || value)
  };
}

module.exports = {
  buildMeasurement,
  buildSupplements,
  hydrateRawValues,
  isBlank,
  prepareField,
  validateRawValue
};
