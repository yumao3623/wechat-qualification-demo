const express = require('express');
const { requireIdempotencyKey } = require('./validation');

function publicLead(lead) {
  return { leadId: lead.id, status: lead.status, submittedAt: lead.submittedAt };
}

function createLeadRouter({ leadService }) {
  const router = express.Router();
  router.post('/', async (req, res) => {
    const result = await leadService.submit({
      input: req.body,
      idempotencyKey: requireIdempotencyKey(req)
    });
    res.status(result.created ? 201 : 200).json({
      data: publicLead(result.lead),
      meta: { requestId: req.requestId }
    });
  });
  return router;
}

module.exports = { createLeadRouter, publicLead };
