const { AppError } = require('./errors');

function bearerToken(req) {
  const header = req.get('authorization');
  if (!header) return null;
  const match = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(header);
  if (!match) {
    throw new AppError({
      status: 401,
      code: 'SESSION_INVALID',
      message: '登录凭证格式无效，请重新登录。'
    });
  }
  return match[1];
}

function requireSession({ sessionService }) {
  return async (req, _res, next) => {
    try {
      req.sessionToken = bearerToken(req);
      req.session = await sessionService.authenticateToken(req.sessionToken);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { bearerToken, requireSession };
