const { LEGAL_VERSIONS } = require('../../config/index');

Component({
  properties: {
    title: { type: String, value: '发起诊断前请阅读' },
    description: {
      type: String,
      value: '将使用当前虚构企业画像与您主动补充的数据生成并保存 Demo 预评估报告。Demo Auth 不等同生产微信认证。'
    },
    confirmText: { type: String, value: '同意并发起诊断' },
    retryText: { type: String, value: '使用同一请求重试' },
    cancelText: { type: String, value: '暂不发起' }
  },
  data: {
    visible: false,
    checked: false,
    busy: false,
    busyText: '',
    errorMessage: '',
    versions: LEGAL_VERSIONS
  },
  methods: {
    noop() {},
    open() {
      this.setData({ visible: true, checked: false, busy: false, busyText: '', errorMessage: '' });
    },
    onCheckChange(event) {
      this.setData({ checked: event.detail.value.includes('accepted'), errorMessage: '' });
    },
    confirm() {
      if (this.data.busy) return;
      if (!this.data.checked) {
        this.setData({ errorMessage: '请先阅读并勾选同意上述文件。' });
        return;
      }
      this.triggerEvent('confirm', { agreedAt: new Date().toISOString() });
    },
    cancel() {
      if (this.data.busy) return;
      this.setData({ visible: false, checked: false, errorMessage: '' });
      this.triggerEvent('cancel');
    },
    openLegal(event) {
      wx.navigateTo({ url: `/pages/legal/legal?type=${event.currentTarget.dataset.type}` });
    },
    setBusy(text) {
      this.setData({ busy: true, busyText: text, errorMessage: '' });
    },
    setError(message) {
      this.setData({ busy: false, busyText: '', errorMessage: message });
    },
    closeAfterSuccess() {
      this.setData({ visible: false, checked: false, busy: false, busyText: '', errorMessage: '' });
    },
    retry() { this.triggerEvent('retry'); }
  }
});
