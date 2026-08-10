const { inputHash } = require('../domain/report/ReportGenerator');
const { AppError } = require('../middleware/errors');
const { createId, sha256 } = require('../utils/ids');
const { nowIso } = require('../utils/clock');

const RULE_SET_VERSION = '2026-08-10';
const STAGES = Object.freeze([
  'prepare_enterprise_data',
  'validate_input_completeness',
  'evaluate_high_tech',
  'evaluate_tech_sme',
  'evaluate_specialized_innovative',
  'evaluate_eagle',
  'assemble_evidence_actions',
  'generate_report'
]);

class AssessmentService {
  constructor({
    repository, reportRepository, consentService, enterpriseService,
    qualificationEngine, reportGenerator, supplementalValidator,
    clock, pendingMs, stageMs, objectHash
  }) {
    Object.assign(this, {
      repository, reportRepository, consentService, enterpriseService,
      qualificationEngine, reportGenerator, supplementalValidator,
      clock, pendingMs, stageMs, objectHash
    });
  }

  async create({ session, enterpriseId, supplements, requestContext, agreement, idempotencyKey }) {
    const payload = { enterpriseId, supplements, context: requestContext, agreement };
    const requestHash = this.objectHash(payload);
    const keyHash = sha256(`assessment-idempotency:${idempotencyKey}`);
    const existing = await this.repository.findByIdempotency(session.userId, keyHash);
    if (existing) {
      if (existing.requestHash !== requestHash) throw this.#idempotencyConflict();
      return { assessment: await this.advance(existing), created: false };
    }

    const profile = await this.enterpriseService.getById({ enterpriseId });
    const context = {
      assessmentDate: this.clock.now().toISOString().slice(0, 10),
      targetApplicationYear: requestContext.targetApplicationYear,
      ruleSetVersion: RULE_SET_VERSION,
      jurisdictionPreference: 'CN-ZJ-HZ',
      supplements
    };
    const assessmentInput = this.supplementalValidator.validate({ profile, supplements, context });
    const agreementSnapshot = this.consentService.validate(agreement);
    const assessmentId = createId('asm');
    const consent = await this.consentService.record({ agreement, assessmentId, session });
    const createdAt = nowIso(this.clock);
    const assessment = {
      id: assessmentId,
      userId: session.userId,
      sessionId: session.id,
      enterpriseId,
      enterpriseSummary: {
        id: profile.id,
        name: profile.name,
        subjectCode: profile.subjectCode,
        isDemoData: profile.isDemoData,
        dataLabel: profile.dataLabel
      },
      status: 'pending',
      stage: STAGES[0],
      stageIndex: 1,
      inputSnapshot: {
        enterprise: structuredClone(assessmentInput),
        supplements: structuredClone(supplements),
        context: structuredClone(context)
      },
      inputSnapshotHash: inputHash(assessmentInput),
      agreementSnapshot,
      consentId: consent.id,
      ruleSetVersion: RULE_SET_VERSION,
      idempotencyKeyHash: keyHash,
      requestHash,
      reportId: null,
      error: null,
      retryOfAssessmentId: requestContext.retryOfAssessmentId || null,
      createdAt,
      updatedAt: createdAt,
      completedAt: null
    };
    await this.repository.create(assessment);
    return { assessment, created: true };
  }

  async getOwned(id, userId) {
    const assessment = await this.repository.findById(id);
    if (!assessment || assessment.userId !== userId) {
      throw new AppError({ status: 404, code: 'ASSESSMENT_NOT_FOUND', message: '未找到该诊断。' });
    }
    return assessment;
  }

  async getStatus({ assessmentId, userId }) {
    return this.advance(await this.getOwned(assessmentId, userId));
  }

  async advance(assessment) {
    if (['ready', 'failed'].includes(assessment.status)) return assessment;
    const elapsed = this.clock.now().getTime() - Date.parse(assessment.createdAt);
    if (elapsed < this.pendingMs) return assessment;

    const readyAt = this.pendingMs + this.stageMs * STAGES.length;
    if (elapsed < readyAt) {
      const index = Math.min(STAGES.length - 1, Math.floor((elapsed - this.pendingMs) / this.stageMs));
      if (assessment.status !== 'processing' || assessment.stage !== STAGES[index]) {
        return this.repository.update(assessment.id, (current) => ({
          ...current,
          status: 'processing',
          stage: STAGES[index],
          stageIndex: index + 1,
          updatedAt: nowIso(this.clock)
        }));
      }
      return assessment;
    }

    try {
      return await this.#complete(assessment);
    } catch (error) {
      const code = error.code === 'REPORT_PERSISTENCE_FAILED'
        ? 'REPORT_PERSISTENCE_FAILED'
        : 'ASSESSMENT_PROCESSING_FAILED';
      return this.repository.update(assessment.id, (current) => ({
        ...current,
        status: 'failed',
        stage: current.stage,
        error: {
          code,
          message: code === 'REPORT_PERSISTENCE_FAILED'
            ? '报告保存失败，请重新发起诊断。'
            : '诊断处理失败，请重新发起诊断。'
        },
        updatedAt: nowIso(this.clock),
        completedAt: nowIso(this.clock)
      }));
    }
  }

  async #complete(assessment) {
    let report = await this.reportRepository.findByAssessmentId(assessment.id);
    if (!report) {
      let results;
      try {
        results = this.qualificationEngine.evaluateAssessmentInput(
          assessment.inputSnapshot.enterprise,
          assessment.inputSnapshot.context
        );
      } catch (error) {
        throw error;
      }
      report = this.reportGenerator.generate({
        reportId: createId('rpt'),
        assessmentId: assessment.id,
        userId: assessment.userId,
        assessmentInput: assessment.inputSnapshot.enterprise,
        qualificationResults: results,
        ruleSetVersion: assessment.ruleSetVersion,
        generatedAt: nowIso(this.clock)
      });
      try {
        await this.reportRepository.create(report);
      } catch (cause) {
        const error = new Error('Report persistence failed', { cause });
        error.code = 'REPORT_PERSISTENCE_FAILED';
        throw error;
      }
    }
    return this.repository.update(assessment.id, (current) => ({
      ...current,
      status: 'ready',
      stage: STAGES.at(-1),
      stageIndex: STAGES.length,
      reportId: report.id,
      error: null,
      updatedAt: nowIso(this.clock),
      completedAt: nowIso(this.clock)
    }));
  }

  #idempotencyConflict() {
    return new AppError({ status: 409, code: 'STATE_CONFLICT', message: '幂等键已用于不同的诊断请求。' });
  }
}

module.exports = { AssessmentService, RULE_SET_VERSION, STAGES };
