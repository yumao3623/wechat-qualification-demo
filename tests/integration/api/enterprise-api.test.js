const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');
const { createApp } = require('../../../server/src/app');

async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await callback(baseUrl);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

async function getJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  return { response, body };
}

test('GET /api/health 返回健康状态和统一 envelope', async () => {
  await withServer(createApp(), async (baseUrl) => {
    const { response, body } = await getJson(baseUrl, '/api/health');

    assert.equal(response.status, 200);
    assert.equal(body.data.status, 'ok');
    assert.equal(body.data.enterpriseProvider, 'mock');
    assert.match(body.meta.requestId, /^req_[a-f0-9]{32}$/);
    assert.equal(response.headers.get('x-request-id'), body.meta.requestId);
    assert.equal(response.headers.get('x-powered-by'), null);
  });
});

test('GET /api/enterprises 支持搜索、无结果和详情', async () => {
  await withServer(createApp(), async (baseUrl) => {
    const search = await getJson(
      baseUrl,
      `/api/enterprises?keyword=${encodeURIComponent('星澜')}`
    );
    assert.equal(search.response.status, 200);
    assert.equal(search.body.data.items.length, 1);
    assert.equal(search.body.data.items[0].id, 'demo-a-001');
    assert.equal(search.body.data.items[0].isDemoData, true);

    const empty = await getJson(
      baseUrl,
      `/api/enterprises?keyword=${encodeURIComponent('没有匹配')}`
    );
    assert.equal(empty.response.status, 200);
    assert.deepEqual(empty.body.data.items, []);

    const detail = await getJson(baseUrl, '/api/enterprises/demo-a-001');
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.data.name, '杭州市星澜智造 Demo 有限公司');
    assert.equal(detail.body.data.provider, 'mock');
  });
});

test('GET /api/enterprises 使用不透明 cursor 分页', async () => {
  await withServer(createApp(), async (baseUrl) => {
    const first = await getJson(baseUrl, '/api/enterprises?keyword=Demo&limit=2');
    assert.equal(first.response.status, 200);
    assert.equal(first.body.data.items.length, 2);
    assert.equal(typeof first.body.data.nextCursor, 'string');

    const second = await getJson(
      baseUrl,
      `/api/enterprises?keyword=Demo&limit=2&cursor=${encodeURIComponent(first.body.data.nextCursor)}`
    );
    assert.equal(second.response.status, 200);
    assert.equal(second.body.data.items.length, 2);
    assert.equal(second.body.data.nextCursor, null);
    assert.deepEqual(
      [...first.body.data.items, ...second.body.data.items].map((item) => item.id),
      ['demo-a-001', 'demo-b-001', 'demo-c-001', 'demo-d-001']
    );
  });
});

test('企业 API 对空关键词、非法类型、limit、cursor 和 ID 返回字段错误', async (t) => {
  await withServer(createApp(), async (baseUrl) => {
    const cases = [
      ['/api/enterprises?keyword=', 'keyword'],
      ['/api/enterprises?keyword=a', 'keyword'],
      ['/api/enterprises?keyword=Demo&keyword=重复', 'keyword'],
      ['/api/enterprises?keyword=Demo&limit=0', 'limit'],
      ['/api/enterprises?keyword=Demo&limit=abc', 'limit'],
      ['/api/enterprises?keyword=Demo&cursor=not-valid', 'cursor'],
      ['/api/enterprises/not-a-demo-id', 'id']
    ];

    for (const [path, field] of cases) {
      await t.test(path, async () => {
        const { response, body } = await getJson(baseUrl, path);
        assert.equal(response.status, 400);
        assert.equal(body.error.code, 'VALIDATION_ERROR');
        assert.equal(body.error.fields[0].field, field);
        assert.equal(Object.hasOwn(body.error, 'stack'), false);
        assert.match(body.error.requestId, /^req_/);
      });
    }
  });
});

test('合法但不存在的企业 ID 返回 404 ENTERPRISE_NOT_FOUND', async () => {
  await withServer(createApp(), async (baseUrl) => {
    const { response, body } = await getJson(
      baseUrl,
      '/api/enterprises/demo-z-999'
    );

    assert.equal(response.status, 404);
    assert.equal(body.error.code, 'ENTERPRISE_NOT_FOUND');
    assert.equal(body.error.message, '未找到该企业。');
    assert.equal(Object.hasOwn(body.error, 'stack'), false);
  });
});

test('未知 Route 返回 JSON 错误且不暴露 stack', async () => {
  await withServer(createApp(), async (baseUrl) => {
    const { response, body } = await getJson(baseUrl, '/api/unknown');

    assert.equal(response.status, 404);
    assert.equal(response.headers.get('content-type').startsWith('application/json'), true);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.equal(Object.hasOwn(body.error, 'stack'), false);
  });
});

test('JSON body parser 对畸形 JSON 返回安全的 400 响应', async () => {
  await withServer(createApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/unknown`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"broken":'
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(body.error.fields, [
      { field: 'body', reason: 'JSON 格式无效' }
    ]);
    assert.equal(Object.hasOwn(body.error, 'stack'), false);
  });
});

test('Route 通过注入 Provider 工作，不依赖 Mock fixture 实现', async () => {
  const calls = [];
  const fakeProvider = {
    async searchEnterprises(options) {
      calls.push({ method: 'search', options });
      return {
        items: [
          {
            id: 'demo-injected-001',
            name: '注入 Provider Demo 企业',
            subjectCode: 'DEMO-INJECTED-001',
            registrationRegion: {
              province: '测试省',
              city: '测试市',
              district: '测试区'
            },
            industry: { code: 'DEMO-TEST', name: '测试行业' },
            legalStatus: 'active',
            isDemoData: true,
            dataLabel: '虚构 Demo 数据'
          }
        ],
        nextCursor: null
      };
    },
    async getEnterpriseById(options) {
      calls.push({ method: 'detail', options });
      return {
        id: options.enterpriseId,
        name: '注入 Provider Demo 企业',
        fields: {},
        isDemoData: true,
        dataLabel: '虚构 Demo 数据'
      };
    }
  };

  await withServer(createApp({ enterpriseProvider: fakeProvider }), async (baseUrl) => {
    const search = await getJson(baseUrl, '/api/enterprises?keyword=注入&limit=3');
    assert.equal(search.response.status, 200);
    assert.equal(search.body.data.items[0].id, 'demo-injected-001');

    const detail = await getJson(baseUrl, '/api/enterprises/demo-injected-001');
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.data.name, '注入 Provider Demo 企业');
  });

  assert.deepEqual(calls, [
    {
      method: 'search',
      options: { keyword: '注入', limit: 3, cursor: null }
    },
    {
      method: 'detail',
      options: { enterpriseId: 'demo-injected-001' }
    }
  ]);
});

test('Provider 故障映射为 503 且隐藏内部错误', async () => {
  const failingProvider = {
    async searchEnterprises() {
      const error = new Error('上游私有错误与路径');
      error.code = 'PROVIDER_UNAVAILABLE';
      throw error;
    },
    async getEnterpriseById() {
      return null;
    }
  };

  await withServer(createApp({ enterpriseProvider: failingProvider }), async (baseUrl) => {
    const { response, body } = await getJson(
      baseUrl,
      '/api/enterprises?keyword=测试'
    );

    assert.equal(response.status, 503);
    assert.equal(body.error.code, 'DEPENDENCY_UNAVAILABLE');
    assert.equal(body.error.retryable, true);
    assert.doesNotMatch(JSON.stringify(body), /上游私有错误|EnterpriseService|stack/);
  });
});
