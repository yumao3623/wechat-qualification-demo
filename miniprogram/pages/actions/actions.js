const api = require('../../services/api');
const { getStoredAuth, clearStoredAuth } = require('../../services/auth');
const { PRIORITY_TEXT } = require('../../utils/report');

Page({
  data: { reportId: '', qualificationType: '', enterpriseId: '', state: 'loading', title: '缺口与行动', items: [], errorMessage: '', requestId: '' },
  onLoad(options) {
    this.setData({ reportId: options.reportId || '', qualificationType: options.type || '' });
    this.loadActions();
  },
  async loadActions() {
    const auth = getStoredAuth();
    if (!auth) { this.setData({ state: 'error', errorMessage: '登录状态不存在。' }); return; }
    try {
      const report = await api.getReport(this.data.reportId, auth.token);
      const qualification = report.qualifications.find((item) => item.qualificationType === this.data.qualificationType);
      const gaps = report.gaps.filter((item) => item.qualificationType === this.data.qualificationType);
      const actions = report.actions.filter((item) => item.qualificationType === this.data.qualificationType);
      const byGap = new Map(actions.map((item) => [item.gapId, item]));
      const items = gaps.map((gap) => {
        const action = byGap.get(gap.id) || {};
        return {
          ...gap,
          priorityText: PRIORITY_TEXT[gap.priority] || gap.priority,
          actionTitle: action.title || '建议人工核验该项',
          actionDescription: action.description || '',
          evidenceText: (action.evidenceToPrepare || []).join('、') || '按政策要求准备可核验材料',
          advisorRecommended: Boolean(action.advisorRecommended),
          disclaimer: action.disclaimer || '建议仅用于材料准备，不构成申报通过承诺。'
        };
      });
      this.setData({
        state: items.length ? 'success' : 'empty',
        title: qualification?.displayName || '缺口与行动',
        enterpriseId: report.enterprise.id,
        items
      });
    } catch (error) {
      if (['AUTH_REQUIRED', 'SESSION_INVALID', 'SESSION_EXPIRED'].includes(error.code)) clearStoredAuth();
      this.setData({ state: 'error', errorMessage: error.message || '缺口与行动加载失败。', requestId: error.requestId ? `请求编号：${error.requestId}` : '' });
    }
  },
  contactConsultant() {
    wx.navigateTo({ url: `/pages/contact-consultant/contact-consultant?enterpriseId=${encodeURIComponent(this.data.enterpriseId)}` });
  }
});
