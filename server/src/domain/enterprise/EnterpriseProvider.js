class EnterpriseProvider {
  async searchEnterprises(_options) {
    throw new Error('EnterpriseProvider.searchEnterprises 尚未实现。');
  }

  async getEnterpriseById(_options) {
    throw new Error('EnterpriseProvider.getEnterpriseById 尚未实现。');
  }
}

module.exports = { EnterpriseProvider };
