const api = require('../../services/api');
const { getStoredAuth, clearStoredAuth } = require('../../services/auth');
const { prepareEvidence } = require('../../utils/report');

Page({
  data: { reportId: '', qualificationType: '', state: 'loading', title: '证据链', evidence: [], errorMessage: '', requestId: '' },
  onLoad(options) {
    this.setData({ reportId: options.reportId || '', qualificationType: options.type || '' });
    this.loadEvidence();
  },
  async loadEvidence() {
    const auth = getStoredAuth();
    if (!auth) { this.setData({ state: 'error', errorMessage: '登录状态不存在。' }); return; }
    try {
      const report = await api.getReport(this.data.reportId, auth.token);
      const qualification = report.qualifications.find((item) => item.qualificationType === this.data.qualificationType);
      const evidence = report.evidence.filter((item) => item.qualificationType === this.data.qualificationType).map(prepareEvidence);
      this.setData({ state: evidence.length ? 'success' : 'empty', title: qualification?.displayName || '证据链', evidence });
    } catch (error) {
      if (['AUTH_REQUIRED', 'SESSION_INVALID', 'SESSION_EXPIRED'].includes(error.code)) clearStoredAuth();
      this.setData({ state: 'error', errorMessage: error.message || '证据链加载失败。', requestId: error.requestId ? `请求编号：${error.requestId}` : '' });
    }
  }
});
