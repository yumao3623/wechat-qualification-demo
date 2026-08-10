const { AppError } = require('./errors');

function normalizeAddress(address) {
  return typeof address === 'string' ? address.toLowerCase().split('%')[0] : '';
}

function isLoopbackAddress(address) {
  const normalized = normalizeAddress(address);
  return normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized === '::ffff:127.0.0.1';
}

function isLocalAdminRequest(req) {
  return isLoopbackAddress(req.socket?.remoteAddress);
}

function adminLocalOnly({ isLocalRequest = isLocalAdminRequest } = {}) {
  return function requireLocalAdmin(req, _res, next) {
    if (!isLocalRequest(req)) {
      return next(new AppError({
        status: 403,
        code: 'FORBIDDEN',
        message: '本地 Demo 管理页仅允许从运行 Backend 的本机访问。'
      }));
    }
    return next();
  };
}

module.exports = { adminLocalOnly, isLocalAdminRequest, isLoopbackAddress };
