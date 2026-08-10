const { getEnterprise } = require('../../services/api');
const { setCurrentEnterprise } = require('../../services/draft');
const { formatRegion } = require('../../utils/format');

Page({
  data: { enterpriseId: '', enterprise: null, state: 'loading', errorMessage: '', requestId: '' },
  onLoad(options) {
    this.setData({ enterpriseId: options.id || '' });
    this.loadEnterprise();
  },
  async loadEnterprise() {
    this.setData({ state: 'loading', errorMessage: '', requestId: '' });
    try {
      const enterprise = await getEnterprise(this.data.enterpriseId);
      this.setData({
        state: 'success',
        enterprise: {
          ...enterprise,
          regionText: formatRegion(enterprise.registrationRegion),
          capitalText: `${Number(enterprise.registeredCapital?.value || 0).toLocaleString('zh-CN')} ${enterprise.registeredCapital?.unit === 'CNY' ? '元' : enterprise.registeredCapital?.unit || ''}`,
          statusText: enterprise.legalStatus === 'active' ? '存续' : enterprise.legalStatus
        }
      });
    } catch (error) {
      this.setData({ state: 'error', errorMessage: error.message || '企业信息不可用。', requestId: error.requestId ? `请求编号：${error.requestId}` : '' });
    }
  },
  confirmEnterprise() {
    setCurrentEnterprise(this.data.enterpriseId);
    wx.navigateTo({ url: `/pages/enterprise-profile/enterprise-profile?id=${encodeURIComponent(this.data.enterpriseId)}` });
  },
  chooseAgain() { wx.navigateBack(); }
});
