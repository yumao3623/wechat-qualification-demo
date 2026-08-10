class SessionRepository {
  async create(_session) { throw new Error('SessionRepository.create 尚未实现。'); }
  async findById(_id) { throw new Error('SessionRepository.findById 尚未实现。'); }
  async findByTokenHash(_tokenHash) { throw new Error('SessionRepository.findByTokenHash 尚未实现。'); }
  async findByAuthCodeHash(_authCodeHash) { throw new Error('SessionRepository.findByAuthCodeHash 尚未实现。'); }
  async findByIdempotency(_keyHash) { throw new Error('SessionRepository.findByIdempotency 尚未实现。'); }
  async update(_id, _updater) { throw new Error('SessionRepository.update 尚未实现。'); }
}

module.exports = { SessionRepository };
