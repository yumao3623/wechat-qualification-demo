const DOCUMENTS = Object.freeze({
  guide: {
    title: '使用说明', version: 'Phase 5 Demo', effectiveDate: '2026-08-10',
    sections: [
      { heading: '如何使用', paragraphs: ['从首页点击“开始预评估”，搜索并确认一家虚构 Demo 企业，查看画像后按 Backend 返回的动态字段补充数据。', '推荐搜索“云舟”演示缺失数据逐步减少；搜索“Demo”可看到四家不同场景。'] },
      { heading: '当前能力', paragraphs: ['本阶段只包含游客前置流程。不会自动登录、请求授权、创建 Session 或发起诊断。'] }
    ]
  },
  privacy: {
    title: '隐私政策', version: 'Demo 2026-08-10', effectiveDate: '2026-08-10',
    sections: [
      { heading: '处理的数据', paragraphs: ['搜索时，小程序会将用户输入的企业关键词发送到本地 Demo Backend。补数时，会将当前企业 ID 与用户主动填写的经营数据发送给 Backend，仅用于重新计算缺失字段。'] },
      { heading: '本地草稿', paragraphs: ['补充数据以企业 ID 隔离保存在小程序本地存储中，默认 2 小时过期。切换企业时不会将上一家企业的草稿带入。'] },
      { heading: '不处理的数据', paragraphs: ['Phase 5 不调用微信登录接口，不请求手机号或用户资料授权，不创建账号与 Session。'] },
      { heading: '运营主体', paragraphs: ['本项目为招聘能力验证 Demo，未提供正式运营主体、客服电话或备案号。真实上线前必须由实际运营者补充并完成合规审核。'] }
    ]
  },
  agreement: {
    title: '用户协议', version: 'Demo 2026-08-10', effectiveDate: '2026-08-10',
    sections: [
      { heading: '产品性质', paragraphs: ['本工具是招聘能力验证用的企业资质预评估 Demo，使用完全虚构的企业与演示数据。'] },
      { heading: '用户责任', paragraphs: ['请勿在 Demo 中输入不必要的真实商业秘密、个人信息或凭证原件。用户补充数据是未经核验的自行声明。'] },
      { heading: '使用边界', paragraphs: ['本阶段的法律页仅供游客查看，不构成强制同意，也不会因访问页面而建立登录会话。'] }
    ]
  },
  disclaimer: {
    title: '免责声明', version: 'Demo 2026-08-10', effectiveDate: '2026-08-10',
    sections: [
      { heading: '非官方认定', paragraphs: ['本工具仅提供初步准备度预评估，不是政府官方认定系统，不构成申报、审计、法律、税务或补贴意见。'] },
      { heading: '政策变化', paragraphs: ['政策、年度通知、地区口径及主管部门审核可能变化。最终以相关主管部门的现行政策、申报通知与审核结果为准。'] },
      { heading: '数据限制', paragraphs: ['所有 Demo 企业和主体编号均为虚构内容；用户填写不等于数据已经审计、官方平台或专家核验。'] }
    ]
  }
});

Page({
  data: { document: DOCUMENTS.guide },
  onLoad(options) {
    const document = DOCUMENTS[options.type] || DOCUMENTS.guide;
    this.setData({ document });
    wx.setNavigationBarTitle({ title: document.title });
  }
});
