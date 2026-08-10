Page({
  data: {
    qualifications: [
      { name: '高新技术企业', desc: '从主体年限、人员、研发、收入与知识产权等维度预筛。' },
      { name: '科技型中小企业', desc: '聚焦企业规模、科技人员、研发投入与科技成果。' },
      { name: '专精特新', desc: '按 2026 年新标准展示可自动预筛项与人工核验项。' },
      { name: '杭州新雏鹰区域示例', desc: '体现地域适用性；非杭州主体不适用该示例规则。' }
    ]
  },
  startAssessment() {
    wx.navigateTo({ url: '/pages/enterprise-search/enterprise-search' });
  }
});
