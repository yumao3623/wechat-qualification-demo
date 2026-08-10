const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  quiet: true
});

function parsePort(value) {
  const port = Number(value ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT 必须是 1 到 65535 之间的整数。');
  }

  return port;
}

function parsePositiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} 必须是正整数。`);
  }
  return parsed;
}

const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePort(process.env.PORT),
  enterpriseProvider: process.env.ENTERPRISE_PROVIDER || 'mock',
  authMode: process.env.AUTH_MODE || 'demo',
  sessionTtlMs: parsePositiveInteger(
    process.env.SESSION_TTL_MS,
    12 * 60 * 60 * 1000,
    'SESSION_TTL_MS'
  ),
  assessmentPendingMs: parsePositiveInteger(
    process.env.ASSESSMENT_PENDING_MS,
    300,
    'ASSESSMENT_PENDING_MS'
  ),
  assessmentStageMs: parsePositiveInteger(
    process.env.ASSESSMENT_STAGE_MS,
    200,
    'ASSESSMENT_STAGE_MS'
  ),
  runtimeDataPath: process.env.RUNTIME_DATA_PATH
    ? path.resolve(process.cwd(), process.env.RUNTIME_DATA_PATH)
    : path.resolve(__dirname, '../data/runtime'),
  mockEnterpriseFixturePath: path.resolve(
    __dirname,
    '../data/fixtures/mock-enterprises.json'
  )
});

module.exports = { config, parsePort, parsePositiveInteger };
