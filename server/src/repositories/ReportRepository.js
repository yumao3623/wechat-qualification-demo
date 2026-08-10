class ReportRepository {
  async create(_report) { throw new Error('ReportRepository.create 尚未实现。'); }
  async findById(_id) { throw new Error('ReportRepository.findById 尚未实现。'); }
  async findByAssessmentId(_assessmentId) { throw new Error('ReportRepository.findByAssessmentId 尚未实现。'); }
  async listByUser(_userId) { throw new Error('ReportRepository.listByUser 尚未实现。'); }
}

module.exports = { ReportRepository };
