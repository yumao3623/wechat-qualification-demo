const { AppError } = require('../middleware/errors');
const { createId, createOpaqueToken, sha256 } = require('../utils/ids');
const { nowIso } = require('../utils/clock');

function publicSession(session) {
  const { tokenHash, authCodeHash, idempotencyKeyHash, requestHash, ...safe } = session;
  return structuredClone(safe);
}

class SessionService {
  constructor({ repository, authProvider, clock, ttlMs, objectHash }) {
    this.repository = repository;
    this.authProvider = authProvider;
    this.clock = clock;
    this.ttlMs = ttlMs;
    this.objectHash = objectHash;
    this.loginIdempotencyCache = new Map();
  }

  async login({ code, client, idempotencyKey }) {
    const payloadHash = this.objectHash({ code, client });
    const keyHash = sha256(`login-idempotency:${idempotencyKey}`);
    const cached = this.loginIdempotencyCache.get(keyHash);
    if (cached) {
      if (cached.payloadHash !== payloadHash) throw this.#idempotencyConflict();
      return { ...structuredClone(cached.result), created: false };
    }

    const persisted = await this.repository.findByIdempotency(keyHash);
    if (persisted) {
      if (persisted.requestHash !== payloadHash) throw this.#idempotencyConflict();
      if (persisted.revokedAt || Date.parse(persisted.expiresAt) <= this.clock.now().getTime()) {
        throw new AppError({
          status: 409,
          code: 'STATE_CONFLICT',
          message: '原 Demo Session 已失效，请使用新的 wx.login code 和幂等键登录。'
        });
      }
      const token = createOpaqueToken();
      const restored = await this.repository.update(persisted.id, (current) => ({
        ...current,
        tokenHash: sha256(`session-token:${token}`),
        lastSeenAt: nowIso(this.clock)
      }));
      const result = { token, session: publicSession(restored) };
      this.loginIdempotencyCache.set(keyHash, { payloadHash, result: structuredClone(result) });
      return { ...result, created: false };
    }

    const identity = await this.authProvider.exchangeCode({ code });
    const consumed = await this.repository.findByAuthCodeHash(identity.authCodeHash);
    if (consumed) {
      throw new AppError({
        status: 409,
        code: 'AUTH_CODE_REUSED',
        message: '该 Demo 登录 code 已使用，请重新调用 wx.login。'
      });
    }

    const token = createOpaqueToken();
    const createdAt = this.clock.now();
    const session = {
      id: createId('ses'),
      userId: `demo_user_${sha256(identity.externalSubject).slice(0, 24)}`,
      tokenHash: sha256(`session-token:${token}`),
      authCodeHash: identity.authCodeHash,
      authMode: identity.authMode,
      client: structuredClone(client),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + this.ttlMs).toISOString(),
      revokedAt: null,
      lastSeenAt: createdAt.toISOString(),
      idempotencyKeyHash: keyHash,
      requestHash: payloadHash
    };
    await this.repository.create(session);
    const result = { token, session: publicSession(session) };
    this.loginIdempotencyCache.set(keyHash, { payloadHash, result: structuredClone(result) });
    return { ...result, created: true };
  }

  async authenticateToken(token) {
    if (!token) {
      throw new AppError({ status: 401, code: 'AUTH_REQUIRED', message: '请先登录后再继续。' });
    }
    const session = await this.repository.findByTokenHash(sha256(`session-token:${token}`));
    if (!session || session.revokedAt) {
      throw new AppError({ status: 401, code: 'SESSION_INVALID', message: '登录状态无效，请重新登录。' });
    }
    if (Date.parse(session.expiresAt) <= this.clock.now().getTime()) {
      throw new AppError({ status: 401, code: 'SESSION_EXPIRED', message: '登录状态已过期，请重新登录。' });
    }
    const seenAt = nowIso(this.clock);
    const updated = await this.repository.update(session.id, (current) => ({ ...current, lastSeenAt: seenAt }));
    return updated;
  }

  async getCurrent(token) {
    return publicSession(await this.authenticateToken(token));
  }

  async logout(token) {
    const session = await this.authenticateToken(token);
    await this.repository.update(session.id, (current) => ({ ...current, revokedAt: nowIso(this.clock) }));
  }

  #idempotencyConflict() {
    return new AppError({
      status: 409,
      code: 'STATE_CONFLICT',
      message: '幂等键已用于不同的登录请求。'
    });
  }
}

module.exports = { SessionService, publicSession };
