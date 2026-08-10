const { AppError } = require('../middleware/errors');

class EnterpriseService {
  constructor({ provider }) {
    this.provider = provider;
  }

  async search(options) {
    try {
      return await this.provider.searchEnterprises(options);
    } catch (error) {
      if (error.code === 'INVALID_CURSOR') {
        throw new AppError({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: '提交内容有误，请检查后重试。',
          fields: [{ field: 'cursor', reason: 'cursor 无效' }]
        });
      }

      if (
        [
          'PROVIDER_TIMEOUT',
          'PROVIDER_UNAVAILABLE',
          'PROVIDER_RATE_LIMITED',
          'PROVIDER_BAD_RESPONSE'
        ].includes(error.code)
      ) {
        throw new AppError({
          status: 503,
          code: 'DEPENDENCY_UNAVAILABLE',
          message: '企业数据服务暂时不可用，请稍后重试。',
          retryable: true,
          cause: error
        });
      }

      throw error;
    }
  }

  async getById(options) {
    let enterprise;

    try {
      enterprise = await this.provider.getEnterpriseById(options);
    } catch (error) {
      if (
        [
          'PROVIDER_TIMEOUT',
          'PROVIDER_UNAVAILABLE',
          'PROVIDER_RATE_LIMITED',
          'PROVIDER_BAD_RESPONSE'
        ].includes(error.code)
      ) {
        throw new AppError({
          status: 503,
          code: 'DEPENDENCY_UNAVAILABLE',
          message: '企业数据服务暂时不可用，请稍后重试。',
          retryable: true,
          cause: error
        });
      }

      throw error;
    }

    if (!enterprise) {
      throw new AppError({
        status: 404,
        code: 'ENTERPRISE_NOT_FOUND',
        message: '未找到该企业。'
      });
    }

    return enterprise;
  }
}

module.exports = { EnterpriseService };
