const express = require('express');
const { validationError } = require('../middleware/errors');
const { bearerToken, requireSession } = require('../middleware/auth');
const { requireIdempotencyKey, requireObject } = require('./validation');

function parseLoginBody(body) {
  requireObject(body, 'body');
  if (typeof body.code !== 'string' || body.code.trim().length < 1 || body.code.length > 256) {
    throw validationError('code', '必须是 1–256 个字符的字符串');
  }
  requireObject(body.client, 'client');
  if (body.client.platform !== 'wechat-miniprogram') {
    throw validationError('client.platform', '必须是 wechat-miniprogram');
  }
  if (typeof body.client.version !== 'string' || body.client.version.length < 1 || body.client.version.length > 32) {
    throw validationError('client.version', '必须是 1–32 个字符');
  }
  return { code: body.code.trim(), client: { platform: body.client.platform, version: body.client.version } };
}

function createAuthRouter({ sessionService }) {
  const router = express.Router();
  const auth = requireSession({ sessionService });

  router.post('/login', async (req, res) => {
    const input = parseLoginBody(req.body);
    const result = await sessionService.login({ ...input, idempotencyKey: requireIdempotencyKey(req) });
    const { created, ...data } = result;
    res.status(created ? 201 : 200).json({ data, meta: { requestId: req.requestId } });
  });

  router.get('/session', auth, (req, res) => {
    const { tokenHash, authCodeHash, idempotencyKeyHash, requestHash, ...session } = req.session;
    res.json({ data: session, meta: { requestId: req.requestId } });
  });

  router.delete('/session', auth, async (req, res) => {
    requireIdempotencyKey(req);
    await sessionService.logout(bearerToken(req));
    res.status(204).end();
  });

  return router;
}

module.exports = { createAuthRouter, parseLoginBody };
