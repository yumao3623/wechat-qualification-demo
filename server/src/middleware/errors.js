class AppError extends Error {
  constructor({ status, code, message, fields = [], retryable = false, cause }) {
    super(message, { cause });
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.retryable = retryable;
  }
}

function validationError(field, reason) {
  return new AppError({
    status: 400,
    code: 'VALIDATION_ERROR',
    message: '提交内容有误，请检查后重试。',
    fields: [{ field, reason }]
  });
}

module.exports = { AppError, validationError };
