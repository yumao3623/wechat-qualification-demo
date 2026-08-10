const api = require('../../services/api');
const { getStoredAuth, clearStoredAuth } = require('../../services/auth');
const { STATUS_POLL_INTERVAL_MS } = require('../../config/index');
const { ASSESSMENT_STATUS_TEXT, STAGE_TEXT } = require('../../utils/report');

Page({
  data: {
    assessmentId: '', enterpriseId: '', state: 'loading', status: 'pending',
    statusText: '', stageText: '', stageIndex: 1, stageCount: 8, reportId: '',
    errorMessage: '', requestId: '', failedMessage: ''
  },
  pollTimer: null,
  onLoad(options) {
    this.setData({ assessmentId: options.id || '', enterpriseId: options.enterpriseId || '' });
  },
  onShow() { this.startPolling(); },
  onHide() { this.stopPolling(); },
  onUnload() { this.stopPolling(); },
  startPolling() {
    this.stopPolling();
    this.refreshStatus();
  },
  stopPolling() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  },
  async refreshStatus() {
    const auth = getStoredAuth();
    if (!auth) {
      this.setData({ state: 'error', errorMessage: '登录状态不存在，请从报告 Tab 主动登录后重试。' });
      return;
    }
    try {
      const status = await api.getAssessmentStatus(this.data.assessmentId, auth.token);
      const terminal = ['ready', 'failed'].includes(status.status);
      this.setData({
        state: terminal ? status.status : 'success',
        status: status.status,
        statusText: ASSESSMENT_STATUS_TEXT[status.status] || status.status,
        stageText: STAGE_TEXT[status.stage] || status.stage,
        stageIndex: status.stageIndex || 1,
        stageCount: status.stageCount || 8,
        reportId: status.reportId || '',
        failedMessage: status.error?.message || '',
        errorMessage: '', requestId: ''
      });
      if (!terminal) this.pollTimer = setTimeout(() => this.refreshStatus(), STATUS_POLL_INTERVAL_MS);
    } catch (error) {
      if (['AUTH_REQUIRED', 'SESSION_INVALID', 'SESSION_EXPIRED'].includes(error.code)) clearStoredAuth();
      this.setData({
        state: 'error', errorMessage: error.message || '诊断状态加载失败。',
        requestId: error.requestId ? `请求编号：${error.requestId}` : ''
      });
    }
  },
  viewReport() {
    wx.navigateTo({ url: `/pages/report-detail/report-detail?assessmentId=${encodeURIComponent(this.data.assessmentId)}` });
  },
  restartAssessment() {
    if (this.data.enterpriseId) {
      wx.navigateTo({ url: `/pages/enterprise-profile/enterprise-profile?id=${encodeURIComponent(this.data.enterpriseId)}` });
    } else {
      wx.switchTab({ url: '/pages/home/home' });
    }
  }
});
