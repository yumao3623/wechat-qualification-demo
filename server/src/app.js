const express = require('express');
const { config } = require('./config');
const { MockEnterpriseProvider } = require('./domain/enterprise/MockEnterpriseProvider');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');
const { JsonEnterpriseRepository } = require('./repositories/JsonEnterpriseRepository');
const { createEnterpriseRouter } = require('./routes/enterprises');
const { EnterpriseService } = require('./services/EnterpriseService');

function createDefaultEnterpriseProvider() {
  if (config.enterpriseProvider !== 'mock') {
    throw new Error(
      `当前阶段仅实现 mock Enterprise Provider，收到：${config.enterpriseProvider}`
    );
  }

  const repository = new JsonEnterpriseRepository({
    filePath: config.mockEnterpriseFixturePath
  });

  return new MockEnterpriseProvider({ repository });
}

function createApp({ enterpriseProvider = createDefaultEnterpriseProvider() } = {}) {
  const app = express();
  const enterpriseService = new EnterpriseService({ provider: enterpriseProvider });

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    res.json({
      data: {
        status: 'ok',
        service: 'enterprise-qualification-precheck-demo',
        enterpriseProvider: config.enterpriseProvider
      },
      meta: { requestId: req.requestId }
    });
  });

  app.use('/api/enterprises', createEnterpriseRouter({ enterpriseService }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, createDefaultEnterpriseProvider };
