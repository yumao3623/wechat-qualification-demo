const { getEnterprise, getMissingFields } = require('../../services/api');
const { loadDraft } = require('../../services/draft');
const { FIELD_LABELS, flattenProfileFields, formatRegion, formatValue } = require('../../utils/format');
const { prepareField } = require('../../utils/form');

Page({
  data: {
    enterpriseId: '', enterprise: null, state: 'loading', schemaState: 'loading',
    knownFields: [], missingFields: [], supplementFields: [], supplementedFields: [],
    errorMessage: '', requestId: '', schemaError: '', schemaRequestId: ''
  },
  onLoad(options) { this.setData({ enterpriseId: options.id || '' }); },
  onShow() { if (this.data.enterpriseId) this.loadProfile(); },
  async loadProfile() {
    this.setData({ state: 'loading', schemaState: 'loading', errorMessage: '', schemaError: '' });
    try {
      const enterprise = await getEnterprise(this.data.enterpriseId);
      const flat = flattenProfileFields(enterprise.fields);
      const draft = loadDraft(this.data.enterpriseId);
      const supplementedFields = Object.entries(draft.supplements.fields).map(([key, measurement]) => ({
        key,
        label: FIELD_LABELS[key.split('.')[0]] || key,
        valueText: formatValue(measurement),
        sourceText: '用户补充（本机草稿）'
      }));
      this.setData({
        state: 'success', enterprise: { ...enterprise, regionText: formatRegion(enterprise.registrationRegion) },
        knownFields: flat.known, missingFields: flat.missing, supplementedFields
      });
      await this.loadSchema(draft.supplements);
    } catch (error) {
      this.setData({ state: 'error', schemaState: 'idle', errorMessage: error.message || '企业画像加载失败。', requestId: error.requestId ? `请求编号：${error.requestId}` : '' });
    }
  },
  async loadSchema(supplements) {
    this.setData({ schemaState: 'loading', schemaError: '', schemaRequestId: '' });
    try {
      const schema = await getMissingFields(this.data.enterpriseId, supplements || loadDraft(this.data.enterpriseId).supplements);
      this.setData({ schemaState: schema.fields.length ? 'success' : 'empty', supplementFields: schema.fields.map(prepareField) });
    } catch (error) {
      this.setData({ schemaState: 'error', schemaError: error.message || '缺失字段计算失败。', schemaRequestId: error.requestId ? `请求编号：${error.requestId}` : '' });
    }
  },
  openSupplement() {
    wx.navigateTo({ url: `/pages/business-supplement/business-supplement?id=${encodeURIComponent(this.data.enterpriseId)}` });
  }
});
