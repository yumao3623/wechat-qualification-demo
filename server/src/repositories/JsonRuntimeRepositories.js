const path = require('node:path');
const { AssessmentRepository } = require('./AssessmentRepository');
const { ConsentRepository } = require('./ConsentRepository');
const { JsonCollectionRepository } = require('./JsonCollectionRepository');
const { LeadRepository } = require('./LeadRepository');
const { ReportRepository } = require('./ReportRepository');
const { SessionRepository } = require('./SessionRepository');

class JsonSessionRepository extends SessionRepository {
  constructor({ runtimePath }) {
    super();
    this.collection = new JsonCollectionRepository({ filePath: path.join(runtimePath, 'sessions.json') });
  }
  create(session) { return this.collection.create(session); }
  findById(id) { return this.collection.find((item) => item.id === id); }
  findByTokenHash(hash) { return this.collection.find((item) => item.tokenHash === hash); }
  findByAuthCodeHash(hash) { return this.collection.find((item) => item.authCodeHash === hash); }
  findByIdempotency(hash) { return this.collection.find((item) => item.idempotencyKeyHash === hash); }
  update(id, updater) { return this.collection.update(id, updater); }
}

class JsonAssessmentRepository extends AssessmentRepository {
  constructor({ runtimePath }) {
    super();
    this.collection = new JsonCollectionRepository({ filePath: path.join(runtimePath, 'assessments.json') });
  }
  create(item) { return this.collection.create(item); }
  findById(id) { return this.collection.find((item) => item.id === id); }
  findByIdempotency(userId, keyHash) {
    return this.collection.find((item) => item.userId === userId && item.idempotencyKeyHash === keyHash);
  }
  listAll() { return this.collection.list(); }
  listByUser(userId) { return this.collection.filter((item) => item.userId === userId); }
  update(id, updater) { return this.collection.update(id, updater); }
}

class JsonReportRepository extends ReportRepository {
  constructor({ runtimePath }) {
    super();
    this.collection = new JsonCollectionRepository({ filePath: path.join(runtimePath, 'reports.json') });
  }
  create(item) { return this.collection.create(item); }
  findById(id) { return this.collection.find((item) => item.id === id); }
  findByAssessmentId(assessmentId) {
    return this.collection.find((item) => item.assessmentId === assessmentId);
  }
  listByUser(userId) { return this.collection.filter((item) => item.userId === userId); }
}

class JsonConsentRepository extends ConsentRepository {
  constructor({ runtimePath }) {
    super();
    this.collection = new JsonCollectionRepository({ filePath: path.join(runtimePath, 'consents.json') });
  }
  create(item) { return this.collection.create(item); }
  findByAssessmentId(assessmentId) {
    return this.collection.find((item) => item.assessmentId === assessmentId);
  }
}

class JsonLeadRepository extends LeadRepository {
  constructor({ runtimePath }) {
    super();
    this.collection = new JsonCollectionRepository({ filePath: path.join(runtimePath, 'leads.json') });
  }
  create(item) { return this.collection.create(item); }
  findByIdempotency(keyHash) {
    return this.collection.find((item) => item.idempotencyKeyHash === keyHash);
  }
  listAll() { return this.collection.list(); }
}

function createRuntimeRepositories({ runtimePath }) {
  return {
    sessionRepository: new JsonSessionRepository({ runtimePath }),
    assessmentRepository: new JsonAssessmentRepository({ runtimePath }),
    reportRepository: new JsonReportRepository({ runtimePath }),
    consentRepository: new JsonConsentRepository({ runtimePath }),
    leadRepository: new JsonLeadRepository({ runtimePath })
  };
}

module.exports = {
  JsonAssessmentRepository,
  JsonConsentRepository,
  JsonLeadRepository,
  JsonReportRepository,
  JsonSessionRepository,
  createRuntimeRepositories
};
