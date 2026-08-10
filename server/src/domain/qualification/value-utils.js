function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isKnownValue(value) {
  return value !== null && value !== undefined;
}

function getField(profile, key) {
  return profile?.fields?.[key];
}

function findMeasurement(profile, key, options = {}) {
  const { year, unit, periodType } = options;
  const field = getField(profile, key);

  if (field === null || field === undefined) {
    return { state: 'missing', measurement: null };
  }

  const candidates = Array.isArray(field) ? field : [field];
  let measurement = candidates[0];

  if (year !== undefined) {
    measurement = candidates.find((item) => item?.period?.year === year);
    if (!measurement) {
      return { state: 'invalid_period', measurement: null };
    }
  }

  if (!isObject(measurement) || !Object.hasOwn(measurement, 'value')) {
    return { state: 'invalid_type', measurement: null };
  }

  if (!isKnownValue(measurement.value)) {
    return { state: 'missing', measurement };
  }

  if (unit && measurement.unit !== unit) {
    return { state: 'invalid_unit', measurement };
  }

  if (periodType && measurement.period?.type !== periodType) {
    return { state: 'invalid_period', measurement };
  }

  return { state: 'known', measurement };
}

function fieldPath(key, year) {
  return year === undefined ? key : `${key}.${year}`;
}

function sourcesFrom(...measurements) {
  const seen = new Set();

  return measurements
    .flat()
    .filter(Boolean)
    .map((measurement) => measurement.source)
    .filter(Boolean)
    .filter((source) => {
      const fingerprint = JSON.stringify(source);
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    });
}

function derivedValue({ value, unit, period, derivedFrom, formula }) {
  return {
    value,
    unit,
    period,
    derivedFrom,
    formula
  };
}

function yearsEndingAt(year, count) {
  return Array.from({ length: count }, (_, index) => year - count + index + 1);
}

function daysBetween(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.floor((end - start) / 86_400_000);
}

function measurementSources(reads) {
  return sourcesFrom(
    reads
      .filter((read) => read?.state === 'known')
      .map((read) => read.measurement)
  );
}

module.exports = {
  daysBetween,
  derivedValue,
  fieldPath,
  findMeasurement,
  getField,
  isKnownValue,
  measurementSources,
  sourcesFrom,
  yearsEndingAt
};
