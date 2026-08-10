const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  MockEnterpriseProvider
} = require('../../../server/src/domain/enterprise/MockEnterpriseProvider');
const {
  JsonEnterpriseRepository
} = require('../../../server/src/repositories/JsonEnterpriseRepository');

const fixturePath = path.resolve(
  __dirname,
  '../../../server/data/fixtures/mock-enterprises.json'
);

function createProvider() {
  return new MockEnterpriseProvider({
    repository: new JsonEnterpriseRepository({ filePath: fixturePath })
  });
}

function assertMeasurement(measurement) {
  assert.notEqual(measurement, null);
  assert.equal(Object.hasOwn(measurement, 'value'), true);
  assert.equal(typeof measurement.unit, 'string');
  assert.equal(typeof measurement.period, 'object');
  assert.equal(measurement.source.sourceType, 'demo_mock');
  assert.equal(measurement.source.sourceLabel, '虚构 Demo 企业画像');
  assert.equal(measurement.source.confidence, 'demo');
}

function latestValue(field) {
  return Array.isArray(field) ? field.at(-1).value : field.value;
}

test('MockEnterpriseProvider 按关键词返回 canonical 摘要和 Demo 标识', async () => {
  const provider = createProvider();
  const result = await provider.searchEnterprises({ keyword: '星澜', limit: 10 });

  assert.equal(result.items.length, 1);
  assert.deepEqual(result.items[0], {
    id: 'demo-a-001',
    name: '杭州市星澜智造 Demo 有限公司',
    subjectCode: 'DEMO-A-001',
    registrationRegion: {
      province: '浙江省',
      city: '杭州市',
      district: '余杭区'
    },
    industry: { code: 'DEMO-I65', name: '软件和信息技术服务业' },
    legalStatus: 'active',
    isDemoData: true,
    dataLabel: '虚构 Demo 数据'
  });
  assert.equal(result.nextCursor, null);
});

test('MockEnterpriseProvider 搜索无结果时返回空数组', async () => {
  const provider = createProvider();
  const result = await provider.searchEnterprises({ keyword: '完全不存在', limit: 10 });

  assert.deepEqual(result, { items: [], nextCursor: null });
});

test('MockEnterpriseProvider 返回企业详情且不会暴露可变 fixture 引用', async () => {
  const provider = createProvider();
  const first = await provider.getEnterpriseById({ enterpriseId: 'demo-a-001' });

  assert.equal(first.id, 'demo-a-001');
  assert.equal(first.provider, 'mock');
  assert.equal(first.isDemoData, true);
  assert.equal(first.fetchedAt, '2026-08-10T00:00:00.000Z');
  assertMeasurement(first.fields.employeeCount);

  first.name = '被测试修改';
  const second = await provider.getEnterpriseById({ enterpriseId: 'demo-a-001' });
  assert.equal(second.name, '杭州市星澜智造 Demo 有限公司');
});

test('MockEnterpriseProvider 对不存在企业返回 null', async () => {
  const provider = createProvider();
  const enterprise = await provider.getEnterpriseById({
    enterpriseId: 'demo-z-999'
  });

  assert.equal(enterprise, null);
});

test('A/B/C/D 四个 Scenario 正确加载且数据关系一致', async () => {
  const repository = new JsonEnterpriseRepository({ filePath: fixturePath });
  const enterprises = await repository.findAll();

  assert.equal(enterprises.length, 4);
  assert.deepEqual(
    enterprises.map((item) => item.scenario),
    ['A', 'B', 'C', 'D']
  );
  assert.equal(new Set(enterprises.map((item) => item.id)).size, 4);
  assert.equal(new Set(enterprises.map((item) => item.subjectCode)).size, 4);

  for (const enterprise of enterprises) {
    assert.match(enterprise.id, /^demo-[a-d]-001$/);
    assert.match(enterprise.subjectCode, /^DEMO-[A-D]-001$/);
    assert.match(enterprise.name, /Demo/);
    assert.equal(enterprise.isDemoData, true);
    assert.equal(enterprise.dataLabel, '虚构 Demo 数据');
    assert.equal(enterprise.provider, 'mock');

    for (const field of Object.values(enterprise.fields)) {
      if (field === null) continue;
      if (Array.isArray(field)) {
        field.forEach(assertMeasurement);
      } else {
        assertMeasurement(field);
      }
    }

    const employeeCount = enterprise.fields.employeeCount;
    const rdEmployeeCount = enterprise.fields.rdEmployeeCount;
    if (employeeCount && rdEmployeeCount) {
      assert.ok(rdEmployeeCount.value <= employeeCount.value);
    }

    const mainRevenue = enterprise.fields.mainBusinessRevenue;
    const operatingRevenue = enterprise.fields.operatingRevenue;
    if (mainRevenue && operatingRevenue) {
      assert.ok(latestValue(mainRevenue) <= latestValue(operatingRevenue));
    }

    const assets = enterprise.fields.totalAssets;
    const liabilities = enterprise.fields.totalLiabilities;
    if (assets && liabilities) {
      assert.ok(liabilities.value <= assets.value);
    }
  }

  const scenarioD = enterprises.find((item) => item.scenario === 'D');
  assert.equal(scenarioD.registrationRegion.city, '宁波市');
});

test('fixture 严格区分 0、false、null 与字段不存在', async () => {
  const repository = new JsonEnterpriseRepository({ filePath: fixturePath });
  const scenarioB = await repository.findById('demo-b-001');
  const scenarioC = await repository.findById('demo-c-001');

  assert.equal(scenarioC.fields.rdEmployeeCount.value, 0);
  assert.equal(scenarioC.fields.businessAbnormal.value, false);
  assert.equal(scenarioB.fields.rdEmployeeCount, null);
  assert.equal(Object.hasOwn(scenarioB.fields, 'rdExpense'), false);
  assert.equal(Object.hasOwn(scenarioB.fields, 'techEmployeeCount'), false);
});
