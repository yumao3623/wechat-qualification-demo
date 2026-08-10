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

const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePort(process.env.PORT),
  enterpriseProvider: process.env.ENTERPRISE_PROVIDER || 'mock',
  mockEnterpriseFixturePath: path.resolve(
    __dirname,
    '../data/fixtures/mock-enterprises.json'
  )
});

module.exports = { config, parsePort };
