const { AppError } = require('./errors');

function notFoundHandler(req, _res, next) {
  next(
    new AppError({
      status: 404,
      code: 'NOT_FOUND',
      message: '请求的接口不存在。'
    })
  );
}

function errorHandler(error, req, res, _next) {
  let normalized = error;

  if (error?.type === 'entity.parse.failed') {
    normalized = new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '提交内容有误，请检查后重试。',
      fields: [{ field: 'body', reason: 'JSON 格式无效' }]
    });
  }

  if (!(normalized instanceof AppError)) {
    normalized = new AppError({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: '服务暂时不可用，请稍后重试。',
      retryable: true,
      cause: error
    });
  }

  res.status(normalized.status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      fields: normalized.fields,
      requestId: req.requestId,
      retryable: normalized.retryable
    }
  });
}

module.exports = { errorHandler, notFoundHandler };
