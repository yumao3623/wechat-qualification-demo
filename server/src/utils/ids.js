const { createHash, randomBytes, randomUUID } = require('node:crypto');

function createId(prefix) {
  return `${prefix}_${randomUUID().replaceAll('-', '')}`;
}

function createOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

module.exports = { createId, createOpaqueToken, sha256 };
