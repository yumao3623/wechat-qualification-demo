class LeadRepository {
  async create(_lead) { throw new Error('LeadRepository.create 尚未实现。'); }
  async findByIdempotency(_keyHash) { throw new Error('LeadRepository.findByIdempotency 尚未实现。'); }
}

module.exports = { LeadRepository };
