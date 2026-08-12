# 企业政府资质预评估微信小程序 Demo｜技术架构与接口契约

> 文档版本：v2.0
> 架构日期：2026-08-11

## 1. 架构目标

- 单进程、依赖少，可在评审环境中本地启动。
- 小程序、HTTP 接口、业务服务、规则引擎、企业数据和持久化职责分离。
- 没有企查查 Key、微信 AppSecret 或生产数据库时仍能跑通完整 Demo。
- 每个判断可追溯到数据来源、统计期和规则版本。
- 明确区分 Demo 能力与生产系统要求。

## 2. 系统架构

```text
原生微信小程序
  ├─ 页面与组件
  ├─ API / Auth / Assessment Flow
  └─ 本地短期草稿
          │
          │ REST / JSON + Bearer Session
          ▼
Express API
  ├─ Routes / Middleware
  ├─ Application Services
  │   ├─ EnterpriseService
  │   ├─ SessionService / ConsentService
  │   ├─ DynamicFieldService
  │   ├─ AssessmentService / ReportService
  │   └─ LeadService
  ├─ Domain
  │   ├─ MockEnterpriseProvider
  │   ├─ QualificationEngine + 4 Evaluators
  │   └─ ReportGenerator
  └─ Repository Interfaces
          │
          ├─ Git 跟踪的虚构企业 fixture
          └─ Git 忽略的 runtime JSON
```

依赖方向为 Route → Application Service → Domain / Provider / Repository。Evaluator 不依赖 Express、微信 API、页面、Repository 或文件系统。

## 3. 项目目录

```text
.
├── README.md
├── 交付说明.md
├── package.json
├── .env.example
├── project.config.json
├── miniprogram/
│   ├── app.js / app.json / app.wxss / sitemap.json
│   ├── config/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── utils/
├── server/
│   ├── data/
│   │   ├── fixtures/mock-enterprises.json
│   │   └── runtime/
│   └── src/
│       ├── app.js / server.js / config.js
│       ├── auth/
│       ├── domain/
│       ├── middleware/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       └── utils/
├── tests/
│   ├── unit/
│   ├── integration/api/
│   └── helpers/
└── docs/
    ├── PRD.md
    ├── design.md
    ├── architecture.md
    ├── test-cases.md
    └── decisions.md
```

## 4. 技术选择

| 层   | 技术                               | 适用边界                   |
| --- | -------------------------------- | ---------------------- |
| 小程序 | 原生 WXML、WXSS、JavaScript、微信官方 API | 直接检查登录和隐私时序，不引入跨端框架    |
| 后端  | Node.js 20+、Express 5、CommonJS   | 单进程 REST API，依赖少，启动简单  |
| 持久化 | JSON Repository                  | 本地单进程、低并发 Demo，可替换为数据库 |
| 测试  | Node.js 内置 test runner           | 单元、API 集成和独立进程 E2E     |

## 5. 小程序端架构

### 5.1 页面与导航

`miniprogram/app.json` 注册 13 个页面：

- Tab：首页 `home`、报告 `report-list`、我的 `me`。
- 游客流程：`enterprise-search`、`enterprise-confirm`、`enterprise-profile`、`business-supplement`。
- 登录后流程：`assessment-progress`、`report-detail`、`evidence`、`actions`。
- 公共页面：`contact-consultant`、`legal`。

### 5.2 前端服务

| 模块                            | 职责                                    |
| ----------------------------- | ------------------------------------- |
| `services/api.js`             | 唯一 `wx.request` 入口；封装企业、认证、诊断、报告和顾问接口 |
| `services/auth.js`            | 本地 Session 管理、唯一直接 `wx.login` 调用和 Demo 降级 |
| `services/assessment-flow.js` | 协议确认后的登录、诊断创建和失败重试编排                  |
| `services/report-access.js`   | 报告场景协议确认和列表访问                         |
| `services/draft.js`           | 按企业隔离的补充数据草稿和 TTL 清理                  |
| `utils/form.js`               | 动态字段值构造、空值判断和错误映射                     |
| `utils/report.js`             | 状态中文映射和值格式化，不执行政策判断                   |
| `utils/idempotency.js`        | 生成登录、诊断和顾问提交幂等键                       |

页面不直接实现资质判断，不直接拼装内部错误，不把 token 放入 URL 或页面展示数据。

### 5.3 本地状态

- Session key：`qualification-demo-session`，保存 `{ token, session }`。
- 草稿 key：`qualification-draft:<enterpriseId>`，默认 TTL 2 小时。
- 当前企业和草稿按企业 ID 隔离。
- 诊断创建成功清理当前企业草稿；退出登录清理全部草稿和本地 Session。
- 无本地 token 时，报告和我的 Tab 不调用登录 API。

### 5.4 网络边界

本地 API 默认地址为 `http://127.0.0.1:3000`。`project.config.json` 的本地设置仅用于微信开发者工具。真机和发布环境必须改为 HTTPS 合法域名，并在微信公众平台配置 request 域名。

共享 `project.config.json` 固定使用 `touristappid`。个人测试 AppID 仅允许进入 Git 忽略的 `project.private.config.json`，交付 ZIP 不包含该文件。

## 6. 后端架构

### 6.1 HTTP 层

- `routes/` 解析参数、调用 Service、映射 HTTP 状态。
- `middleware/requestId.js` 为请求生成追踪编号。
- `middleware/auth.js` 校验 Bearer Session，并把用户身份交给后续处理。
- `middleware/errorHandler.js` 统一公共错误，不向客户端暴露堆栈。
- JSON 请求体限制为 100 KB。

### 6.2 应用服务

| Service                     | 职责                    |
| --------------------------- | --------------------- |
| `EnterpriseService`         | 企业搜索和详情查询             |
| `SessionService`            | Demo 登录、会话查询、注销和过期处理  |
| `ConsentService`            | 校验并保存诊断协议记录           |
| `DynamicFieldService`       | 合并企业画像和补充数据，生成缺失字段    |
| `SupplementalDataValidator` | 类型、期间、范围和跨字段关系校验      |
| `AssessmentService`         | 创建诊断、推进状态、调用规则引擎和生成报告 |
| `ReportService`             | 本人报告列表、诊断报告和报告详情      |
| `LeadService`               | 校验并保存游客顾问咨询           |

### 6.3 领域层

- `MockEnterpriseProvider` 输出统一企业摘要和画像。
- `QualificationEngine` 统一调用四个 Evaluator。
- `HighTechEnterpriseEvaluator`、`TechSMEEvaluator`、`SpecializedInnovativeEvaluator`、`EagleEnterpriseEvaluator` 分别实现四类规则。
- `ReportGenerator` 将评估结果转换为不可变报告快照。
- 规则计算使用显式 context 和 clock，可脱离 UI 和 HTTP 独立测试。

## 7. 企业数据 Provider

### 7.1 接口

```text
EnterpriseProvider.searchEnterprises({ keyword, limit, cursor, signal })
  -> Promise<{ items: EnterpriseSummary[], nextCursor: string|null }>

EnterpriseProvider.getEnterpriseById({ enterpriseId, signal })
  -> Promise<EnterpriseProfile|null>
```

约束：

- 标准化后的关键词长度为 2 至 50，`limit` 为 1 至 20。
- Provider 原始数据不得直接透传到小程序。
- 未知字段保持缺失，不伪造为 `0` 或 `false`。
- Mock 企业必须设置 `isDemoData=true`，使用 `DEMO-*` 编号和虚构名称。
- 禁止爬取企查查网页；真实数据只通过获得授权的正式 API 接入。

### 7.2 企业摘要

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

### 7.3 统一字段值与来源

影响判断的字段使用统一值对象：

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

`sourceType` 支持 `demo_mock | provider | user | derived | official_platform | official_registry`。派生值保存来源字段和公式版本。`0`、`false` 和空数组是已知值；`null`、字段不存在、类型错误或统计期无效才视为缺失。

同名多年度指标保存为按年度升序的统一值对象数组，每项独立携带值、单位、期间和来源。

## 8. Qualification Engine

### 8.1 接口

```text
QualificationEngine.evaluate(profile, context) -> QualificationResult[4]
QualificationEngine.getMissingFieldSchema(profile, context) -> MissingFieldSchema
QualificationEngine.buildAssessmentInput(profile, context) -> AssessmentInput
```

`context` 包含评估日期、目标申报年、规则集版本、地域偏好和用户补充值。

### 8.2 结果模型

```json
{
  "qualificationType": "high_tech_enterprise",
  "displayName": "高新技术企业",
  "jurisdiction": "CN",
  "status": "opportunity",
  "summary": "数值预筛具备一定基础，仍有材料或人工核验项。",
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

单项结果：`met | unmet | unknown | manual_review | not_applicable`。

总体状态：`promising | opportunity | needs_data | not_met | not_applicable`。

汇总优先级：地域或主体不适用 → 关键硬门槛未达到 → 关键数据缺失 → 存在人工核验 → 未发现重大缺口。`manual_review` 只用于判断明细，不作为总体状态。

## 9. Dynamic Field Service

动态字段由 Evaluator 声明的字段需求与当前企业输入计算得到：

```text
缺失字段 = 当前适用规则所需字段 - 已知且类型、单位、统计期有效的字段
```

字段示例：

```json
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
```

- 相同字段合并并保留全部 `requiredFor`。
- 字段 key 使用 `fieldName.year` 表达年度数据。
- 用户补充值标记为 `sourceType=user`。
- 用户值与已有非空值冲突时保留双方来源到 `fieldConflicts[]`，交人工核验。
- 定性专家判断不转换为强制长表单，而生成 `manual_review` 证据和行动。

## 10. REST 通用契约

- Base path：`/api`；JSON 使用 UTF-8；时间使用 ISO 8601 UTC。
- 受保护请求使用 `Authorization: Bearer <sessionToken>`。
- 变更请求使用 `X-Idempotency-Key`，长度 1 至 64。
- 响应包含 request ID；客户端只展示公共错误和 request ID。
- API 不接收客户端传入的 user ID 作为资源所有权依据。

成功响应：

```json
{ "data": {}, "meta": { "requestId": "req_..." } }
```

错误响应：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "提交内容有误，请检查后重试。",
    "fields": [{ "field": "keyword", "reason": "长度应为 2 至 50 个字符" }],
    "requestId": "req_...",
    "retryable": false
  }
}
```

主要 HTTP 映射：

| HTTP | code                                                                 | 场景              |
| ---- | -------------------------------------------------------------------- | --------------- |
| 400  | `VALIDATION_ERROR`                                                   | 类型、长度、枚举或期间错误   |
| 401  | `AUTH_REQUIRED` / `SESSION_INVALID` / `SESSION_EXPIRED`              | 缺少、无效或过期会话      |
| 404  | `ENTERPRISE_NOT_FOUND` / `ASSESSMENT_NOT_FOUND` / `REPORT_NOT_FOUND` | 资源不存在或不属于当前用户   |
| 409  | `AGREEMENT_REQUIRED` / `REPORT_NOT_READY` / `AUTH_CODE_REUSED` / `STATE_CONFLICT` | 前置条件或状态冲突 |
| 422  | `BUSINESS_RULE_INPUT_INVALID`                                        | 单位、期间或跨字段关系错误   |
| 500  | `INTERNAL_ERROR`                                                     | 已屏蔽内部错误         |
| 503  | `DEPENDENCY_UNAVAILABLE`                                             | Provider 或依赖不可用 |

## 11. REST API

| Method | Path                                       | 登录 | 幂等  | 用途                  |
| ------ | ------------------------------------------ | -- | --- | ------------------- |
| GET    | `/api/health`                              | 否  | 不适用 | 健康检查                |
| GET    | `/api/enterprises?keyword=&limit=&cursor=` | 否  | 不适用 | 搜索企业                |
| GET    | `/api/enterprises/:id`                     | 否  | 不适用 | 企业详情                |
| POST   | `/api/auth/login`                          | 否  | 是   | Demo code 换 Session |
| GET    | `/api/auth/session`                        | 是  | 不适用 | 查询当前 Session        |
| DELETE | `/api/auth/session`                        | 是  | 是   | 退出登录                |
| POST   | `/api/assessments/missing-fields`          | 否  | 纯计算 | 计算动态字段              |
| POST   | `/api/assessments`                         | 是  | 强制  | 创建诊断并保存协议           |
| GET    | `/api/assessments/:id/status`              | 是  | 不适用 | 查询诊断状态              |
| GET    | `/api/assessments/:id/report`              | 是  | 不适用 | 按诊断获取报告             |
| GET    | `/api/reports?limit=&cursor=`              | 是  | 不适用 | 当前用户诊断和报告列表         |
| GET    | `/api/reports/:id`                         | 是  | 不适用 | 报告详情                |
| POST   | `/api/leads`                               | 否  | 强制  | 提交顾问咨询              |

### 11.1 企业

- 搜索无结果返回 200 和空数组，不返回 404。
- 企业详情不存在返回 `ENTERPRISE_NOT_FOUND`。
- Mock Provider 异常映射为安全的依赖错误。

### 11.2 动态字段

请求包含 `enterpriseId`、已有 `supplements`、评估日期和目标申报年。响应返回字段 schema 和人工核验要求。输入单位、期间或跨字段关系错误返回 422。

### 11.3 创建诊断

请求包含企业、补充字段、申报年和协议快照：

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

后端校验 Session、企业、补充字段、三个协议版本、同意时间和来源。协议不完整返回 `AGREEMENT_REQUIRED`。相同幂等键和相同 payload 不重复创建诊断。

### 11.4 顾问线索

`POST /api/leads` 允许游客调用，接收企业、联系人、手机号、咨询方向、备注和独立隐私同意。成功返回 `status=submitted`。服务端执行手机号、长度、同意版本、时间和幂等校验。

## 12. 登录与协议时序

```text
guest
  ├─ 游客页面：不调用 Auth
  ├─ 发起诊断 → 协议弹窗（checked=false）
  └─ 报告登录按钮 → 协议弹窗（checked=false）
                         ├─ 关闭 / 拒绝 / 未勾选 → guest
                         └─ 明确同意
                               → 尝试 wx.login
                               ├─ 成功：使用微信 code
                               └─ 游客模式失败且允许 Demo 降级：生成本地 Demo code
                               → POST /api/auth/login
                               ├─ AUTH_CODE_REUSED 且允许 Demo 降级
                               │     → 新本地 code + 新幂等键，仅重试一次
                               └─ 其它错误 → 停止并向用户提示
                               → session_active
                                      ├─ 创建诊断
                                      ├─ 查看本人报告
                                      ├─ 过期 → guest
                                      └─ 注销 → guest
```

协议确认后的创建顺序：

1. 弹窗打开时重置 `checked=false`。
2. 用户勾选并确认后生成 `agreedAt` 和当前协议版本。
3. 无有效 Session 时先调用 `wx.login`；若游客 AppID 下调用失败且 `ALLOW_DEMO_LOGIN_FALLBACK=true`，生成一次性本地 Demo code，再调用 `/api/auth/login`。若后端明确返回 `AUTH_CODE_REUSED`，使用新的本地 code 和幂等键重试一次；其它冲突不重试。有效 Session 可复用。
4. 使用独立幂等键向 `/api/assessments` 提交补充数据和协议快照。
5. 创建成功后进入进度页；失败重试复用相同 payload 和幂等键。

系统没有独立 Consent API。诊断服务在完整校验后保存 Consent 记录和 Assessment 协议快照。

## 13. Session 模型

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

- Demo 登录 code 可能来自 `wx.login`，也可能来自游客模式失败后的本地降级；两者都只用于生成本地演示身份，不等同微信 openid。
- 开发者工具重复返回已消费的 `wx.login` code 时，后端返回 `AUTH_CODE_REUSED`；前端只在 Demo 降级开启时使用新 code、新幂等键重试一次。
- 本地降级只允许用于 `AUTH_MODE=demo` 的招聘演示；生产构建必须设置 `ALLOW_DEMO_LOGIN_FALLBACK=false`，并由服务端执行微信 `code2Session`。
- Session token 使用随机值，明文只在登录响应返回一次；Repository 只保存 SHA-256 摘要。
- 登录 code 按摘要执行单次使用；相同幂等请求不重复创建 Session。
- 默认 TTL 为 12 小时，可通过环境变量配置。
- 注销吊销 Session，不删除后端历史报告。

## 14. 诊断状态机

状态：`pending | processing | ready | failed`。

```text
pending ──> processing ──> ready
   │             │
   └─────────────┴──────> failed
```

处理步骤：

1. `prepare_enterprise_data`
2. `validate_input_completeness`
3. `evaluate_high_tech`
4. `evaluate_tech_sme`
5. `evaluate_specialized_innovative`
6. `evaluate_eagle`
7. `assemble_evidence_actions`
8. `generate_report`

- `ready` 和 `failed` 为终态，不允许倒退。
- 状态根据创建时间和可注入 clock 推进，不引入 worker 或消息队列。
- 查询状态、报告或列表时可推进状态；服务重启后从 Repository 恢复。
- 默认等待 300ms，每个处理步骤 200ms，只用于本地进度演示。
- Engine 或报告持久化错误使诊断进入 `failed`，对外只返回稳定错误码和公共文案。
- 同一 Assessment 最多生成一份 Report。

## 15. 核心领域对象

### 15.1 Assessment

```json
{
  "id": "asm_01...",
  "userId": "demo_user_...",
  "enterpriseId": "demo-a-001",
  "status": "pending",
  "stage": "prepare_enterprise_data",
  "inputSnapshot": {},
  "agreementSnapshot": {},
  "ruleSetVersion": "2026-08-10",
  "reportId": null,
  "error": null,
  "createdAt": "2026-08-10T01:00:01.000Z",
  "updatedAt": "2026-08-10T01:00:01.000Z",
  "completedAt": null
}
```

### 15.2 Report

```json
{
  "id": "rpt_01...",
  "assessmentId": "asm_01...",
  "userId": "demo_user_...",
  "enterprise": {},
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

报告恰好包含四类唯一资质结果，并保存企业输入、规则版本和输入摘要。报告生成后视为不可变快照；新规则不修改历史报告。

### 15.3 Evidence

```json
{
  "qualificationType": "high_tech_enterprise",
  "ruleId": "H-06",
  "criterion": "研发费用占销售收入比例",
  "requirement": "按收入档位达到相应比例",
  "actualValue": {},
  "sources": [],
  "result": "manual_review",
  "missingData": [],
  "explanation": "数值达到预筛线，研发归集和审计口径仍需核验。",
  "action": "准备研发辅助账和专项审计材料。",
  "policyRef": {}
}
```

`actualValue` 为 `null` 时，`missingData` 必须非空。`manual_review` 必须说明不能自动判断的原因和所需证据。

### 15.4 Gap 与 Action

Gap 类型：`unmet | missing_data | manual_review | data_conflict`；优先级：`high | medium | low`。

Action 保存关联 Gap、资质、建议动作、建议材料、负责人建议、顾问建议和非承诺说明。

### 15.5 Lead

Lead 保存企业、联系人、手机号、咨询方向、备注、独立同意、提交状态和幂等摘要。游客提交时 `sessionId` 可为空。成功状态固定为 `submitted`。

## 16. Repository 与数据存储

企业 fixture 和 runtime 数据分离：

- `JsonEnterpriseRepository` 只读 `server/data/fixtures/mock-enterprises.json`。
- Session、Consent、Assessment、Report、Lead 使用各自 Repository 接口和 JSON 适配器。
- runtime 文件位于 `server/data/runtime`，不提交 Git。
- 写入使用临时文件和原子替换，同一集合在单进程内串行写入。
- JSON 损坏时保留原文件并返回安全错误，不覆盖为空集合。
- Domain Service 不直接读写文件。

该方案不提供跨进程锁和数据库事务，只适合本地低并发 Demo。生产环境应替换为正式数据库、迁移、事务、备份和并发控制。

## 17. 安全与敏感信息

- AppSecret、企查查 Secret、Session token 和生产密码不得进入仓库或小程序端。
- `.env.example` 只包含变量名和安全默认值；真实 `.env` 被忽略。
- 外部输入执行类型、长度、枚举、期间和跨字段校验。
- 日志和错误不得输出登录 code、Bearer token、完整手机号、经营敏感数据或堆栈。
- 受保护资源按服务端 Session 的 `userId` 隔离。
- 登录、诊断和顾问提交使用幂等键；幂等不替代生产限流。
- Demo 未实现生产 TLS、密钥托管、加密、访问审计和完整隐私权利流程。

## 18. Mock 与生产模式差异

| 领域   | Demo                      | 生产要求                              |
| ---- | ------------------------- | --------------------------------- |
| 企业数据 | 四家虚构企业，字段标记 `demo_mock`   | 正式授权 API、字段映射、缓存、限流和数据治理          |
| 微信身份 | 非空 code 生成本地 Demo Session | 服务端 `code2Session`、稳定用户绑定、密钥托管和风控 |
| 数据存储 | 单进程 JSON                  | 正式数据库、事务、备份、监控和灾备                 |
| 政策判断 | 结构化预筛与人工核验提示              | 年度规则治理、专家、审计和官方平台证据               |
| 网络安全 | 开发工具本地 HTTP               | HTTPS 合法域名、限流、监控和安全审查             |
| 个人信息 | 基本校验和日志脱敏                 | 分类分级、加密、最小权限、保留删除和审计              |

## 19. 真实企查查接入方式

1. 确认正式 API 合同、字段范围、调用限额、缓存和衍生展示权。
2. 在后端环境变量配置凭证，前端不接触 Secret。
3. 实现 `QichachaEnterpriseProvider`，将供应商结构映射到统一企业模型。
4. 为每个字段保存来源、观察时间和置信信息，未知字段保持缺失。
5. 加入超时、重试上限、限流、错误映射和缓存。
6. 使用 Provider contract tests 复用 Mock 的行为约束。
7. 正式 Provider 不可用时可显式切换 Mock，不允许网页爬取回退。

## 20. 测试策略

- Unit：Provider、动态字段、四类 Evaluator、QualificationEngine、ReportGenerator 和小程序纯函数。
- Integration：企业、Auth、Session、Consent、Assessment、Report 和 Lead API。
- E2E：独立后端进程跑通 Health、企业、补数、登录、协议、诊断、报告、顾问和注销。
- Static：检查登录调用位置、页面不包含规则、敏感信息和承诺性文案。
- Manual：微信开发者工具主流程、协议拒绝、报告 Tab 和顾问提交；真机 HTTPS、弱网、适配和生命周期单独记录。

实际测试结果与未执行项见 `docs/test-cases.md`。
