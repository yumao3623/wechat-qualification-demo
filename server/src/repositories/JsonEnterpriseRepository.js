const fs = require('node:fs/promises');
const { EnterpriseRepository } = require('./EnterpriseRepository');

class JsonEnterpriseRepository extends EnterpriseRepository {
  constructor({ filePath }) {
    super();
    this.filePath = filePath;
    this.cache = null;
  }

  async findAll() {
    const enterprises = await this.#load();
    return structuredClone(enterprises);
  }

  async findById(enterpriseId) {
    const enterprises = await this.#load();
    const enterprise = enterprises.find((item) => item.id === enterpriseId);
    return enterprise ? structuredClone(enterprise) : null;
  }

  async #load() {
    if (this.cache) {
      return this.cache;
    }

    const content = await fs.readFile(this.filePath, 'utf8');
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      throw new Error('Mock 企业 fixture 必须是 JSON 数组。');
    }

    this.cache = parsed;
    return this.cache;
  }
}

module.exports = { JsonEnterpriseRepository };
