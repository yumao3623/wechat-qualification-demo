Component({
  properties: {
    state: { type: String, value: 'idle' },
    message: { type: String, value: '' },
    detail: { type: String, value: '' },
    retryText: { type: String, value: '重试' }
  },
  methods: {
    onRetry() { this.triggerEvent('retry'); }
  }
});
