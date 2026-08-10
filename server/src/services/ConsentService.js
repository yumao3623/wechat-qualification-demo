const { LEGAL_VERSIONS } = require('../config/legalVersions');
const { AppError } = require('../middleware/errors');
const { createId } = require('../utils/ids');
const { nowIso } = require('../utils/clock');

class ConsentService {
  constructor({ repository, clock }) {
    this.repository = repository;
    this.clock = clock;
  }

  validate(agreement) {
    const invalid = [];
    if (!agreement || typeof agreement !== 'object' || Array.isArray(agreement)) {
      throw this.#required([{ field: 'agreement', reason: '必须明确提交协议版本和同意时间' }]);
    }
    for (const field of ['userAgreementVersion', 'privacyPolicyVersion', 'disclaimerVersion']) {
      if (agreement[field] !== LEGAL_VERSIONS[field]) {
        invalid.push({ field: `agreement.${field}`, reason: `必须同意当前版本 ${LEGAL_VERSIONS[field]}` });
      }
    }
    if (agreement.agreementSource !== LEGAL_VERSIONS.agreementSource) {
      invalid.push({ field: 'agreement.agreementSource', reason: '协议来源无效' });
    }
    const agreedAt = Date.parse(agreement.agreedAt);
    const now = this.clock.now().getTime();
    if (!Number.isFinite(agreedAt)) {
      invalid.push({ field: 'agreement.agreedAt', reason: '必须是有效 ISO 8601 时间' });
    } else if (agreedAt > now + 5 * 60 * 1000) {
      invalid.push({ field: 'agreement.agreedAt', reason: '同意时间不能明显晚于服务器当前时间' });
    }
    if (agreement.accepted !== undefined && agreement.accepted !== true) {
      invalid.push({ field: 'agreement.accepted', reason: '必须明确同意' });
    }
    if (invalid.length) throw this.#required(invalid);

    return {
      accepted: true,
      userAgreementVersion: agreement.userAgreementVersion,
      privacyPolicyVersion: agreement.privacyPolicyVersion,
      disclaimerVersion: agreement.disclaimerVersion,
      agreedAt: new Date(agreedAt).toISOString(),
      agreementSource: agreement.agreementSource
    };
  }

  async record({ agreement, assessmentId, session }) {
    const snapshot = this.validate(agreement);
    const consent = {
      id: createId('cns'),
      assessmentId,
      sessionId: session.id,
      userId: session.userId,
      context: { purpose: 'qualification_pre_assessment', enterpriseDataProcessing: true },
      ...snapshot,
      recordedAt: nowIso(this.clock)
    };
    await this.repository.create(consent);
    return consent;
  }

  #required(fields) {
    return new AppError({
      status: 409,
      code: 'AGREEMENT_REQUIRED',
      message: '请先明确同意当前版本的用户协议、隐私政策和免责声明。',
      fields
    });
  }
}

module.exports = { ConsentService };
