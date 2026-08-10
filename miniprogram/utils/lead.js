const DIRECTIONS = Object.freeze([
  { value: 'high_tech_enterprise', label: '高新技术企业' },
  { value: 'tech_sme', label: '科技型中小企业' },
  { value: 'specialized_innovative', label: '专精特新' },
  { value: 'eagle_enterprise', label: '杭州新雏鹰区域示例' },
  { value: 'comprehensive', label: '综合咨询' }
]);

function validateLeadForm(form) {
  const errors = {};
  const name = (form.contactName || '').trim();
  if (name.length < 2 || name.length > 30) errors.contactName = '联系人需为 2–30 个字符';
  if (!/^1[3-9]\d{9}$/.test(form.mobile || '')) errors.mobile = '请输入合法的 11 位中国大陆手机号';
  if ((form.enterpriseName || '').trim().length < 2 || (form.enterpriseName || '').trim().length > 100) errors.enterpriseName = '企业名称需为 2–100 个字符';
  if (!Array.isArray(form.directions) || form.directions.length === 0) errors.directions = '请至少选择一个咨询方向';
  if ((form.note || '').length > 500) errors.note = '备注最多 500 个字符';
  if (form.consentAccepted !== true) errors.consentAccepted = '请明确同意本次咨询联系用途';
  return errors;
}

module.exports = { DIRECTIONS, validateLeadForm };
