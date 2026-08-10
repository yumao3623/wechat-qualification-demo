Page({
  data: {
    items: [
      { type: 'guide', title: '使用说明', desc: '了解 Demo 流程与数据边界' },
      { type: 'privacy', title: '隐私政策', desc: '了解游客数据如何处理' },
      { type: 'agreement', title: '用户协议', desc: '了解使用规则与 Demo 限制' },
      { type: 'disclaimer', title: '免责声明', desc: '了解预评估的非官方性质' }
    ]
  },
  openLegal(event) {
    wx.navigateTo({ url: `/pages/legal/legal?type=${event.currentTarget.dataset.type}` });
  }
});
