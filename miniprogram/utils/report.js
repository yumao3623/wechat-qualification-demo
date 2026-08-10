const STATUS_TEXT = Object.freeze({
  promising: '较有希望',
  opportunity: '存在机会',
  needs_data: '需补充数据',
  not_met: '暂不满足',
  not_applicable: '不适用'
});

const CRITERION_TEXT = Object.freeze({
  met: '预筛满足',
  unmet: '预筛未满足',
  unknown: '缺少数据',
  manual_review: '需人工核验',
  not_applicable: '不适用'
});

const ASSESSMENT_STATUS_TEXT = Object.freeze({
  pending: '等待处理', processing: '诊断进行中', ready: '报告已完成', failed: '诊断失败'
});

const STAGE_TEXT = Object.freeze({
  prepare_enterprise_data: '准备企业数据',
  validate_input_completeness: '检查数据完整性',
  evaluate_high_tech: '执行高企规则',
  evaluate_tech_sme: '执行科技型中小企业规则',
  evaluate_specialized_innovative: '执行专精特新规则',
  evaluate_eagle: '执行杭州新雏鹰规则',
  assemble_evidence_actions: '整理证据与行动',
  generate_report: '生成报告'
});

const PRIORITY_TEXT = Object.freeze({ high: '高优先', medium: '中优先', low: '低优先' });

function formatDateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '时间未知';
  const pad = (item) => String(item).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatScalar(value, unit) {
  if (value === null || value === undefined) return '未提供';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'number') {
    if (unit === 'ratio') return `${(value * 100).toFixed(2)}%`;
    const unitText = ({ CNY: '元', people: '人', items: '项', points: '分', days: '天' })[unit] || unit || '';
    return `${value.toLocaleString('zh-CN')}${unitText ? ` ${unitText}` : ''}`;
  }
  if (Array.isArray(value)) return `${value.length} 项`;
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${key}: ${formatScalar(item)}`).join('；');
  }
  return String(value);
}

function formatActualValue(actualValue) {
  if (actualValue === null || actualValue === undefined) return '未提供';
  if (Object.prototype.hasOwnProperty.call(actualValue, 'value')) {
    return formatScalar(actualValue.value, actualValue.unit);
  }
  return formatScalar(actualValue);
}

function sourceText(source) {
  const type = source?.sourceType;
  return ({ demo_mock: '虚构 Demo 企业画像', user: '用户补充', derived: '系统推导', official_platform: '官方平台材料', official_registry: '官方登记材料', provider: '企业数据 Provider' })[type]
    || source?.sourceLabel
    || '未标注来源';
}

function prepareQualification(item) {
  return {
    ...item,
    statusText: STATUS_TEXT[item.status] || item.status,
    manualReviewCount: (item.criteria || []).filter((criterion) => criterion.result === 'manual_review').length,
    primaryGap: item.gaps?.[0]?.title || '未发现可自动识别的明确缺口',
    checkedAt: item.ruleVersion?.checkedAt || '未标注'
  };
}

function prepareEvidence(item) {
  return {
    ...item,
    resultText: CRITERION_TEXT[item.result] || item.result,
    actualValueText: formatActualValue(item.actualValue),
    sourcesText: (item.sources || []).map(sourceText).join('、') || '未标注来源',
    missingText: (item.missingData || []).join('、') || '无'
  };
}

function prepareReport(report) {
  return {
    ...report,
    generatedAtText: formatDateTime(report.generatedAt),
    qualifications: (report.qualifications || []).map(prepareQualification)
  };
}

function prepareReportListItem(item) {
  return {
    ...item,
    statusText: ASSESSMENT_STATUS_TEXT[item.status] || item.status,
    stageText: STAGE_TEXT[item.stage] || item.stage,
    createdAtText: formatDateTime(item.createdAt),
    summary: (item.summary || []).map((entry) => ({ ...entry, statusText: STATUS_TEXT[entry.status] || entry.status }))
  };
}

module.exports = {
  ASSESSMENT_STATUS_TEXT,
  CRITERION_TEXT,
  PRIORITY_TEXT,
  STAGE_TEXT,
  STATUS_TEXT,
  formatActualValue,
  formatDateTime,
  prepareEvidence,
  prepareQualification,
  prepareReport,
  prepareReportListItem,
  sourceText
};
