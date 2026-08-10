const express = require('express');
const { validationError } = require('../middleware/errors');

function parseSearchQuery(query) {
  if (typeof query.keyword !== 'string') {
    throw validationError('keyword', '必须是字符串');
  }

  const keyword = query.keyword.trim();
  if (keyword.length < 2 || keyword.length > 50) {
    throw validationError('keyword', '长度应为 2–50 个字符');
  }

  if (query.limit !== undefined && typeof query.limit !== 'string') {
    throw validationError('limit', '必须是 1–20 的整数');
  }

  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw validationError('limit', '必须是 1–20 的整数');
  }

  if (query.cursor !== undefined && typeof query.cursor !== 'string') {
    throw validationError('cursor', '必须是字符串');
  }

  return { keyword, limit, cursor: query.cursor || null };
}

function parseEnterpriseId(value) {
  if (typeof value !== 'string' || !/^demo-[a-z0-9-]{1,43}$/.test(value)) {
    throw validationError('id', '必须是合法的 Demo 企业 ID');
  }

  return value;
}

function createEnterpriseRouter({ enterpriseService }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const options = parseSearchQuery(req.query);
    const result = await enterpriseService.search(options);

    res.json({
      data: result,
      meta: { requestId: req.requestId }
    });
  });

  router.get('/:id', async (req, res) => {
    const enterpriseId = parseEnterpriseId(req.params.id);
    const enterprise = await enterpriseService.getById({ enterpriseId });

    res.json({
      data: enterprise,
      meta: { requestId: req.requestId }
    });
  });

  return router;
}

module.exports = {
  createEnterpriseRouter,
  parseEnterpriseId,
  parseSearchQuery
};
