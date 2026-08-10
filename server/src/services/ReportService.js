const { AppError } = require('../middleware/errors');

class ReportService {
  constructor({ reportRepository, assessmentRepository, assessmentService }) {
    this.reportRepository = reportRepository;
    this.assessmentRepository = assessmentRepository;
    this.assessmentService = assessmentService;
  }

  async getById({ reportId, userId }) {
    const report = await this.reportRepository.findById(reportId);
    if (!report || report.userId !== userId) {
      throw new AppError({ status: 404, code: 'REPORT_NOT_FOUND', message: '未找到该报告。' });
    }
    return report;
  }

  async getByAssessment({ assessmentId, userId }) {
    const assessment = await this.assessmentService.getStatus({ assessmentId, userId });
    if (assessment.status !== 'ready' || !assessment.reportId) {
      throw new AppError({
        status: 409,
        code: 'REPORT_NOT_READY',
        message: assessment.status === 'failed' ? '诊断失败，未生成报告。' : '报告仍在生成中，请稍后查询。',
        fields: [{ field: 'status', reason: assessment.status }],
        retryable: assessment.status !== 'failed'
      });
    }
    return this.getById({ reportId: assessment.reportId, userId });
  }

  async list({ userId, limit, cursor }) {
    const assessments = await this.assessmentRepository.listByUser(userId);
    const advanced = [];
    for (const assessment of assessments) {
      advanced.push(await this.assessmentService.advance(assessment));
    }
    advanced.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const start = this.#parseCursor(cursor);
    const page = advanced.slice(start, start + limit);
    const reports = await this.reportRepository.listByUser(userId);
    const byAssessment = new Map(reports.map((report) => [report.assessmentId, report]));
    const items = page.map((assessment) => {
      const report = byAssessment.get(assessment.id);
      return {
        assessmentId: assessment.id,
        reportId: assessment.reportId,
        enterprise: assessment.enterpriseSummary,
        status: assessment.status,
        stage: assessment.stage,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        summary: report
          ? report.qualifications.map((item) => ({
            qualificationType: item.qualificationType,
            status: item.status,
            summary: item.summary
          }))
          : null,
        error: assessment.error
      };
    });
    return {
      items,
      nextCursor: start + page.length < advanced.length
        ? Buffer.from(String(start + page.length)).toString('base64url')
        : null
    };
  }

  #parseCursor(cursor) {
    if (!cursor) return 0;
    try {
      if (!/^[A-Za-z0-9_-]{1,32}$/.test(cursor)) throw new Error('invalid');
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      if (!/^\d+$/.test(decoded)) throw new Error('invalid');
      const value = Number(decoded);
      if (!Number.isInteger(value) || value < 0) throw new Error('invalid');
      return value;
    } catch {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: '提交内容有误，请检查后重试。',
        fields: [{ field: 'cursor', reason: 'cursor 无效' }]
      });
    }
  }
}

module.exports = { ReportService };
