const express = require('express');

function createAdminRouter({ adminService }) {
  const router = express.Router();

  router.get('/assessments', async (req, res) => {
    const items = await adminService.listAssessments();
    res.json({ data: { items }, meta: { requestId: req.requestId } });
  });

  router.get('/leads', async (req, res) => {
    const items = await adminService.listLeads();
    res.json({ data: { items }, meta: { requestId: req.requestId } });
  });

  return router;
}

module.exports = { createAdminRouter };
