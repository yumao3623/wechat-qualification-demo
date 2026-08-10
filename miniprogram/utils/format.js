const FIELD_LABELS = Object.freeze({
  residentEnterpriseStatus: '居民企业身份',
  employeeCount: '职工总数',
  techEmployeeCount: '科技人员数',
  rdEmployeeCount: '研发人员数',
  salesRevenue: '销售收入',
  operatingRevenue: '营业收入',
  mainBusinessRevenue: '主营业务收入',
  highTechRevenue: '高新技术产品（服务）收入',
  totalRevenue: '收入总额',
  rdExpense: '研发费用',
  domesticRdExpense: '境内研发费用',
  totalAssets: '资产总额',
  totalLiabilities: '负债总额',
  intellectualProperties: '知识产权清单',
  businessAbnormal: '经营异常',
  seriousDishonesty: '严重失信',
  rdScoringMethod: '研发投入评分口径'
});

function formatUnit(unit) {
  return ({ CNY: '元', people: '人', items: '项', boolean: '', enum: '' })[unit] ?? unit ?? '';
}

function formatValue(measurement) {
  if (!measurement || measurement.value === null || measurement.value === undefined) return '未获取';
  const value = measurement.value;
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (Array.isArray(value)) return `${value.length} 项`;
  if (typeof value === 'number') return `${value.toLocaleString('zh-CN')} ${formatUnit(measurement.unit)}`.trim();
  if (value === 'sales_revenue') return '按销售收入口径';
  if (value === 'cost_expense') return '按成本费用口径';
  return String(value);
}

function formatPeriod(period) {
  if (!period) return '未标注期间';
  if (period.year) return `${period.year} 年`;
  if (period.date) return `截至 ${period.date}`;
  return period.type || '未标注期间';
}

function flattenProfileFields(fields = {}) {
  const known = [];
  const missing = [];
  for (const [key, raw] of Object.entries(fields)) {
    if (raw === null || raw === undefined) {
      missing.push({ key, label: FIELD_LABELS[key] || key });
      continue;
    }
    const measurements = Array.isArray(raw) ? raw : [raw];
    for (const measurement of measurements) {
      known.push({
        key: `${key}-${measurement?.period?.year || measurement?.period?.date || 'current'}`,
        label: FIELD_LABELS[key] || key,
        valueText: formatValue(measurement),
        periodText: formatPeriod(measurement?.period),
        sourceText: measurement?.source?.sourceType === 'demo_mock' ? '虚构 Demo 企业画像' : measurement?.source?.sourceLabel || '未标注来源'
      });
    }
  }
  return { known, missing };
}

function formatRegion(region = {}) {
  return [region.province, region.city, region.district].filter(Boolean).join(' ');
}

module.exports = { FIELD_LABELS, flattenProfileFields, formatPeriod, formatRegion, formatUnit, formatValue };
