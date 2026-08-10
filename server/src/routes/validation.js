const { validationError } = require('../middleware/errors');

function requireIdempotencyKey(req) {
  const key = req.get('x-idempotency-key');
  if (typeof key !== 'string' || key.length < 1 || key.length > 64) {
    throw validationError('X-Idempotency-Key', '必须是 1–64 个字符');
  }
  return key;
}

function requireObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(field, '必须是对象');
  }
  return value;
}

module.exports = { requireIdempotencyKey, requireObject };
