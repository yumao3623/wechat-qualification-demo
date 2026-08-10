const CHECKED_AT = '2026-08-10';

const POLICY = Object.freeze({
  highTech: {
    qualificationType: 'high_tech_enterprise',
    displayName: '高新技术企业',
    jurisdiction: 'CN',
    applicableRegion: '中国境内（不含港澳台）居民企业',
    ruleVersion: {
      id: 'HTE-2016-32-195@2026-08-10',
      effectiveDate: '2016-01-01',
      checkedAt: CHECKED_AT,
      jurisdiction: 'CN_EXCEPT_HK_MACAU_TW',
      sources: [
        'https://www.most.gov.cn/xxgk/xinxifenlei/fdzdgknr/fgzc/gfxwj/gfxwj2016/201602/t20160205_123998.html',
        'https://www.most.gov.cn/xxgk/xinxifenlei/fdzdgknr/fgzc/gfxwj/gfxwj2016/201606/t20160629_126169.html'
      ],
      simplifications: [
        '只对日期、数量和比例作预筛；领域、关联性、审计口径和创新能力保留人工核验。'
      ]
    }
  },
  techSme: {
    qualificationType: 'tech_sme',
    displayName: '科技型中小企业',
    jurisdiction: 'CN',
    applicableRegion: '全国',
    ruleVersion: {
      id: 'TECH-SME-2017-115-2026-160@2026-08-10',
      effectiveDate: '2026-06-01',
      checkedAt: CHECKED_AT,
      jurisdiction: 'CN',
      sources: [
        'https://www.most.gov.cn/xxgk/xinxifenlei/fdzdgknr/fgzc/gfxwj/gfxwj2017/201705/t20170510_132709.html',
        'https://wap.miit.gov.cn/jgsj/qyj/wjfb/art/2026/art_92fae9ab4aba4b44a1ab2e7233c48a54.html'
      ],
      simplifications: [
        '按公开评价分档计算结构化指标；人员、研发归集、知识产权关联和年度核查仍需证据。'
      ]
    }
  },
  specialized: {
    qualificationType: 'specialized_innovative',
    displayName: '专精特新中小企业',
    jurisdiction: 'CN',
    applicableRegion: '全国（由省级中小企业主管部门认定）',
    ruleVersion: {
      id: 'SPECIALIZED-2026-2@2026-08-10',
      effectiveDate: '2026-04-01',
      checkedAt: CHECKED_AT,
      jurisdiction: 'CN',
      sources: [
        'https://wap.miit.gov.cn/cms_files/filemanager/1226211233/attach/20261/0c74a1a375e741f2ae3a5672c298a19c.pdf',
        'https://www.miit.gov.cn/jgsj/qyj/gzdt/art/2026/art_87cabbda70004e95b83e04730abf82e7.html'
      ],
      simplifications: [
        '不复算平台质量评价隐藏公式；市场地位、投资者资格、知识产权效益和审计口径人工核验。'
      ]
    }
  },
  eagle: {
    qualificationType: 'eagle_enterprise',
    displayName: '雏鹰企业（杭州新雏鹰区域示例）',
    jurisdiction: 'CN-ZJ-HZ',
    applicableRegion: '杭州市',
    ruleVersion: {
      id: 'HANGZHOU-NEW-EAGLE-2024-50@2026-08-10',
      effectiveDate: '2024-10-11',
      expiresAt: '2027-12-31',
      checkedAt: CHECKED_AT,
      jurisdiction: 'CN-ZJ-HZ',
      sources: [
        'https://zfgb.hangzhou.gov.cn/11/105220253/t117220253054/518938.shtml',
        'https://zfgb.hangzhou.gov.cn/11/109220253/t126220253094/529631.shtml'
      ],
      simplifications: [
        '仅实现杭州市区域示例；未来产业分类、人才/奖项、投资者资格和综合评审人工核验。'
      ]
    }
  }
});

module.exports = { CHECKED_AT, POLICY };
