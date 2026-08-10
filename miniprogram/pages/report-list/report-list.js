const api = require('../../services/api');
const { getStoredAuth, validateStoredAuth } = require('../../services/auth');
const { loginForReportsAfterAgreement, openReportLoginAgreement } = require('../../services/report-access');
const { prepareReportListItem } = require('../../utils/report');

Page({
  data: { state: 'guest', items: [], errorMessage: '', requestId: '' },
  onShow() {
    if (!getStoredAuth()) {
      this.setData({ state: 'guest', items: [], errorMessage: '' });
      return;
    }
    this.loadReports();
  },
  openLoginAgreement() { openReportLoginAgreement(this); },
  onReportAgreementConfirmed() { return loginForReportsAfterAgreement(this); },
  retryReportLogin() { return loginForReportsAfterAgreement(this); },
  async loadReports() {
    this.setData({ state: 'loading', errorMessage: '', requestId: '' });
    try {
      const auth = await validateStoredAuth();
      if (!auth) { this.setData({ state: 'guest', items: [] }); return; }
      const result = await api.getReports(auth.token);
      const items = result.items.map(prepareReportListItem);
      this.setData({ state: items.length ? 'success' : 'empty', items });
    } catch (error) {
      this.setData({ state: 'error', errorMessage: error.message || '报告列表加载失败。', requestId: error.requestId ? `请求编号：${error.requestId}` : '' });
    }
  },
  startAssessment() { wx.switchTab({ url: '/pages/home/home' }); },
  openItem(event) {
    const item = this.data.items[Number(event.currentTarget.dataset.index)];
    if (!item) return;
    if (item.status === 'ready' && item.reportId) {
      wx.navigateTo({ url: `/pages/report-detail/report-detail?reportId=${encodeURIComponent(item.reportId)}` });
      return;
    }
    wx.navigateTo({ url: `/pages/assessment-progress/assessment-progress?id=${encodeURIComponent(item.assessmentId)}&enterpriseId=${encodeURIComponent(item.enterprise.id)}` });
  }
});
