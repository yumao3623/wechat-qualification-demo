const express = require('express');
const { AppError, validationError } = require('../middleware/errors');
const { requireSession } = require('../middleware/auth');
const { parseEnterpriseId } = require('./enterprises');
const { requireIdempotencyKey, requireObject } = require('./validation');
const { STAGES } = require('../services/AssessmentService');

function parseAssessmentId(value) {
  if (typeof value !== 'string' || !/^asm_[a-f0-9]{32}$/.test(value)) {
    throw validationError('id', '必须是合法的诊断 ID');
  }
  return value;
}

function parseAssessmentBody(body) {
  requireObject(body, 'body');
  const enterpriseId = parseEnterpriseId(body.enterpriseId);
  const supplements = body.supplements === undefined ? { fields: {} } : requireObject(body.supplements, 'supplements');
  requireObject(supplements.fields, 'supplements.fields');
  const context = requireObject(body.context, 'context');
  if (!Number.isInteger(context.targetApplicationYear) || context.targetApplicationYear < 2020 || context.targetApplicationYear > 2100) {
    throw validationError('context.targetApplicationYear', '必须是 2020–2100 的整数年度');
  }
  if (context.retryOfAssessmentId !== undefined) parseAssessmentId(context.retryOfAssessmentId);
  return {
    enterpriseId,
    supplements,
    requestContext: {
      targetApplicationYear: context.targetApplicationYear,
      retryOfAssessmentId: context.retryOfAssessmentId || null
    },
    agreement: body.agreement
  };
}

function publicAssessment(assessment) {
  return {
    assessmentId: assessment.id,
    status: assessment.status,
    stage: assessment.stage,
    stageIndex: assessment.stageIndex,
    stageCount: STAGES.length,
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
    reportId: assessment.reportId,
    error: assessment.error,
    links: {
      status: `/api/assessments/${assessment.id}/status`,
      report: `/api/assessments/${assessment.id}/report`
    }
  };
}

function parseMissingFieldsBody(body) {
  requireObject(body, 'body');
  const enterpriseId = parseEnterpriseId(body.enterpriseId);
  const supplements = body.supplements === undefined ? { fields: {} } : requireObject(body.supplements, 'supplements');
  requireObject(supplements.fields, 'supplements.fields');
  const context = requireObject(body.context, 'context');
  if (!Number.isInteger(context.targetApplicationYear) || context.targetApplicationYear < 2020 || context.targetApplicationYear > 2100) {
    throw validationError('context.targetApplicationYear', '必须是 2020–2100 的整数年度');
  }
  return { enterpriseId, supplements, targetApplicationYear: context.targetApplicationYear };
}

function createAssessmentRouter({ sessionService, assessmentService, reportService, dynamicFieldService }) {
  const router = express.Router();
  const auth = requireSession({ sessionService });

  router.post('/missing-fields', async (req, res) => {
    const data = await dynamicFieldService.getMissingFields(parseMissingFieldsBody(req.body));
    res.json({ data, meta: { requestId: req.requestId } });
  });

  router.post('/', auth, async (req, res) => {
    const result = await assessmentService.create({
      session: req.session,
      ...parseAssessmentBody(req.body),
      idempotencyKey: requireIdempotencyKey(req)
    });
    res.status(result.created ? 201 : 200).json({
      data: publicAssessment(result.assessment),
      meta: { requestId: req.requestId }
    });
  });

  router.get('/:id/status', auth, async (req, res) => {
    const assessment = await assessmentService.getStatus({
      assessmentId: parseAssessmentId(req.params.id),
      userId: req.session.userId
    });
    res.json({
      data: publicAssessment(assessment),
      meta: {
        requestId: req.requestId,
        pollAfterMs: ['pending', 'processing'].includes(assessment.status) ? 250 : null
      }
    });
  });

  router.get('/:id/report', auth, async (req, res) => {
    const assessmentId = parseAssessmentId(req.params.id);
    try {
      const report = await reportService.getByAssessment({ assessmentId, userId: req.session.userId });
      res.json({ data: report, meta: { requestId: req.requestId } });
    } catch (error) {
      if (error instanceof AppError && error.code === 'REPORT_NOT_READY') {
        error.fields.push({ field: 'statusUrl', reason: `/api/assessments/${assessmentId}/status` });
      }
      throw error;
    }
  });

  return router;
}

module.exports = {
  createAssessmentRouter,
  parseAssessmentBody,
  parseAssessmentId,
  parseMissingFieldsBody,
  publicAssessment
};
