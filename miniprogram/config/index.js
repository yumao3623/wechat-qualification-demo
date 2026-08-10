module.exports = Object.freeze({
  API_BASE_URL: 'http://127.0.0.1:3000',
  REQUEST_TIMEOUT_MS: 10000,
  TARGET_APPLICATION_YEAR: 2026,
  DRAFT_TTL_MS: 2 * 60 * 60 * 1000,
  CLIENT_VERSION: '0.6.0',
  STATUS_POLL_INTERVAL_MS: 500,
  LEGAL_VERSIONS: Object.freeze({
    userAgreementVersion: '2026-08-10',
    privacyPolicyVersion: '2026-08-10',
    disclaimerVersion: '2026-08-10',
    agreementSource: 'assessment-dialog',
    leadNoticeVersion: 'lead-privacy-2026-08-10',
    leadPurpose: 'consultant_contact'
  })
});
