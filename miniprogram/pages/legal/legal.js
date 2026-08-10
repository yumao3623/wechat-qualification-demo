const DOCUMENTS = Object.freeze({
  guide: {
    title: '使用说明', version: 'Phase 6 Demo', effectiveDate: '2026-08-10',
    sections: [
      { heading: '如何使用', paragraphs: ['从首页点击“开始预评估”，搜索并确认一家虚构 Demo 企业，查看画像后按 Backend 返回的动态字段补充数据。', '点击“发起诊断”后先阅读三份文件；只有明确勾选并确认后，才会调用微信登录、建立 Demo Session 并创建诊断。'] },
      { heading: '报告与咨询', paragraphs: ['诊断会真实经历等待、处理、完成或失败状态。完成后可查看四类结果、Backend 证据、缺口与行动。顾问咨询可由游客手动填写手机号提交，不要求手机号授权。'] }
    ]
  },
  privacy: {
    title: '隐私政策', version: '2026-08-10', effectiveDate: '2026-08-10',
    sections: [
      { heading: '处理的数据', paragraphs: ['搜索时，小程序会将用户输入的企业关键词发送到本地 Demo Backend。补数时，会将当前企业 ID 与用户主动填写的经营数据发送给 Backend，仅用于重新计算缺失字段。'] },
      { heading: '本地草稿与 Session', paragraphs: ['补充数据以企业 ID 隔离保存在小程序本地存储中，默认 2 小时过期；诊断创建成功或退出登录后清除。明确发起诊断或主动登录查看报告时，会保存短期 Demo Session token。'] },
      { heading: '登录与咨询边界', paragraphs: ['小程序不会在启动、首页、报告 Tab 或“我的”自动登录。顾问咨询手机号由用户手动填写并单独同意处理用途，不强制微信手机号授权。'] },
      { heading: '运营主体', paragraphs: ['本项目为招聘能力验证 Demo，未提供正式运营主体、客服电话或备案号。真实上线前必须由实际运营者补充并完成合规审核。'] }
    ]
  },
  agreement: {
    title: '用户协议', version: '2026-08-10', effectiveDate: '2026-08-10',
    sections: [
      { heading: '产品性质', paragraphs: ['本工具是招聘能力验证用的企业资质预评估 Demo，使用完全虚构的企业与演示数据。'] },
      { heading: '用户责任', paragraphs: ['请勿在 Demo 中输入不必要的真实商业秘密、个人信息或凭证原件。用户补充数据是未经核验的自行声明。'] },
      { heading: '使用边界', paragraphs: ['访问法律页本身不构成同意，也不会建立登录会话。只有在发起诊断弹窗中主动勾选并确认，才提交该次诊断的协议快照。'] }
    ]
  },
  disclaimer: {
    title: '免责声明', version: '2026-08-10', effectiveDate: '2026-08-10',
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
