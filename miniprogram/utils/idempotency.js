function createIdempotencyKey(prefix = 'request', now = Date.now(), random = Math.random()) {
  const suffix = Math.floor(random * 0x100000000).toString(36).padStart(7, '0');
  return `${prefix}-${now.toString(36)}-${suffix}`.slice(0, 64);
}

module.exports = { createIdempotencyKey };
