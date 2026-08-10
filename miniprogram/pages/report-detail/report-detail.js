const api = require('../../services/api');
const { getStoredAuth, clearStoredAuth } = require('../../services/auth');
const { prepareReport } = require('../../utils/report');

Page({
  data: { assessmentId: '', reportId: '', state: 'loading', report: null, errorMessage: '', requestId: '' },
  onLoad(options) {
    this.setData({ assessmentId: options.assessmentId || '', reportId: options.reportId || '' });
    this.loadReport();
  },
  async loadReport() {
    const auth = getStoredAuth();
    if (!auth) {
      this.setData({ state: 'error', errorMessage: '请先从报告 Tab 主动登录后查看保存报告。' });
      return;
    }
    this.setData({ state: 'loading', errorMessage: '', requestId: '' });
    try {
      const report = this.data.reportId
        ? await api.getReport(this.data.reportId, auth.token)
        : await api.getAssessmentReport(this.data.assessmentId, auth.token);
      this.setData({ state: 'success', reportId: report.id, report: prepareReport(report) });
    } catch (error) {
      if (['AUTH_REQUIRED', 'SESSION_INVALID', 'SESSION_EXPIRED'].includes(error.code)) clearStoredAuth();
      this.setData({ state: 'error', errorMessage: error.message || '报告加载失败。', requestId: error.requestId ? `请求编号：${error.requestId}` : '' });
    }
  },
  openEvidence(event) {
    const type = event.currentTarget.dataset.type;
    wx.navigateTo({ url: `/pages/evidence/evidence?reportId=${encodeURIComponent(this.data.reportId)}&type=${encodeURIComponent(type)}` });
  },
  openActions(event) {
    const type = event.currentTarget.dataset.type;
    wx.navigateTo({ url: `/pages/actions/actions?reportId=${encodeURIComponent(this.data.reportId)}&type=${encodeURIComponent(type)}` });
  },
  contactConsultant() {
    const enterpriseId = this.data.report?.enterprise?.id || '';
    wx.navigateTo({ url: `/pages/contact-consultant/contact-consultant?enterpriseId=${encodeURIComponent(enterpriseId)}` });
  }
});
