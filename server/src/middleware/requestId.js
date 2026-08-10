const { randomUUID } = require('node:crypto');

function requestId(req, res, next) {
  req.requestId = `req_${randomUUID().replaceAll('-', '')}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

module.exports = { requestId };
