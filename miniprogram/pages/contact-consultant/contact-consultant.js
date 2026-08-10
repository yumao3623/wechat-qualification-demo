const api = require('../../services/api');
const { LEGAL_VERSIONS } = require('../../config/index');
const { createIdempotencyKey } = require('../../utils/idempotency');
const { DIRECTIONS, validateLeadForm } = require('../../utils/lead');

Page({
  data: {
    enterpriseId: '', enterpriseName: '', contactName: '', mobile: '', directions: [], note: '',
    consentAccepted: false, directionOptions: DIRECTIONS, errors: {}, state: 'idle',
    errorMessage: '', requestId: '', submittedAt: '', noticeVersion: LEGAL_VERSIONS.leadNoticeVersion
  },
  onLoad(options) {
    this.setData({ enterpriseId: options.enterpriseId || '', consentAccepted: false });
    if (options.enterpriseId) this.loadEnterprise();
  },
  async loadEnterprise() {
    try {
      const enterprise = await api.getEnterprise(this.data.enterpriseId);
      this.setData({ enterpriseName: enterprise.name });
    } catch (error) {
      this.setData({ errorMessage: error.message || '企业信息加载失败，可手动填写企业名称。' });
    }
  },
  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.pendingLead = null;
    this.setData({ [field]: event.detail.value, errors: { ...this.data.errors, [field]: '' }, errorMessage: '' });
  },
  onDirectionsChange(event) {
    this.pendingLead = null;
    this.setData({ directions: event.detail.value, errors: { ...this.data.errors, directions: '' } });
  },
  onConsentChange(event) {
    this.pendingLead = null;
    this.setData({ consentAccepted: event.detail.value.includes('accepted'), errors: { ...this.data.errors, consentAccepted: '' } });
  },
  async submit() {
    const form = {
      contactName: this.data.contactName, mobile: this.data.mobile,
      enterpriseName: this.data.enterpriseName, directions: this.data.directions,
      note: this.data.note, consentAccepted: this.data.consentAccepted
    };
    const errors = validateLeadForm(form);
    if (Object.keys(errors).length) { this.setData({ errors }); return; }
    const body = {
      enterprise: {
        ...(this.data.enterpriseId ? { enterpriseId: this.data.enterpriseId } : {}),
        name: this.data.enterpriseName.trim()
      },
      contactName: this.data.contactName.trim(),
      mobile: this.data.mobile,
      directions: this.data.directions,
      note: this.data.note.trim(),
      consent: {
        accepted: true,
        noticeVersion: LEGAL_VERSIONS.leadNoticeVersion,
        agreedAt: new Date().toISOString(),
        purpose: LEGAL_VERSIONS.leadPurpose
      }
    };
    this.pendingLead ||= { body, idempotencyKey: createIdempotencyKey('lead') };
    this.setData({ state: 'loading', errorMessage: '', requestId: '' });
    try {
      const result = await api.submitLead(this.pendingLead.body, this.pendingLead.idempotencyKey);
      this.setData({ state: 'success', submittedAt: result.submittedAt });
    } catch (error) {
      this.setData({ state: 'error', errorMessage: error.message || '咨询需求未提交，请重试。', requestId: error.requestId ? `请求编号：${error.requestId}` : '' });
    }
  },
  retry() { this.submit(); },
  back() { wx.navigateBack(); }
});
