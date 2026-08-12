class AssessmentRepository {
  async create(_assessment) { throw new Error('AssessmentRepository.create 尚未实现。'); }
  async findById(_id) { throw new Error('AssessmentRepository.findById 尚未实现。'); }
  async findByIdempotency(_userId, _keyHash) { throw new Error('AssessmentRepository.findByIdempotency 尚未实现。'); }
  async listByUser(_userId) { throw new Error('AssessmentRepository.listByUser 尚未实现。'); }
  async update(_id, _updater) { throw new Error('AssessmentRepository.update 尚未实现。'); }
}

module.exports = { AssessmentRepository };
