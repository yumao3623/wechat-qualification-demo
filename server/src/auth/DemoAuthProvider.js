const { sha256 } = require('../utils/ids');

class DemoAuthProvider {
  constructor() {
    this.authMode = 'demo';
  }

  async exchangeCode({ code }) {
    return {
      externalSubject: `demo_subject_${sha256(code).slice(0, 24)}`,
      authCodeHash: sha256(`demo-code:${code}`),
      authMode: this.authMode
    };
  }
}

module.exports = { DemoAuthProvider };
