# 企业政府资质预评估微信小程序 Demo｜技术架构与接口契约

> 文档版本：Phase 1 / v1.0  
> 规格日期：2026-08-10  
> 当前边界：本文件是 Phase 2–4 的实现契约；Phase 1 不创建服务、页面、Repository 或 Rule Engine 代码。

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
│   │   ├── repositories/     # interface + JSON implementation
│   │   └── auth/             # DemoAuthProvider；生产 Provider 说明/预留
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

`fields` 使用第 5 节统一值模型，允许缺失。Provider 不能断言财务、研发、知识产权关联或政策合规结论。

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

## 10. Session/Auth 流程

### 10.1 状态与时序

```text
guest
  ├─ 浏览游客页面（无 auth 调用）
  ├─ 报告 Tab 主动点击登录 ─┐
  └─ 协议明确同意并确认 ────┴→ wx.login_pending
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

Repository：`SessionRepository`、`AssessmentRepository`、`ReportRepository`、`LeadRepository`。每个接口提供按 ID、所属用户和必要列表查询；领域服务不直接读写文件。

- fixture 与 runtime 分离；runtime 在 Git 忽略列表。
- 写入使用临时文件 + 原子替换；写前校验 schema，损坏时返回可诊断错误且不覆盖原文件。
- 仅承诺单进程低并发 Demo；生产替换为事务数据库。
- 报告与 assessment 的输入/规则快照不可变。
- 草稿默认只在小程序本地短期保存，不记录到服务端日志。

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
- 基础限流适用于登录、搜索、创建诊断和 Lead；幂等不替代限流。
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
- Phase 4 实现 Auth、Session、协议门、状态机、报告和 Lead API。
- API 变更必须先更新本契约；字段或规则变更同步 PRD 和测试。
- 未获得官方平台/审计/专家证据的定性项不得因实现便利从 `manual_review` 改为 `met`。

