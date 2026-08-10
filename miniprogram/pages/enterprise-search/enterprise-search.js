const { searchEnterprises } = require('../../services/api');

Page({
  data: { keyword: '', state: 'idle', results: [], errorMessage: '', requestId: '', validationError: '' },
  requestSequence: 0,
  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value, validationError: '' });
  },
  async submitSearch() {
    const keyword = this.data.keyword.trim();
    if (keyword.length < 2 || keyword.length > 50) {
      this.setData({ validationError: '请输入 2–50 个字符的企业关键词' });
      return;
    }
    const sequence = ++this.requestSequence;
    this.setData({ state: 'loading', results: [], errorMessage: '', validationError: '' });
    try {
      const result = await searchEnterprises(keyword);
      if (sequence !== this.requestSequence) return;
      this.setData({ state: result.items.length ? 'success' : 'empty', results: result.items });
    } catch (error) {
      if (sequence !== this.requestSequence) return;
      this.setData({
        state: 'error',
        errorMessage: error.message || '搜索失败，请稍后重试。',
        requestId: error.requestId ? `请求编号：${error.requestId}` : ''
      });
    }
  },
  retry() { this.submitSearch(); },
  selectEnterprise(event) {
    const enterpriseId = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/enterprise-confirm/enterprise-confirm?id=${encodeURIComponent(enterpriseId)}` });
  }
});
