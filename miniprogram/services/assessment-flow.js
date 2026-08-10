const api = require('./api');
const { createSessionFromUserAction } = require('./auth');
const { LEGAL_VERSIONS, TARGET_APPLICATION_YEAR } = require('../config/index');
const { clearDraft, loadDraft } = require('./draft');
const { createIdempotencyKey } = require('../utils/idempotency');

function buildAgreement(agreedAt) {
  return {
    accepted: true,
    userAgreementVersion: LEGAL_VERSIONS.userAgreementVersion,
    privacyPolicyVersion: LEGAL_VERSIONS.privacyPolicyVersion,
    disclaimerVersion: LEGAL_VERSIONS.disclaimerVersion,
    agreedAt,
    agreementSource: LEGAL_VERSIONS.agreementSource
  };
}

function buildAssessmentBody(enterpriseId, supplements, agreedAt) {
  return {
    enterpriseId,
    supplements,
    context: { targetApplicationYear: TARGET_APPLICATION_YEAR },
    agreement: buildAgreement(agreedAt)
  };
}

function openAgreement(page) {
  page.selectComponent('#agreementDialog').open();
}

async function confirmAgreement(page, event) {
  const dialog = page.selectComponent('#agreementDialog');
  const agreedAt = event.detail.agreedAt;
  const enterpriseId = page.data.enterpriseId;
  const pending = {
    idempotencyKey: createIdempotencyKey('assessment'),
    body: buildAssessmentBody(enterpriseId, loadDraft(enterpriseId).supplements, agreedAt)
  };
  page.pendingAssessment = pending;
  dialog.setBusy('正在建立 Demo Session');
  try {
    const auth = await createSessionFromUserAction();
    dialog.setBusy('正在创建诊断');
    const assessment = await api.createAssessment(pending.body, auth.token, pending.idempotencyKey);
    clearDraft(enterpriseId);
    dialog.closeAfterSuccess();
    wx.navigateTo({
      url: `/pages/assessment-progress/assessment-progress?id=${encodeURIComponent(assessment.assessmentId)}&enterpriseId=${encodeURIComponent(enterpriseId)}`
    });
  } catch (error) {
    dialog.setError(error.message || '诊断尚未创建，请重试或暂时关闭。');
  }
}

async function retryAssessment(page) {
  const dialog = page.selectComponent('#agreementDialog');
  const pending = page.pendingAssessment;
  if (!pending) return;
  dialog.setBusy('正在重试创建诊断');
  try {
    const auth = await createSessionFromUserAction();
    const assessment = await api.createAssessment(pending.body, auth.token, pending.idempotencyKey);
    clearDraft(page.data.enterpriseId);
    dialog.closeAfterSuccess();
    wx.navigateTo({
      url: `/pages/assessment-progress/assessment-progress?id=${encodeURIComponent(assessment.assessmentId)}&enterpriseId=${encodeURIComponent(page.data.enterpriseId)}`
    });
  } catch (error) {
    dialog.setError(error.message || '诊断尚未创建，请稍后重试。');
  }
}

module.exports = {
  buildAgreement,
  buildAssessmentBody,
  confirmAgreement,
  openAgreement,
  retryAssessment
};
