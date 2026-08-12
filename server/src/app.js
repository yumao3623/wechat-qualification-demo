const express = require('express');
const { config } = require('./config');
const { DemoAuthProvider } = require('./auth/DemoAuthProvider');
const { MockEnterpriseProvider } = require('./domain/enterprise/MockEnterpriseProvider');
const { QualificationEngine } = require('./domain/qualification/QualificationEngine');
const { ReportGenerator } = require('./domain/report/ReportGenerator');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');
const { JsonEnterpriseRepository } = require('./repositories/JsonEnterpriseRepository');
const { createRuntimeRepositories } = require('./repositories/JsonRuntimeRepositories');
const { createAssessmentRouter } = require('./routes/assessments');
const { createAuthRouter } = require('./routes/auth');
const { createEnterpriseRouter } = require('./routes/enterprises');
const { createLeadRouter } = require('./routes/leads');
const { createReportRouter } = require('./routes/reports');
const { AssessmentService } = require('./services/AssessmentService');
const { ConsentService } = require('./services/ConsentService');
const { DynamicFieldService } = require('./services/DynamicFieldService');
const { EnterpriseService } = require('./services/EnterpriseService');
const { LeadService } = require('./services/LeadService');
const { ReportService } = require('./services/ReportService');
const { SessionService } = require('./services/SessionService');
const { SupplementalDataValidator } = require('./services/SupplementalDataValidator');
const { systemClock } = require('./utils/clock');
const { objectHash } = require('./utils/stable');

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

function createDefaultAuthProvider() {
  if (config.authMode !== 'demo') {
    throw new Error(`当前阶段仅实现 demo Auth Provider，收到：${config.authMode}`);
  }
  return new DemoAuthProvider();
}

function createApp({
  enterpriseProvider = createDefaultEnterpriseProvider(),
  authProvider = createDefaultAuthProvider(),
  runtimeRepositories = createRuntimeRepositories({ runtimePath: config.runtimeDataPath }),
  clock = systemClock,
  sessionTtlMs = config.sessionTtlMs,
  assessmentPendingMs = config.assessmentPendingMs,
  assessmentStageMs = config.assessmentStageMs,
  qualificationEngine = new QualificationEngine(),
  reportGenerator = new ReportGenerator()
} = {}) {
  const app = express();
  const enterpriseService = new EnterpriseService({ provider: enterpriseProvider });
  const supplementalValidator = new SupplementalDataValidator({ qualificationEngine });
  const sessionService = new SessionService({
    repository: runtimeRepositories.sessionRepository,
    authProvider,
    clock,
    ttlMs: sessionTtlMs,
    objectHash
  });
  const consentService = new ConsentService({
    repository: runtimeRepositories.consentRepository,
    clock
  });
  const assessmentService = new AssessmentService({
    repository: runtimeRepositories.assessmentRepository,
    reportRepository: runtimeRepositories.reportRepository,
    consentService,
    enterpriseService,
    qualificationEngine,
    reportGenerator,
    supplementalValidator,
    clock,
    pendingMs: assessmentPendingMs,
    stageMs: assessmentStageMs,
    objectHash
  });
  const reportService = new ReportService({
    reportRepository: runtimeRepositories.reportRepository,
    assessmentRepository: runtimeRepositories.assessmentRepository,
    assessmentService
  });
  const dynamicFieldService = new DynamicFieldService({
    enterpriseService,
    qualificationEngine,
    supplementalValidator,
    clock
  });
  const leadService = new LeadService({
    repository: runtimeRepositories.leadRepository,
    enterpriseService,
    clock,
    objectHash
  });

  app.locals.services = {
    assessmentService, consentService, dynamicFieldService, enterpriseService,
    leadService, reportService, sessionService
  };
  app.locals.repositories = runtimeRepositories;

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
  app.use('/api/auth', createAuthRouter({ sessionService }));
  app.use('/api/assessments', createAssessmentRouter({
    sessionService,
    assessmentService,
    reportService,
    dynamicFieldService
  }));
  app.use('/api/reports', createReportRouter({ sessionService, reportService }));
  app.use('/api/leads', createLeadRouter({ leadService }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
  createDefaultAuthProvider,
  createDefaultEnterpriseProvider
};
