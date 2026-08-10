const { EnterpriseProvider } = require('./EnterpriseProvider');

function encodeCursor(offset) {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  if (cursor === null || cursor === undefined || cursor === '') {
    return 0;
  }

  try {
    const value = Buffer.from(cursor, 'base64url').toString('utf8');

    if (!/^\d+$/.test(value)) {
      return null;
    }

    return Number(value);
  } catch {
    return null;
  }
}

function toSummary(enterprise) {
  return {
    id: enterprise.id,
    name: enterprise.name,
    subjectCode: enterprise.subjectCode,
    registrationRegion: {
      province: enterprise.registrationRegion.province,
      city: enterprise.registrationRegion.city,
      district: enterprise.registrationRegion.district
    },
    industry: structuredClone(enterprise.industry),
    legalStatus: enterprise.legalStatus,
    isDemoData: enterprise.isDemoData,
    dataLabel: enterprise.dataLabel
  };
}

class MockEnterpriseProvider extends EnterpriseProvider {
  constructor({ repository }) {
    super();
    this.repository = repository;
  }

  async searchEnterprises({ keyword, limit = 10, cursor = null, signal } = {}) {
    signal?.throwIfAborted();

    const offset = decodeCursor(cursor);
    if (offset === null) {
      const error = new Error('cursor 无效。');
      error.code = 'INVALID_CURSOR';
      throw error;
    }

    const normalizedKeyword = keyword.trim().toLowerCase();
    const enterprises = await this.repository.findAll();
    signal?.throwIfAborted();

    const matches = enterprises.filter((enterprise) => {
      const searchableText = [
        enterprise.name,
        enterprise.subjectCode,
        enterprise.registrationRegion.province,
        enterprise.registrationRegion.city,
        enterprise.registrationRegion.district,
        enterprise.industry.name,
        enterprise.scenario
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedKeyword);
    });

    const items = matches.slice(offset, offset + limit).map(toSummary);
    const nextOffset = offset + items.length;

    return {
      items,
      nextCursor: nextOffset < matches.length ? encodeCursor(nextOffset) : null
    };
  }

  async getEnterpriseById({ enterpriseId, signal } = {}) {
    signal?.throwIfAborted();
    const enterprise = await this.repository.findById(enterpriseId);
    signal?.throwIfAborted();
    return enterprise;
  }
}

module.exports = {
  MockEnterpriseProvider,
  decodeCursor,
  encodeCursor
};
