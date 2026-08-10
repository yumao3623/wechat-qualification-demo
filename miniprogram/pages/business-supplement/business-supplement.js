const { getMissingFields } = require('../../services/api');
const { loadDraft, saveDraft } = require('../../services/draft');
const { buildSupplements, hydrateRawValues, prepareField } = require('../../utils/form');

Page({
  data: {
    enterpriseId: '', state: 'loading', fields: [], rawValues: {}, errors: {},
    errorMessage: '', requestId: '', saveMessage: '', savedCount: 0
  },
  onLoad(options) {
    this.setData({ enterpriseId: options.id || '' });
    this.loadSchema();
  },
  async loadSchema() {
    const draft = loadDraft(this.data.enterpriseId);
    this.setData({ state: 'loading', errorMessage: '', requestId: '', rawValues: hydrateRawValues(draft.supplements) });
    try {
      const schema = await getMissingFields(this.data.enterpriseId, draft.supplements);
      this.setData({
        state: schema.fields.length ? 'success' : 'empty',
        fields: schema.fields.map(prepareField),
        savedCount: Object.keys(draft.supplements.fields).length
      });
    } catch (error) {
      this.setData({ state: 'error', errorMessage: error.message || '动态字段加载失败。', requestId: error.requestId ? `请求编号：${error.requestId}` : '' });
    }
  },
  onValueInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ rawValues: { ...this.data.rawValues, [key]: event.detail.value }, errors: { ...this.data.errors, [key]: '' }, saveMessage: '' });
  },
  onBooleanChange(event) {
    const key = event.currentTarget.dataset.key;
    const value = event.detail.value === 'true';
    this.setData({ rawValues: { ...this.data.rawValues, [key]: value }, errors: { ...this.data.errors, [key]: '' }, saveMessage: '' });
  },
  onEnumChange(event) {
    const key = event.currentTarget.dataset.key;
    const field = this.data.fields.find((item) => item.key === key);
    const value = field.enumValues[Number(event.detail.value)];
    this.setData({ rawValues: { ...this.data.rawValues, [key]: value }, errors: { ...this.data.errors, [key]: '' }, saveMessage: '' });
  },
  async saveAndRecalculate() {
    const built = buildSupplements(this.data.fields, this.data.rawValues);
    if (Object.keys(built.errors).length) {
      this.setData({ errors: built.errors, saveMessage: '请修正标记的字段后重试。' });
      return;
    }
    if (Object.keys(built.supplements.fields).length === 0) {
      this.setData({ saveMessage: '请至少填写或选择一项后再保存。' });
      return;
    }
    const existing = loadDraft(this.data.enterpriseId);
    const supplements = { fields: { ...existing.supplements.fields, ...built.supplements.fields } };
    this.setData({ state: 'loading', errors: {}, saveMessage: '' });
    try {
      const schema = await getMissingFields(this.data.enterpriseId, supplements);
      saveDraft(this.data.enterpriseId, supplements);
      this.setData({
        state: schema.fields.length ? 'success' : 'empty',
        fields: schema.fields.map(prepareField),
        savedCount: Object.keys(supplements.fields).length,
        saveMessage: schema.fields.length ? `已保存，Backend 重新计算后剩余 ${schema.fields.length} 项。` : '关键补充数据已保存，Backend 确认当前无剩余缺失项。'
      });
      wx.showToast({ title: '草稿已保存', icon: 'success' });
    } catch (error) {
      const fieldErrors = {};
      for (const item of error.fields || []) {
        const matched = this.data.fields.find((field) => item.field.includes(field.key));
        if (matched) fieldErrors[matched.key] = item.reason;
      }
      this.setData({
        state: 'success',
        errors: fieldErrors,
        saveMessage: error.message || '服务端校验未通过，请检查填写口径。'
      });
    }
  },
  backToProfile() { wx.navigateBack(); }
});
