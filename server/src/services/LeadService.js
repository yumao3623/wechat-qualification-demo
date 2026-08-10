const { LEGAL_VERSIONS } = require('../config/legalVersions');
const { AppError } = require('../middleware/errors');
const { createId, sha256 } = require('../utils/ids');
const { nowIso } = require('../utils/clock');

const DIRECTIONS = new Set([
  'high_tech_enterprise', 'tech_sme', 'specialized_innovative',
  'eagle_enterprise', 'comprehensive'
]);

class LeadService {
  constructor({ repository, enterpriseService, clock, objectHash }) {
    Object.assign(this, { repository, enterpriseService, clock, objectHash });
  }

  async submit({ input, idempotencyKey, session = null }) {
    const fields = this.#validate(input);
    if (fields.length) {
      throw new AppError({ status: 400, code: 'VALIDATION_ERROR', message: '提交内容有误，请检查后重试。', fields });
    }
    if (input.enterprise.enterpriseId) {
      const profile = await this.enterpriseService.getById({ enterpriseId: input.enterprise.enterpriseId });
      if (profile.name !== input.enterprise.name) {
        throw new AppError({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: '提交内容有误，请检查后重试。',
          fields: [{ field: 'enterprise.name', reason: '与所选企业不一致' }]
        });
      }
    }
    const keyHash = sha256(`lead-idempotency:${idempotencyKey}`);
    const requestHash = this.objectHash(input);
    const existing = await this.repository.findByIdempotency(keyHash);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new AppError({ status: 409, code: 'STATE_CONFLICT', message: '幂等键已用于不同的咨询请求。' });
      }
      return { lead: existing, created: false };
    }
    const lead = {
      id: createId('lead'),
      enterprise: structuredClone(input.enterprise),
      contactName: input.contactName.trim(),
      mobile: input.mobile,
      directions: [...input.directions],
      note: (input.note || '').trim(),
      consent: {
        accepted: true,
        noticeVersion: input.consent.noticeVersion,
        agreedAt: new Date(input.consent.agreedAt).toISOString(),
        purpose: input.consent.purpose
      },
      sessionId: session?.id || null,
      status: 'submitted',
      idempotencyKeyHash: keyHash,
      requestHash,
      submittedAt: nowIso(this.clock)
    };
    await this.repository.create(lead);
    return { lead, created: true };
  }

  #validate(input) {
    const errors = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) return [{ field: 'body', reason: '必须是对象' }];
    if (!input.enterprise || typeof input.enterprise !== 'object' || Array.isArray(input.enterprise)) {
      errors.push({ field: 'enterprise', reason: '必须是对象' });
    } else {
      if (input.enterprise.enterpriseId !== undefined && (typeof input.enterprise.enterpriseId !== 'string' || !/^demo-[a-z0-9-]{1,43}$/.test(input.enterprise.enterpriseId))) errors.push({ field: 'enterprise.enterpriseId', reason: '必须是合法 Demo 企业 ID' });
      if (typeof input.enterprise.name !== 'string' || input.enterprise.name.trim().length < 2 || input.enterprise.name.length > 100) errors.push({ field: 'enterprise.name', reason: '长度应为 2–100 个字符' });
    }
    if (typeof input.contactName !== 'string' || input.contactName.trim().length < 2 || input.contactName.trim().length > 30) errors.push({ field: 'contactName', reason: '长度应为 2–30 个字符' });
    if (typeof input.mobile !== 'string' || !/^1[3-9]\d{9}$/.test(input.mobile)) errors.push({ field: 'mobile', reason: '必须是合法的 11 位中国大陆手机号' });
    if (!Array.isArray(input.directions) || input.directions.length < 1 || input.directions.some((item) => !DIRECTIONS.has(item))) errors.push({ field: 'directions', reason: '至少选择一个合法咨询方向' });
    if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 500)) errors.push({ field: 'note', reason: '最多 500 个字符' });
    const consent = input.consent;
    if (!consent || consent.accepted !== true) errors.push({ field: 'consent.accepted', reason: '必须明确同意咨询联系用途' });
    if (consent?.noticeVersion !== LEGAL_VERSIONS.leadNoticeVersion) errors.push({ field: 'consent.noticeVersion', reason: `必须是当前版本 ${LEGAL_VERSIONS.leadNoticeVersion}` });
    if (consent?.purpose !== LEGAL_VERSIONS.leadPurpose) errors.push({ field: 'consent.purpose', reason: '用途必须是 consultant_contact' });
    const agreedAt = Date.parse(consent?.agreedAt);
    const now = this.clock.now().getTime();
    if (!Number.isFinite(agreedAt) || agreedAt > now + 5 * 60 * 1000) errors.push({ field: 'consent.agreedAt', reason: '必须是有效时间且不能明显晚于服务器当前时间' });
    return errors;
  }
}

module.exports = { DIRECTIONS, LeadService };
