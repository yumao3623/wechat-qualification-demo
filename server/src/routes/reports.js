const express = require('express');
const { validationError } = require('../middleware/errors');
const { requireSession } = require('../middleware/auth');

function parseReportId(value) {
  if (typeof value !== 'string' || !/^rpt_[a-f0-9]{32}$/.test(value)) {
    throw validationError('id', '必须是合法的报告 ID');
  }
  return value;
}

function parseListQuery(query) {
  if (query.limit !== undefined && typeof query.limit !== 'string') throw validationError('limit', '必须是 1–50 的整数');
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw validationError('limit', '必须是 1–50 的整数');
  if (query.cursor !== undefined && typeof query.cursor !== 'string') throw validationError('cursor', '必须是字符串');
  return { limit, cursor: query.cursor || null };
}

function createReportRouter({ sessionService, reportService }) {
  const router = express.Router();
  const auth = requireSession({ sessionService });
  router.use(auth);

  router.get('/', async (req, res) => {
    const data = await reportService.list({ userId: req.session.userId, ...parseListQuery(req.query) });
    res.json({ data, meta: { requestId: req.requestId } });
  });

  router.get('/:id', async (req, res) => {
    const data = await reportService.getById({ reportId: parseReportId(req.params.id), userId: req.session.userId });
    res.json({ data, meta: { requestId: req.requestId } });
  });

  return router;
}

module.exports = { createReportRouter, parseListQuery, parseReportId };
