const { createSessionFromUserAction } = require('./auth');

const REPORT_AGREEMENT_SELECTOR = '#reportAgreementDialog';

function getDialog(page) {
  return page.selectComponent(REPORT_AGREEMENT_SELECTOR);
}

function openReportLoginAgreement(page) {
  getDialog(page).open();
}

async function loginForReportsAfterAgreement(page, { createSession = createSessionFromUserAction } = {}) {
  const dialog = getDialog(page);
  dialog.setBusy('正在建立 Demo Session');
  try {
    await createSession();
    dialog.closeAfterSuccess();
    await page.loadReports();
    return true;
  } catch (error) {
    dialog.setError(error.message || '登录未完成，请重试。');
    return false;
  }
}

module.exports = { loginForReportsAfterAgreement, openReportLoginAgreement };
