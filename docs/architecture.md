# 企业政府资质预评估微信小程序 Demo｜技术架构与接口契约

> 文档版本：Phase 8 / v1.6
> 规格日期：2026-08-10  
> 当前边界：Phase 8 最终集成与验收已完成；Auth、Session、Consent、Diagnosis、Report、Lead、Rule Engine 与本地只读 Admin 契约未改变。

## 1. 架构目标

- 单进程、依赖少、可本地演示，不引入微服务、队列或复杂权限系统。
- UI、HTTP、领域规则、企业数据和持久化边界清晰。
- 无企查查 Key、微信 AppSecret 或生产数据库时仍可运行完整 Demo。
- 每个判断可追溯到字段来源、统计期和规则版本。
- Demo 与生产模式的安全能力和数据可信度明确区分。

## 2. 系统架构

```text
原生微信小程序 ── REST/JSON ── Express API ── Application Services
       │                                  │
       │                                  ├─ AuthProvider / SessionService
       │                                  ├─ EnterpriseProvider
       │                                  │    └─ MockEnterpriseProvider（默认）
       │                                  ├─ DynamicFieldService
       │                                  ├─ QualificationEngine
       │                                  │    ├─ HighTechEnterpriseEvaluator
       │                                  │    ├─ TechSMEEvaluator
       │                                  │    ├─ SpecializedInnovativeEvaluator
       │                                  │    └─ EagleEnterpriseEvaluator
       │                                  ├─ AssessmentService / ReportGenerator
       │                                  └─ LeadService
       │
       └─ 本地草稿（TTL）                   Repository interfaces ── JSON files

静态 Admin ──────────────────────── 同一 Express 进程的只读 Admin API
```

依赖方向：Route → Application Service → Domain/Provider/Repository interface。Evaluator 不得依赖 Express、微信 API、Repository、文件系统或全局时间。

## 3. 目标目录

```text
.
├── README.md
├── package.json
├── .env.example
├── project.config.json
├── miniprogram/
│   ├── app.js / app.json / app.wxss
│   ├── config/
│   ├── components/
│   ├── pages/
│   ├── services/             # API/Auth/Draft 客户端，不放政策判断
│   └── utils/                # 可测试纯函数
├── server/
│   ├── src/
│   │   ├── app.js / server.js / config.js
│   │   ├── routes/           # 参数解析与响应映射
│   │   ├── middleware/       # request ID、鉴权、错误处理
│   │   ├── services/         # 用例编排
│   │   ├── domain/
│   │   │   ├── enterprise/  # Provider contract + implementations
│   │   │   ├── qualification/
│   │   │   ├── dynamic-form/
│   │   │   └── report/
│   │   ├── repositories/     # fixture/runtime interface + JSON implementation
│   │   ├── auth/             # DemoAuthProvider；生产 Provider 说明/预留
│   │   ├── config/           # 集中的法律版本常量
│   │   └── utils/            # clock、ID、hash 与稳定序列化
│   ├── data/
│   │   ├── fixtures/         # Git 跟踪的虚构数据
│   │   └── runtime/          # Git 忽略的运行数据
│   └── public/admin/         # 原生 HTML/CSS/JS
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── docs/
```

## 4. 技术选择

| 层 | 选择 | 原因/边界 |
| --- | --- | --- |
| 小程序 | 原生 WXML/WXSS/JavaScript + 官方 API | 直接检查登录和隐私时序；不引入跨端框架 |
| API | Node.js 20 LTS + Express + REST | 单进程、启动简单；仅必要依赖 |
| 数据 | JSON Repository | Demo 单进程低并发；原子替换写入，接口允许换数据库 |
| Admin | 原生静态 HTML/CSS/JS | 只读展示，不单独构建 |
| 测试 | Node.js 内置 test runner 为主 | 覆盖领域纯函数、Provider、Session 和 API |

## 5. 统一值与来源模型

任何影响规则的字段不得只保存裸值。标准字段值：

```json
{
  "value": 12000000,
  "unit": "CNY",
  "period": { "type": "fiscal_year", "year": 2025 },
  "source": {
    "sourceType": "demo_mock",
    "sourceLabel": "虚构 Demo 企业画像",
    "observedAt": "2026-08-10T00:00:00.000Z",
    "confidence": "demo"
  }
}
```

`sourceType`：`demo_mock | provider | user | derived | official_platform | official_registry`。派生值还须保存 `derivedFrom` 字段路径和公式版本。`0`/`false` 为已知值；只有 `null`、字段不存在、类型错误或统计期无效才算缺失。

## 6. Enterprise Provider 接口契约

### 6.1 接口

```text
EnterpriseProvider.searchEnterprises({ keyword, limit, cursor, signal })
  -> Promise<{ items: EnterpriseSummary[], nextCursor: string|null }>

EnterpriseProvider.getEnterpriseById({ enterpriseId, signal })
  -> Promise<EnterpriseProfile|null>
```

约束：

- `keyword` 已标准化后 2–50 字符；`limit` 1–20，默认 10。
- Provider 不得把供应商原始结构透传到 UI。
- 找不到详情返回 `null`；上游超时/限流/不可用抛出可分类的 ProviderError。
- 每个字段有 provenance；不得把无法获取的字段伪造为 `0` 或 `false`。
- `MockEnterpriseProvider` 必须 `isDemoData=true`，使用 `DEMO-*` 编号和虚构名称。
- 禁止网页爬取；未来 Qichacha Provider 仅通过正式授权 API 实现。

### 6.2 EnterpriseSummary

```json
{
  "id": "demo-a-001",
  "name": "杭州市星澜智造 Demo 有限公司",
  "subjectCode": "DEMO-A-001",
  "registrationRegion": { "province": "浙江省", "city": "杭州市", "district": "余杭区" },
  "industry": { "code": "DEMO-I65", "name": "软件和信息技术服务业" },
  "legalStatus": "active",
  "isDemoData": true,
  "dataLabel": "虚构 Demo 数据"
}
```

### 6.3 EnterpriseProfile

```json
{
  "id": "demo-a-001",
  "name": "杭州市星澜智造 Demo 有限公司",
  "subjectCode": "DEMO-A-001",
  "legalRepresentative": "演示用户甲",
  "establishedAt": "2022-06-01",
  "registeredCapital": { "value": 10000000, "unit": "CNY" },
  "registrationRegion": { "country": "CN", "province": "浙江省", "city": "杭州市", "district": "余杭区" },
  "legalStatus": "active",
  "industry": { "code": "DEMO-I65", "name": "软件和信息技术服务业" },
  "fields": {},
  "isDemoData": true,
  "dataLabel": "虚构 Demo 数据",
  "fetchedAt": "2026-08-10T00:00:00.000Z",
  "provider": "mock"
}
```

`fields` 使用第 5 节统一值模型，允许缺失。单一时点字段保存一个标准值对象；需要保留多个年度的同名指标（例如近三年 `salesRevenue`、`rdExpense`）时，保存按年度升序排列的标准值对象数组，数组中的每个元素都必须各自携带 `value/unit/period/source`。Provider 不能断言财务、研发、知识产权关联或政策合规结论。

### 6.4 Provider 错误

| code | 含义 | HTTP 映射 |
| --- | --- | --- |
| `PROVIDER_TIMEOUT` | 上游超时 | 503 |
| `PROVIDER_UNAVAILABLE` | 上游不可用 | 503 |
| `PROVIDER_RATE_LIMITED` | 上游限流 | 503（可带 retryAfter） |
| `PROVIDER_BAD_RESPONSE` | 上游结构异常 | 502 |
| `ENTERPRISE_NOT_FOUND` | ID 不存在 | 404（由 service 映射） |

## 7. Qualification Engine 与动态字段契约

### 7.1 Engine

```text
QualificationEngine.evaluate(profile, context) -> QualificationResult[4]
QualificationEngine.getMissingFieldSchema(profile, context) -> MissingFieldSchema
```

`context` 必含 `assessmentDate`、`targetApplicationYear`、`ruleSetVersion`、`jurisdictionPreference` 和用户补充值。时间由调用方显式传入，便于测试。

### 7.2 Evaluator 输出

```json
{
  "qualificationType": "high_tech_enterprise",
  "displayName": "高新技术企业",
  "jurisdiction": "CN",
  "status": "opportunity",
  "summary": "硬性数值项未见明显缺口，仍有定性条件需人工核验。",
  "criteria": [],
  "evidence": [],
  "missingFields": [],
  "gaps": [],
  "actions": [],
  "ruleVersion": {
    "id": "HTE-2016-32-195@2026-08-10",
    "effectiveDate": "2016-01-01",
    "checkedAt": "2026-08-10",
    "jurisdiction": "CN_EXCEPT_HK_MACAU_TW",
    "sources": [],
    "simplifications": []
  }
}
```

criterion `result` 只允许 `met | unmet | unknown | manual_review | not_applicable`。总体 `status` 只允许 `promising | opportunity | needs_data | not_met | not_applicable`。字段和人工边界以 `docs/PRD.md` 第 13 节为准。

### 7.3 MissingFieldSchema

```json
{
  "enterpriseId": "demo-b-001",
  "schemaVersion": "1.0",
  "generatedAt": "2026-08-10T00:00:00.000Z",
  "fields": [
    {
      "key": "rdExpense.2025",
      "label": "2025 年研发费用",
      "type": "money",
      "unit": "CNY",
      "period": { "type": "fiscal_year", "year": 2025 },
      "requiredFor": ["H-06", "T-07", "S-05", "E-03"],
      "validation": { "min": 0, "max": 1000000000000 },
      "sensitivity": "business_sensitive",
      "blocking": true,
      "helpText": "请按对应政策口径填写；用户填写不等于审计确认。"
    }
  ]
}
```

schema 合并相同字段、保留全部 `requiredFor`，按阻塞性和填写成本排序。定性专家判断不变成强制长表单，而生成 `manual_review` evidence/action。

### 7.4 Phase 3 实现细化

- `QualificationEngine.buildAssessmentInput(profile, context)` 使用纯函数合并补充数据，`evaluate` 恰好调用四个 Evaluator，`getMissingFieldSchema` 合并各 Evaluator 声明的字段需求。
- 补充字段使用 `sourceType="user"`（遵守第 5 节枚举）、`sourceLabel="user_supplied"` 和 `origin="user_supplied"`；统计年度必须与字段 key 一致。
- 用户补充值与已有非空 Provider/Mock 值冲突时，保留原值与两个来源到 `fieldConflicts[]`，标记 `resolution="manual_review"`，不静默覆盖。
- 动态字段 key 采用 `fieldName.year`（例如 `rdExpense.2025`）；实际合并后仍按第 6.3 节保存为单值或按年升序数组。
- 汇总优先级严格为 `not_applicable → not_met → needs_data → opportunity → promising`。`manual_review` 是 criterion/evidence/gap 结果，不新增为总体 status。
- A/D fixture 在 Phase 3 补齐了三年境内研发费用、高新收入分母与科技型中小企业研发评分口径，所有来源仍为 `demo_mock`，未伪装官方/商业数据。

## 8. REST 通用契约

### 8.1 基础规则

- Base path：`/api`；JSON 使用 UTF-8；时间为 ISO 8601 UTC；金额为整数分或明确单位的数值，本 Demo 统一在字段中携带 `unit`。
- 客户端为每个变更请求发送 `X-Idempotency-Key`（1–64 字符）。
- 受保护请求：`Authorization: Bearer <sessionToken>`。
- 服务器返回 `X-Request-Id`；客户端错误页只展示该 ID，不展示内部堆栈。
- 分页：`limit` 1–50；`cursor` 为不透明字符串。

### 8.2 成功与错误封装

```json
{ "data": {}, "meta": { "requestId": "req_..." } }
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "提交内容有误，请检查后重试。",
    "fields": [{ "field": "keyword", "reason": "长度应为 2–50 个字符" }],
    "requestId": "req_...",
    "retryable": false
  }
}
```

| HTTP | code | 典型场景 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 字段、类型、长度、期间错误 |
| 401 | `AUTH_REQUIRED` / `SESSION_INVALID` / `SESSION_EXPIRED` | 缺 Session、无效或过期 |
| 403 | `FORBIDDEN` | 访问他人诊断/报告、非本地 Admin |
| 404 | `ENTERPRISE_NOT_FOUND` / `ASSESSMENT_NOT_FOUND` / `REPORT_NOT_FOUND` | 资源不存在 |
| 409 | `AGREEMENT_REQUIRED` / `REPORT_NOT_READY` / `STATE_CONFLICT` | 前置条件或状态冲突 |
| 422 | `BUSINESS_RULE_INPUT_INVALID` | 值存在但单位/期间/逻辑关系错误 |
| 429 | `RATE_LIMITED` | 基础频率限制 |
| 500 | `INTERNAL_ERROR` | 已屏蔽内部信息 |
| 503 | `DEPENDENCY_UNAVAILABLE` | Provider/依赖暂不可用 |

## 9. REST API 契约

### 9.1 Endpoint 总表

| Method | Path | 登录 | 幂等 | 用途 |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | 否 | 不适用 | Phase 2 健康检查 |
| GET | `/api/enterprises?keyword=&limit=&cursor=` | 否 | 不适用 | 搜索企业 |
| GET | `/api/enterprises/:id` | 否 | 不适用 | 企业详情/画像 |
| POST | `/api/auth/login` | 否 | 是 | 微信 code 换 Demo Session |
| GET | `/api/auth/session` | 是 | 不适用 | 当前 Session |
| DELETE | `/api/auth/session` | 是 | 是 | 退出登录 |
| POST | `/api/assessments/missing-fields` | 否 | 否（纯计算） | 计算动态字段 |
| POST | `/api/assessments` | 是 | 是（强制） | 创建诊断 |
| GET | `/api/assessments/:id/status` | 是 | 不适用 | 查询状态和阶段 |
| GET | `/api/assessments/:id/report` | 是 | 不适用 | 按诊断获取报告（兼容进度流） |
| GET | `/api/reports?limit=&cursor=` | 是 | 不适用 | 当前用户报告列表 |
| GET | `/api/reports/:id` | 是 | 不适用 | 报告完整详情 |
| POST | `/api/leads` | 否 | 是（强制） | 提交顾问线索 |
| GET | `/api/admin/assessments` | 本地限制 | 不适用 | Admin 诊断列表 |
| GET | `/api/admin/leads` | 本地限制 | 不适用 | Admin 线索列表 |

### 9.2 企业

`GET /api/enterprises?keyword=星澜&limit=10`

- 200：`{ items: EnterpriseSummary[], nextCursor }`；无结果返回 200 + 空数组，不返回 404。
- 错误：400 `VALIDATION_ERROR`、503 `DEPENDENCY_UNAVAILABLE`。

`GET /api/enterprises/demo-a-001`

- 200：`EnterpriseProfile`。
- 错误：404 `ENTERPRISE_NOT_FOUND`、503。

### 9.3 登录与 Session

`POST /api/auth/login`

```json
{ "code": "wx-login-code", "client": { "platform": "wechat-miniprogram", "version": "0.1.0" } }
```

201：

```json
{
  "data": {
    "token": "opaque-random-token-returned-once",
    "session": {
      "id": "ses_01...",
      "userId": "demo_user_...",
      "authMode": "demo",
      "createdAt": "2026-08-10T01:00:00.000Z",
      "expiresAt": "2026-08-10T13:00:00.000Z"
    }
  },
  "meta": { "requestId": "req_..." }
}
```

- `code` 1–256 字符、单次使用语义；Demo 只验证非空并明确 `authMode=demo`。
- 幂等键相同且请求一致返回同一创建结果；不同 payload 返回 409。
- 错误：400、409 `STATE_CONFLICT`、503（生产微信交换失败）。

`GET /api/auth/session` 返回不含 token 的 Session；`DELETE` 成功返回 204，服务端吊销 Session，客户端清除 token/草稿。

### 9.4 动态字段

`POST /api/assessments/missing-fields`

```json
{
  "enterpriseId": "demo-b-001",
  "supplements": { "fields": {} },
  "context": { "assessmentDate": "2026-08-10", "targetApplicationYear": 2026 }
}
```

200 返回第 7.3 节 schema，同时可返回 `manualReviewRequirements[]`。错误：404 企业、422 单位/期间/逻辑关系。

### 9.5 创建诊断

`POST /api/assessments`

Headers：有效 Bearer Session + `X-Idempotency-Key`。

```json
{
  "enterpriseId": "demo-a-001",
  "supplements": { "fields": {} },
  "context": { "targetApplicationYear": 2026 },
  "agreement": {
    "accepted": true,
    "userAgreementVersion": "2026-08-10",
    "privacyPolicyVersion": "2026-08-10",
    "disclaimerVersion": "2026-08-10",
    "agreedAt": "2026-08-10T01:00:00.000Z",
    "agreementSource": "assessment-dialog"
  }
}
```

201：

```json
{
  "data": {
    "assessmentId": "asm_01...",
    "status": "pending",
    "stage": "prepare_enterprise_data",
    "createdAt": "2026-08-10T01:00:01.000Z",
    "links": { "status": "/api/assessments/asm_01.../status" }
  },
  "meta": { "requestId": "req_..." }
}
```

后端必须校验 Session、企业、补充字段、协议三版本、时间合理性和来源。缺协议返回 409 `AGREEMENT_REQUIRED`；未登录 401；相同幂等键返回原诊断（200/201 语义保持可预测），不得重复创建。

#### 9.5.1 Phase 6 前端准确调用顺序

Consent **包含在 `POST /api/assessments` 中提交**。当前不存在、也不计划为此流程新增独立 Consent endpoint；后端在创建诊断用例内部校验并保存独立 Consent 记录及 Assessment 协议快照，避免产生“已同意但没有对应诊断”的额外前端状态。

Phase 6 应严格按以下顺序调用：

1. 打开协议弹窗时本地设置 `checked=false`，此时不调用登录或后端 Consent API。
2. 用户勾选并确认后，前端立即生成 `agreedAt = new Date().toISOString()`，并从前端集中配置读取与后端一致的三个协议版本；未勾选、拒绝或关闭时停止。
3. 调用 `wx.login` 获取一次性 code。
4. 调用 `POST /api/auth/login`，发送独立的 `X-Idempotency-Key` 和 `{ code, client }`；成功后保存返回的 Demo Session token。
5. 调用 `POST /api/assessments`，发送 `Authorization: Bearer <sessionToken>`、新的诊断 `X-Idempotency-Key`，以及本节完整 request body。`agreement.accepted` 由 Phase 6 明确发送为 `true`。
6. 创建成功后使用返回的 `assessmentId` 轮询 `GET /api/assessments/:id/status`；ready 后读取 `/api/assessments/:id/report`。

登录成功但诊断请求失败时，前端使用相同诊断幂等键和相同 payload 重试，不单独补交 Consent。协议版本变化后必须重新打开弹窗并取得新同意快照。

### 9.6 状态和报告

`GET /api/assessments/:id/status`

```json
{
  "data": {
    "assessmentId": "asm_01...",
    "status": "processing",
    "stage": "evaluate_tech_sme",
    "stageIndex": 4,
    "stageCount": 8,
    "updatedAt": "2026-08-10T01:00:04.000Z",
    "reportId": null,
    "error": null
  },
  "meta": { "requestId": "req_...", "pollAfterMs": 1000 }
}
```

- 只允许所属用户访问；状态单向流转。
- `failed` 的 `error` 只包含稳定错误码和用户文案。
- `GET /api/assessments/:id/report` 在 ready 时 200；未 ready 返回 409 `REPORT_NOT_READY` 并包含当前状态链接。

`GET /api/reports` 返回当前用户的摘要列表；`GET /api/reports/:id` 返回完整 Report。访问他人资源统一 404 或 403 的策略需固定，Demo 采用 404 减少资源枚举。

Phase 4 的报告列表以当前用户的 Assessment 为主记录并关联已生成 Report，因此空列表以及 `pending/processing/ready/failed` 均能被真实表达；`summary` 只在 Report 已持久化后出现。

### 9.7 顾问线索

`POST /api/leads`

```json
{
  "enterprise": { "enterpriseId": "demo-a-001", "name": "杭州市星澜智造 Demo 有限公司" },
  "contactName": "演示联系人",
  "mobile": "13800000000",
  "directions": ["high_tech_enterprise", "specialized_innovative"],
  "note": "希望了解材料准备顺序",
  "consent": {
    "accepted": true,
    "noticeVersion": "lead-privacy-2026-08-10",
    "agreedAt": "2026-08-10T01:05:00.000Z",
    "purpose": "consultant_contact"
  }
}
```

- 游客可提交；姓名 2–30、手机号 11 位 Demo 校验、方向至少 1 项、备注≤500。
- `accepted` 必须为 true，版本/时间完整；否则 400 `VALIDATION_ERROR`。
- 201 返回 `{ leadId, status: "submitted", submittedAt }`；文案层显示“咨询需求已提交”。

### 9.8 Admin

- 只监听本机或由明确配置启用；远程请求返回 403。
- `/api/admin/assessments` 返回企业、诊断 ID/状态/创建时间/报告状态。
- `/api/admin/leads` 默认返回脱敏手机号；不提供编辑、导出、删除或派单 API。
- UI 必须标明本地 Demo，不把限制方案描述为生产鉴权。
- 实际响应只暴露展示所需字段。诊断项为 `assessmentId`、最小企业摘要、`status/stage`、创建/更新时间、`reportId/reportStatus`；线索项为 `leadId`、最小企业摘要、联系人、`maskedMobile`、方向、状态与提交时间。
- 禁止返回 `userId`、`sessionId`、token/hash、幂等/request hash、Consent/Agreement、输入快照、完整手机号或内部错误。
- `/admin/` 静态资源与两个 Admin API 共用 `adminLocalOnly`；依据 TCP 远端地址接受 IPv4/IPv6 loopback，其他地址返回统一 403 envelope。该限制不信任转发头，也不等同正式身份鉴权。

## 10. Session/Auth 流程

### 10.1 状态与时序

```text
guest
  ├─ 浏览游客页面（无 auth 调用）
  ├─ 报告 Tab 点击登录 → AgreementDialog（checked=false）
  │                         ├─ 关闭/拒绝/未勾选 → guest
  │                         └─ 明确同意并确认 ─┐
  └─ 诊断协议明确同意并确认 ─────────────────┴→ wx.login_pending
                                      ├─ fail → guest/recoverable_error
                                      └─ code → POST /auth/login
                                                  ├─ fail → guest/recoverable_error
                                                  └─ session_active
                                                        ├─ 创建诊断
                                                        ├─ 查看本人报告
                                                        ├─ expires → session_expired
                                                        └─ logout → guest
```

### 10.2 Session 模型

```json
{
  "id": "ses_01...",
  "userId": "demo_user_...",
  "tokenHash": "server-side-hash",
  "authMode": "demo",
  "createdAt": "2026-08-10T01:00:00.000Z",
  "expiresAt": "2026-08-10T13:00:00.000Z",
  "revokedAt": null,
  "lastSeenAt": "2026-08-10T01:02:00.000Z"
}
```

Token 明文只在登录响应返回一次，Repository 只保存摘要；日志和错误不得记录 token/code。Demo 默认 TTL 12 小时（配置项）；生产需正式 `code2Session`、稳定用户绑定、token 轮换、TLS、密钥托管和安全审查。

Phase 4 实现补充：登录 code 保存带域分隔的 SHA-256 摘要并执行单次使用；相同幂等键和 payload 在同一进程返回原响应，服务重建后会为同一 Session 轮换新 token 而不新建 Session。不同 payload 复用幂等键返回 `STATE_CONFLICT`。Demo code 仅产生本地演示身份，不能冒充微信 openid。

## 11. Diagnosis 状态机

### 11.1 状态与阶段

状态：`pending | processing | ready | failed`。

阶段枚举：

1. `prepare_enterprise_data`
2. `validate_input_completeness`
3. `evaluate_high_tech`
4. `evaluate_tech_sme`
5. `evaluate_specialized_innovative`
6. `evaluate_eagle`
7. `assemble_evidence_actions`
8. `generate_report`

### 11.2 转移

```text
pending ──time/service──> processing ──all stages──> ready
   │                           │
   └────────fatal error───────┴───────────────> failed
```

- `ready`、`failed` 是终态；不允许倒退或从 failed 直接改 ready。
- 重试通过新诊断或明确的未来 retry endpoint 进行；Phase 4 默认创建新诊断并引用 `retryOfAssessmentId`。
- 状态由创建时间和可注入 clock 推导推进；无需 worker。每次查询/服务启动恢复时可推进。
- Report 生成必须幂等；同一 assessment 最多一个 report。
- 服务重启后从 Repository 恢复，不能永久卡在仅内存计时器状态。
- 默认 `pending` 300ms、每阶段 200ms，可由环境变量调整；这是进度演示时间，不是规则计算耗时承诺。
- Engine 或 Report 持久化异常会保存稳定的 `ASSESSMENT_PROCESSING_FAILED` / `REPORT_PERSISTENCE_FAILED`，对外不包含异常文本、路径或堆栈。

### 11.3 Assessment 模型

```json
{
  "id": "asm_01...",
  "userId": "demo_user_...",
  "enterpriseId": "demo-a-001",
  "status": "pending",
  "stage": "prepare_enterprise_data",
  "inputSnapshot": { "enterprise": {}, "supplements": {}, "context": {} },
  "agreementSnapshot": {
    "userAgreementVersion": "2026-08-10",
    "privacyPolicyVersion": "2026-08-10",
    "disclaimerVersion": "2026-08-10",
    "agreedAt": "2026-08-10T01:00:00.000Z",
    "agreementSource": "assessment-dialog"
  },
  "ruleSetVersion": "2026-08-10",
  "idempotencyKeyHash": "...",
  "reportId": null,
  "error": null,
  "retryOfAssessmentId": null,
  "createdAt": "2026-08-10T01:00:01.000Z",
  "updatedAt": "2026-08-10T01:00:01.000Z",
  "completedAt": null
}
```

## 12. Report 数据结构

```json
{
  "id": "rpt_01...",
  "assessmentId": "asm_01...",
  "userId": "demo_user_...",
  "enterprise": {
    "id": "demo-a-001",
    "name": "杭州市星澜智造 Demo 有限公司",
    "subjectCode": "DEMO-A-001",
    "isDemoData": true
  },
  "status": "ready",
  "reportVersion": "1.0",
  "ruleSetVersion": "2026-08-10",
  "inputSnapshotHash": "sha256:...",
  "qualifications": [],
  "evidence": [],
  "gaps": [],
  "actions": [],
  "disclaimer": "本结果仅供初步判断和准备工作参考，最终结果以相关主管部门政策、申报通知及审核结果为准。",
  "generatedAt": "2026-08-10T01:00:08.000Z"
}
```

`qualifications` 恰好包含四项且 `qualificationType` 唯一。报告是不可变快照；规则更新生成新版本，不修改历史报告。

Phase 3 `ReportGenerator` 由调用方显式传入 `reportId/assessmentId/userId/generatedAt/ruleSetVersion`，不读全局时间，不做持久化。它还保存完整企业输入快照、稳定序列化后的 `sha256` 输入摘要，以及四项 `ruleVersions[]`；这些是对本节冻结结构的增补，不改变既有字段语义。

## 13. Evidence 数据结构

```json
{
  "id": "evd_01...",
  "qualificationType": "high_tech_enterprise",
  "ruleId": "H-06",
  "criterion": "研发费用占销售收入比例",
  "requirement": "按最近一年销售收入档位分别不低于 5%/4%/3%，且境内研发费用占比不低于 60%",
  "actualValue": {
    "value": 0.052,
    "unit": "ratio",
    "period": { "type": "rolling_fiscal_years", "years": [2023, 2024, 2025] },
    "derivedFrom": ["rdExpense.*", "salesRevenue.*"]
  },
  "sources": [],
  "result": "manual_review",
  "missingData": [],
  "explanation": "数值达到预筛线，但研发费用归集及审计口径仍需核验。",
  "action": "准备近三年研发辅助账和专项审计/鉴证材料。",
  "policyRef": { "ruleVersionId": "HTE-2016-32-195@2026-08-10", "sourceIndex": 0 }
}
```

`actualValue` 可为 `null`，此时 `missingData` 必须非空。`manual_review` 必须解释为何不能自动判断及所需证据。

## 14. Gap / Action 数据结构

### 14.1 Gap

```json
{
  "id": "gap_01...",
  "qualificationType": "specialized_innovative",
  "ruleId": "S-08",
  "type": "manual_review",
  "title": "缺少官方平台专精特新发展评价得分",
  "whyItMatters": "2026 新办法要求本年度得分达到 50 分以上。",
  "impact": "blocks_confident_conclusion",
  "priority": "high",
  "evidenceIds": ["evd_..."],
  "missingFields": ["specializedDevelopmentScore", "officialPlatformEvidence"]
}
```

`type`：`unmet | missing_data | manual_review | data_conflict`；`priority`：`high | medium | low`。

### 14.2 Action

```json
{
  "id": "act_01...",
  "gapId": "gap_01...",
  "qualificationType": "specialized_innovative",
  "title": "在优质中小企业梯度培育平台查看质量评价得分",
  "description": "使用企业账号获取目标年度平台评价结果，并保留可核验凭证。",
  "priority": "high",
  "suggestedOwner": "企业申报负责人",
  "evidenceToPrepare": ["官方平台评价结果"],
  "advisorRecommended": true,
  "disclaimer": "建议仅用于材料准备，不构成申报通过承诺。"
}
```

## 15. Consultant Lead 数据结构

```json
{
  "id": "lead_01...",
  "enterprise": { "enterpriseId": "demo-a-001", "name": "杭州市星澜智造 Demo 有限公司" },
  "contactName": "演示联系人",
  "mobile": "13800000000",
  "directions": ["high_tech_enterprise"],
  "note": "希望了解材料准备顺序",
  "consent": {
    "accepted": true,
    "noticeVersion": "lead-privacy-2026-08-10",
    "agreedAt": "2026-08-10T01:05:00.000Z",
    "purpose": "consultant_contact"
  },
  "sessionId": null,
  "status": "submitted",
  "idempotencyKeyHash": "...",
  "submittedAt": "2026-08-10T01:05:01.000Z"
}
```

服务端保存原手机号供本地 Demo 业务展示，但日志和列表默认脱敏。生产需要加密、访问审计、保留期、删除机制和合法处理基础评估。

## 16. Repository 与持久化

Repository：Phase 2 的只读 `EnterpriseRepository` / `JsonEnterpriseRepository` 继续读取 fixture。Phase 4 已实现 `SessionRepository`、`ConsentRepository`、`AssessmentRepository`、`ReportRepository`、`LeadRepository` 及对应 JSON 适配器。每个接口提供按 ID、所属用户、幂等键和必要列表查询；领域服务不直接读写文件。

Phase 7 仅给 `AssessmentRepository` 与 `LeadRepository` 增加向后兼容的 `listAll()` 只读契约；`AdminService` 还通过已有 `ReportRepository.findByAssessmentId()` 核对实际持久化报告，再映射、排序和过滤展示字段。没有新增写方法，也没有绕过原有用户侧 Service 权限边界。

- fixture 与 runtime 分离；runtime 在 Git 忽略列表。
- 写入使用临时文件 + 原子替换；写前校验 schema，损坏时返回可诊断错误且不覆盖原文件。
- 仅承诺单进程低并发 Demo；生产替换为事务数据库。
- 报告与 assessment 的输入/规则快照不可变。
- 草稿默认只在小程序本地短期保存，不记录到服务端日志。
- runtime 分为 `sessions.json`、`consents.json`、`assessments.json`、`reports.json`、`leads.json`，各集合独立写入并在单进程内串行化，保存一个 Report 不会覆盖其他集合。

### 16.1 Consent 持久化语义

冻结的创建诊断 request 以三个当前协议版本、有效 ISO 8601 `agreedAt` 和 `agreementSource=assessment-dialog` 作为明确同意证据；若额外提交 `accepted`，只能为 `true`。服务端不从缺失字段推断同意，而是在完整校验后单独保存 `accepted=true`、Session/User、诊断 ID、用途上下文和记录时间，再把同一内容作为 Assessment 快照。版本常量集中在 `config/legalVersions.js`。

不设置“最近 24 小时”下限；该限制不是法律或微信平台要求，也不在冻结 PRD 中。服务端只拒绝不可解析的时间或明显晚于服务器当前时间的时间戳，并允许 5 分钟客户端时钟偏差。协议更新后的重新同意通过三个版本字段是否匹配当前常量判断。

## 17. Mock 与生产模式差异

| 领域 | Demo | 生产待办 |
| --- | --- | --- |
| 企业数据 | 虚构 Mock，字段标记 `demo_mock` | 正式 API 合同、授权、字段 mapper、缓存/限流、展示权 |
| 微信身份 | 非空 code → 随机本地 Session | 后端 `code2Session`、AppID/AppSecret、稳定用户、轮换与风控 |
| 数据库 | 单进程 JSON | 正式数据库、迁移、事务、备份、并发与灾备 |
| Admin | 本地只读限制 | 正式身份、RBAC、审计、最小权限、脱敏/导出控制 |
| 政策判断 | 预筛 + manual_review | 专家/审计/官方平台数据、年度规则治理和法务复核 |
| 安全 | 基本校验、token 摘要、日志脱敏 | TLS、密钥托管、加密、监控、漏洞管理、隐私权利流程 |

## 18. 安全与密钥管理

- AppSecret、企查查 Secret、token、生产密码不得进入仓库或小程序端。
- `.env.example` 只放变量名和安全占位值；真实 `.env` 忽略。
- 所有外部输入做类型、长度、枚举、期间及跨字段校验。
- 错误响应不包含堆栈、路径、环境变量或原始上游响应。
- 日志脱敏登录 code、Bearer token、手机号、经营敏感字段；request ID 用于排查。
- 受保护资源按 `userId` 隔离；不能仅靠客户端传 user ID。
- 登录、诊断和 Lead 已实现输入边界与幂等；生产级基础限流仍是 Phase 8/上线待办，幂等不能替代限流。
- 本地 Admin 默认不对外网开放；明确不是生产鉴权。

## 19. 真实企查查接入步骤（未来）

1. 业务确认正式 API 授权、字段、调用限额、缓存和衍生展示权。
2. 后端环境变量提供凭证；前端永不接触 Secret。
3. 实现 `QichachaEnterpriseProvider`，将原始字段映射到 canonical schema。
4. 对每字段保存供应商、观察时间和置信信息；未知保持 `null`。
5. 加入超时、重试上限、限流、错误映射和可选缓存。
6. 用 contract tests 复用 Mock Provider 行为约束。
7. 真实 Provider 不可用时 Demo 仍可显式切换 Mock；不得抓取网页作为回退。

## 20. 实现门与可测试性

- Phase 2 只实现工程骨架、Provider、Mock、企业 API 和健康检查。
- Phase 3 实现 Engine/字段/report 领域；所有 Evaluator 使用显式 clock/context，并对政策边界单测。
- Phase 4 已实现 Auth、Session、协议门、状态机、报告和 Lead API；当时的明确指令将早期 PLAN 同列的 Admin 查询 API 延后。该缺口现已由 Phase 7 的只读 Admin 实现补齐。
- API 变更必须先更新本契约；字段或规则变更同步 PRD 和测试。
- 未获得官方平台/审计/专家证据的定性项不得因实现便利从 `manual_review` 改为 `met`。

## 21. Phase 5 小程序基础架构

### 21.1 目录与页面

```text
project.config.json                 # miniprogramRoot=miniprogram/，本地 touristappid
miniprogram/
├── app.js / app.json / app.wxss / sitemap.json
├── config/index.js                  # API base URL、timeout、申报年、TTL
├── components/async-state/          # Loading/Empty/Error/Success 容器
├── components/demo-badge/           # 虚构 Demo 持续标识
├── services/api.js                  # 唯一 wx.request 入口
├── services/draft.js                # 按 enterpriseId 隔离的 2 小时 TTL 草稿
├── utils/form.js / format.js         # 可在 Node 中测试的表单/展示纯函数
└── pages/
    ├── home / report-list / me       # 三 Tab
    ├── enterprise-search / enterprise-confirm / enterprise-profile
    ├── business-supplement
    └── legal                         # type 参数区分四类游客文档
```

### 21.2 API Client 与错误

- `services/api.js` 集中配置 `http://127.0.0.1:3000`、10 秒超时、JSON envelope 解包和 `ApiError`。页面不直接调用 `wx.request`。
- Phase 5 最初只导出游客 API；Phase 6 在同一 Client 中新增 Auth、Assessment、Status、Report/List、Logout 与 Lead 方法，没有新增或改变 Backend endpoint。
- 错误页只展示服务端公共文案与可选 request ID；不透传 stack、路径或上游原始响应。

### 21.3 草稿与动态表单

- Storage key 为 `qualification-draft:<enterpriseId>`；草稿含 `version/enterpriseId/supplements/updatedAt/expiresAt`，默认 TTL 2 小时。另有当前企业 key，不把 A 企业补数合并到 B。
- 前端为每个 schema 字段生成 `{ value, unit?, period? }`；Backend `mergeSupplementalData` 负责将来源标记为 `sourceType=user/sourceLabel=user_supplied`，规则逻辑不进入页面。
- 实际 schema 类型覆盖 `money/integer/boolean/enum/list`，工具函数也可安全处理 `number/text/date`。`0` 和 `false` 通过显式空值判断保留。
- 点击保存时先做前端类型/范围校验，再向 missing-fields 提交新旧 supplements；只有 Backend 校验与重算成功后才写入本地草稿。

### 21.4 本地与发布网络边界

`project.config.json` 的 `urlCheck=false` 只服务微信开发者工具本地 Demo。真机中 `127.0.0.1` 指向手机自身；真机/发布必须改用 HTTPS 合法域名、微信后台 request 域名配置和正式服务端安全配置。`touristappid` 不代表生产 AppID，仓库中不包含 AppSecret。

## 22. Phase 6 小程序接入架构

### 22.1 新增前端边界

```text
用户明确动作
  ├─ 协议确认发起诊断 ───────────┐
  └─ 报告 Tab 登录按钮 → 协议确认 ┴→ services/auth.js → wx.login → POST /api/auth/login
                                      │
                                      └→ qualification-demo-session（本地短期保存）

协议确认 → services/assessment-flow.js
  → POST /api/assessments（Consent 内嵌，独立诊断幂等键）
  → assessment-progress（Status 轮询）
  → report-detail / evidence / actions（只读 Backend Report）

contact-consultant（游客）→ POST /api/leads（独立告知、独立幂等键）
```

- `wx.login` 的唯一直接调用位于 `miniprogram/services/auth.js` 的 `wxLogin()`；`App.onLaunch/onShow`、首页、报告 Tab `onShow` 和“我的” `onShow` 均不直接或间接创建 Session。
- Report Tab 的登录按钮只调用 `AgreementDialog.open()`；组件每次重置 `checked=false`。只有 `confirm` 事件才调用 Session 创建能力，成功后加载 `/api/reports`；取消、关闭或未勾选均不触发 Auth。
- 报告查看没有新增 Consent endpoint，也不修改 `POST /api/assessments` 的 Backend Consent Gate。报告协议是登录前端时序门；已有有效 Session 由 `onShow` 验证后直接加载列表，不重复同意。
- 报告/“我的” Tab 只在检测到本地 token 时调用 `GET /api/auth/session` 验证；无 token 直接渲染游客状态。失效/过期 401 会清除本地 Session。
- 本地 Session key 为 `qualification-demo-session`，结构为 `{ token, session }`。token 不进入页面 data、URL、日志或错误文案，只由 API Client 写入 Authorization header。
- 用户退出调用冻结的 `DELETE /api/auth/session`，成功后清除 Session 和 `qualification-draft:*` / 当前企业 key。注销不删除 Backend 报告。

### 22.2 Consent 与诊断时序

继续执行第 9.5.1 节冻结顺序，未新增 Consent endpoint：

1. `AgreementDialog.open()` 重置 `checked=false`。
2. 只有勾选并确认时生成 `agreedAt` 和当前三个版本。
3. 若无有效 Session，调用 `wx.login` 与 Demo Auth；已有有效 Session 则复用。
4. 使用新诊断幂等键将 supplements、context、agreement 一次提交到 `POST /api/assessments`。
5. 网络或创建失败时保留相同 payload/幂等键；成功后清除该企业本地草稿并导航进度页。

### 22.3 状态、报告与五态

- 进度采用已冻结的 HTTP 轮询，没有 WebSocket、worker 或前端假进度。前台间隔 500ms；`onHide/onUnload` 停止，`onShow` 立即恢复。
- `ready` 后通过 `/api/assessments/:id/report` 或 `/api/reports/:id` 读取报告；Evidence/Gap/Action 对 `report.evidence/gaps/actions` 按 `qualificationType` 过滤展示。
- `utils/report.js` 只做 `status/stage/result` 中文映射和可读格式化，不计算比例、不更改状态、不导入 Evaluator。
- 报告 Tab 的未登录/无报告/进行中/已完成/失败全部由本地 Session 与 `/api/reports` 真实数据产生。

### 22.4 Lead

- 顾问页不读取或创建 Session，也不存在 `getPhoneNumber`、`getUserProfile` 或授权按钮。
- 企业 ID 存在时先用企业详情 API 回填并由后端再次核对名称；无企业上下文可手填名称。
- Lead 独立同意默认 `false`，提交时使用 `lead-privacy-2026-08-10`、`consultant_contact` 与独立幂等键；失败重试复用同一请求。

## 23. Phase 8 集成与可移植性收口

- `package.json` 保持可移植脚本：`pnpm start` → `node server/src/server.js`，`pnpm test` → `node --test`；没有用户目录或 Codex bundled Node 绝对路径。
- 共享 `project.config.json` 固定 `miniprogramRoot=miniprogram/` 和 `appid=touristappid`。具体测试 AppID 属于本机私有配置，应写入被忽略的 `project.private.config.json`；AppSecret 永不进入前端或仓库。
- 新增独立 Backend 子进程 E2E，使用临时 JSON runtime 验证 Health、企业/缺失字段、Auth/Consent/Diagnosis、状态流、Report/List、Lead、Admin 脱敏与 Logout 失效；结束后自动清理。
- 动态补数将 Backend `supplements.fields.<key>` 跨字段错误映射到带年度的 `<key>.<year>` UI schema 字段，保持服务端业务校验为唯一依据并提供准确行内反馈。
- JSON Repository 边界不变：只适合本地、单进程、低并发 Demo；Phase 8 不引入数据库、跨进程锁、事务或队列。
