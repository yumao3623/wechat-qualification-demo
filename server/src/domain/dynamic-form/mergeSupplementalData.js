const { findMeasurement } = require('../qualification/value-utils');

function parseSupplementKey(key) {
  const match = /^(.*)\.(\d{4})$/.exec(key);
  return match ? { baseKey: match[1], year: Number(match[2]) } : { baseKey: key };
}

function toUserMeasurement(key, input) {
  if (input === null || input === undefined) {
    throw new TypeError(`补充字段 ${key} 不能为 null。`);
  }

  const measurement =
    typeof input === 'object' && Object.hasOwn(input, 'value')
      ? structuredClone(input)
      : { value: structuredClone(input) };

  if (measurement.value === null || measurement.value === undefined) {
    throw new TypeError(`补充字段 ${key} 必须提供有效值。`);
  }

  measurement.source = {
    sourceType: 'user',
    sourceLabel: 'user_supplied',
    observedAt: measurement.source?.observedAt || null,
    confidence: measurement.source?.confidence || 'self_declared'
  };
  measurement.origin = 'user_supplied';
  return measurement;
}

function setMeasurement(fields, baseKey, year, measurement) {
  if (year === undefined) {
    fields[baseKey] = measurement;
    return;
  }

  const current = fields[baseKey];
  const values = Array.isArray(current)
    ? [...current]
    : current === null || current === undefined
      ? []
      : [current];
  values.push(measurement);
  values.sort((left, right) => (left.period?.year || 0) - (right.period?.year || 0));
  fields[baseKey] = values;
}

function mergeSupplementalData(profile, supplements = { fields: {} }) {
  const assessmentInput = structuredClone(profile);
  assessmentInput.fields ||= {};
  assessmentInput.fieldConflicts = [];
  assessmentInput.supplementalData = { fields: {} };

  for (const [key, input] of Object.entries(supplements?.fields || {})) {
    const { baseKey, year } = parseSupplementKey(key);
    const measurement = toUserMeasurement(key, input);

    if (year !== undefined && measurement.period?.year !== year) {
      throw new TypeError(`补充字段 ${key} 的统计年度不一致。`);
    }

    const existing = findMeasurement(assessmentInput, baseKey, { year });
    assessmentInput.supplementalData.fields[key] = structuredClone(measurement);

    if (existing.state === 'known') {
      if (JSON.stringify(existing.measurement.value) !== JSON.stringify(measurement.value)) {
        assessmentInput.fieldConflicts.push({
          key,
          existing: structuredClone(existing.measurement),
          supplemental: structuredClone(measurement),
          resolution: 'manual_review'
        });
      }
      continue;
    }

    setMeasurement(assessmentInput.fields, baseKey, year, measurement);
  }

  return assessmentInput;
}

module.exports = { mergeSupplementalData, parseSupplementKey, toUserMeasurement };
