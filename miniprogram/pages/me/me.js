const { getStoredAuth, logoutCurrentSession, validateStoredAuth } = require('../../services/auth');
const { clearAllDrafts } = require('../../services/draft');

Page({
  data: {
    loggedIn: false, session: null, sessionChecking: false, logoutBusy: false, errorMessage: '',
    items: [
      { type: 'guide', title: '使用说明', desc: '了解完整 Demo 流程与数据边界' },
      { type: 'privacy', title: '隐私政策', desc: '了解数据与 Session 如何处理' },
      { type: 'agreement', title: '用户协议', desc: '了解使用规则与 Demo 限制' },
      { type: 'disclaimer', title: '免责声明', desc: '了解预评估的非官方性质' }
    ]
  },
  onShow() {
    if (!getStoredAuth()) { this.setData({ loggedIn: false, session: null, errorMessage: '' }); return; }
    this.refreshSession();
  },
  async refreshSession() {
    this.setData({ sessionChecking: true, errorMessage: '' });
    try {
      const auth = await validateStoredAuth();
      this.setData({ loggedIn: Boolean(auth), session: auth?.session || null });
    } catch (error) {
      this.setData({ loggedIn: true, session: getStoredAuth()?.session || null, errorMessage: '暂时无法验证 Session，法律入口仍可使用。' });
    } finally {
      this.setData({ sessionChecking: false });
    }
  },
  openLegal(event) {
    wx.navigateTo({ url: `/pages/legal/legal?type=${event.currentTarget.dataset.type}` });
  },
  logout() {
    wx.showModal({
      title: '退出 Demo 登录？',
      content: '退出后本机 Session 和企业补充草稿会被清除，已生成报告仍保存在 Backend。',
      confirmText: '退出登录',
      success: (result) => { if (result.confirm) this.performLogout(); }
    });
  },
  async performLogout() {
    this.setData({ logoutBusy: true, errorMessage: '' });
    try {
      await logoutCurrentSession();
      clearAllDrafts();
      this.setData({ loggedIn: false, session: null });
      wx.showToast({ title: '已退出登录', icon: 'success' });
    } catch (error) {
      this.setData({ errorMessage: error.message || '退出失败，请重试。' });
    } finally {
      this.setData({ logoutBusy: false });
    }
  }
});
