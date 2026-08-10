const { createHash } = require('node:crypto');

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function objectHash(value) {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
}

module.exports = { objectHash, stableSerialize };
