const { makeCriterion } = require('./result-builder');
const {
  derivedValue,
  fieldPath,
  findMeasurement,
  measurementSources
} = require('./value-utils');

function readFields(profile, descriptors) {
  return descriptors.map((descriptor) => ({
    ...descriptor,
    ...findMeasurement(profile, descriptor.key, {
      year: descriptor.year,
      unit: descriptor.unit,
      periodType: descriptor.periodType
    })
  }));
}

function missingPaths(reads) {
  return reads
    .filter((read) => read.state !== 'known')
    .map((read) => fieldPath(read.key, read.year));
}

function missingCriterion(options, reads) {
  const missing = missingPaths(reads);
  return makeCriterion({
    ...options,
    result: 'unknown',
    missingData: missing,
    explanation: `缺少或口径无效：${missing.join('、')}。`,
    source: measurementSources(reads)
  });
}

function ratioActual(numerator, denominator, derivedFrom, year) {
  return derivedValue({
    value: denominator === 0 ? null : numerator / denominator,
    unit: 'ratio',
    period: { type: 'fiscal_year', year },
    derivedFrom,
    formula: `${derivedFrom[0]} / ${derivedFrom[1]}`
  });
}

function requirement({
  key,
  baseKey = key,
  year,
  label,
  type,
  unit,
  periodType = year === undefined ? undefined : 'fiscal_year',
  requiredFor,
  validation = { min: 0, max: 1_000_000_000_000 },
  blocking = true
}) {
  return {
    key: year === undefined ? key : `${key}.${year}`,
    baseKey,
    year,
    label,
    type,
    unit,
    period: periodType
      ? { type: periodType, ...(year === undefined ? {} : { year }) }
      : null,
    requiredFor,
    validation,
    blocking
  };
}

module.exports = {
  missingCriterion,
  missingPaths,
  ratioActual,
  readFields,
  requirement
};
