const { API_BASE_URL, REQUEST_TIMEOUT_MS, TARGET_APPLICATION_YEAR } = require('../config/index');

class ApiError extends Error {
  constructor({ code = 'NETWORK_ERROR', message = '网络请求失败，请稍后重试。', fields = [], requestId = null, retryable = true, statusCode = 0 } = {}) {
    super(message);
    this.name = 'ApiError';
    Object.assign(this, { code, fields, requestId, retryable, statusCode });
  }
}

function normalizeApiError(response) {
  const statusCode = response?.statusCode || 0;
  const error = response?.data?.error;
  if (error) {
    return new ApiError({
      code: error.code,
      message: error.message,
      fields: error.fields || [],
      requestId: error.requestId || null,
      retryable: Boolean(error.retryable),
      statusCode
    });
  }
  return new ApiError({ statusCode, retryable: statusCode >= 500 || statusCode === 0 });
}

function request({ path, method = 'GET', data, timeout = REQUEST_TIMEOUT_MS }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data,
      timeout,
      header: { 'content-type': 'application/json' },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300 && response.data && Object.prototype.hasOwnProperty.call(response.data, 'data')) {
          resolve(response.data.data);
          return;
        }
        reject(normalizeApiError(response));
      },
      fail(error) {
        const isTimeout = error?.errMsg?.includes('timeout');
        reject(new ApiError({
          code: isTimeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
          message: isTimeout ? '请求超时，请检查后端服务后重试。' : '无法连接本地后端，请确认服务已启动。'
        }));
      }
    });
  });
}

function searchEnterprises(keyword) {
  return request({ path: `/api/enterprises?keyword=${encodeURIComponent(keyword)}&limit=10` });
}

function getEnterprise(enterpriseId) {
  return request({ path: `/api/enterprises/${encodeURIComponent(enterpriseId)}` });
}

function getMissingFields(enterpriseId, supplements = { fields: {} }) {
  return request({
    path: '/api/assessments/missing-fields',
    method: 'POST',
    data: {
      enterpriseId,
      supplements,
      context: { targetApplicationYear: TARGET_APPLICATION_YEAR }
    }
  });
}

module.exports = {
  ApiError,
  getEnterprise,
  getMissingFields,
  normalizeApiError,
  request,
  searchEnterprises
};
