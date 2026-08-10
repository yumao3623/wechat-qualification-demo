function maskMobile(value) {
  if (typeof value !== 'string' || !/^1[3-9]\d{9}$/.test(value)) return '未提供';
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function reportStatusFor(assessment, report) {
  if (report) return report.status;
  if (assessment.status === 'failed') return 'not_generated';
  return 'pending';
}

class AdminService {
  constructor({ assessmentRepository, reportRepository, leadRepository }) {
    this.assessmentRepository = assessmentRepository;
    this.reportRepository = reportRepository;
    this.leadRepository = leadRepository;
  }

  async listAssessments() {
    const assessments = await this.assessmentRepository.listAll();
    assessments.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return Promise.all(assessments.map(async (assessment) => {
      const report = await this.reportRepository.findByAssessmentId(assessment.id);
      return {
        assessmentId: assessment.id,
        enterprise: {
          enterpriseId: assessment.enterpriseSummary.id,
          name: assessment.enterpriseSummary.name,
          isDemoData: assessment.enterpriseSummary.isDemoData,
          dataLabel: assessment.enterpriseSummary.dataLabel
        },
        status: assessment.status,
        stage: assessment.stage,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        reportId: report?.id || null,
        reportStatus: reportStatusFor(assessment, report)
      };
    }));
  }

  async listLeads() {
    const leads = await this.leadRepository.listAll();
    return leads
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
      .map((lead) => ({
        leadId: lead.id,
        enterprise: {
          enterpriseId: lead.enterprise.enterpriseId || null,
          name: lead.enterprise.name
        },
        contactName: lead.contactName,
        maskedMobile: maskMobile(lead.mobile),
        directions: [...lead.directions],
        status: lead.status,
        submittedAt: lead.submittedAt
      }));
  }
}

module.exports = { AdminService, maskMobile, reportStatusFor };
