# 企业政府资质预评估微信小程序 Demo

> 当前状态：Phase 3（Rule Engine、动态字段与报告领域）已完成并通过本阶段自动测试。尚未实现 Session、诊断/Report REST、微信小程序页面或 Admin，不能视为完整 Demo。

## 项目简介

这是一个招聘能力验证用微信小程序 Demo。最终目标是结合虚构企业画像和用户主动补充的经营数据，在约 1 分钟内对高新技术企业、科技型中小企业、专精特新中小企业和“雏鹰企业（杭州新雏鹰区域示例）”进行可解释预评估。

本工具不是政府官方认定系统，不保证企业符合资质或获得补贴。Phase 3 提供可运行后端企业查询、独立资质预评估领域、动态缺失字段和 Report 对象生成；未对外暴露后三者的 REST API。

## Phase 3 已实现

- Node.js + Express 单进程 API 骨架、JSON body parser、request ID、统一错误处理。
- `GET /api/health`。
- `EnterpriseProvider` 契约、`MockEnterpriseProvider`、只读 JSON Repository。
- 四家完全虚构、字段带来源/统计期/单位的 Demo 企业。
- 企业关键词搜索、无结果、详情、404、基础输入校验和依赖错误屏蔽。
- Node.js 内置 test runner 单元/集成测试。
- `QualificationEngine` 与高企、科技型中小企业、专精特新、杭州新雏鹰四个显式 Evaluator。
- 统一 `criteria/evidence/missingFields/gaps/actions/ruleVersion/applicableRegion` 结果。
- 基于 Evaluator 字段需求的动态 schema，支持统计期/单位校验和地域裁剪。
- 纯领域用户补数合并：`sourceType=user` + `sourceLabel=user_supplied`，冲突不静默覆盖。
- `ReportGenerator` 生成不可变快照结构、输入 SHA-256、四类证据/缺口/行动与规则版本。

本阶段没有创建 `miniprogram/`：按 `PLAN.md`，正式小程序游客页面从 Phase 5 开始。也没有实现 Session、诊断/Report REST、报告列表、顾问 API 或 Admin。

## 技术架构

```text
HTTP Route → EnterpriseService → EnterpriseProvider → EnterpriseRepository → Mock JSON

EnterpriseProfile + SupplementalData
  → QualificationEngine
    → 4 Evaluators → Evidence / Gap / Action
    → MissingFieldSchema
    → ReportGenerator → Report 快照
```

- 后端：Node.js 20+、Express 5、CommonJS JavaScript。
- 配置：环境变量 + dotenv。
- 测试：Node.js 内置 test runner；不引入额外测试框架。
- 数据：Git 跟踪的虚构 fixture；当前没有 runtime 业务数据写入。

领域链路不依赖 Express、微信 API、Repository 或全局时间。详细契约见 [docs/architecture.md](docs/architecture.md)。

## 项目结构（当前实际）

```text
.
├── package.json
├── pnpm-lock.yaml
├── .env.example
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config.js
│   │   ├── domain/enterprise/
│   │   ├── domain/qualification/
│   │   ├── domain/dynamic-form/
│   │   ├── domain/report/
│   │   ├── middleware/
│   │   ├── repositories/
│   │   ├── routes/
│   │   └── services/
│   └── data/fixtures/mock-enterprises.json
├── tests/
│   ├── unit/enterprise/
│   ├── unit/qualification/
│   ├── unit/dynamic-form/
│   ├── unit/report/
│   └── integration/api/
└── docs/
```

## 环境要求

- Node.js 20 或更高版本
- npm（随 Node.js 提供）或 pnpm
- Phase 3 不需要微信开发者工具、企查查 Key、微信 AppSecret 或数据库

本阶段实际验证环境：Windows、Node.js v24.14.0、pnpm v11.16.0。

`package.json` 使用标准可移植脚本：`node server/src/server.js` 和 `node --test`。开发机需要按 Node.js 正常安装方式将 `node` 加入 `PATH`。Codex App 当前 Shell 只预置了 `pnpm`，bundled Node 未加入该 Shell 的 `PATH`；这是验证宿主环境差异，不是项目代码问题。2026-08-10 在仅对验证进程临时补齐 PATH 后，原样执行 `pnpm test` 与 `pnpm start` 均通过。仓库和 scripts 不包含 Codex bundled Node 或 Windows 用户目录绝对路径。

## 安装依赖

使用 pnpm（仓库包含 `pnpm-lock.yaml`）：

```bash
pnpm install
```

也可使用 npm 根据 `package.json` 安装：

```bash
npm install
```

依赖仅包含 Express 与 dotenv；没有 TypeScript、ORM、数据库驱动、Redis、队列或 Docker 依赖。

## 环境变量

复制 `.env.example` 为本地 `.env` 后按需修改。默认配置无需任何秘密凭证：

```dotenv
NODE_ENV=development
PORT=3000
ENTERPRISE_PROVIDER=mock
```

`.env.example` 中的企查查和微信变量只预留名称，值为空。真实 Key/Secret 不得提交；`.env` 已被 Git 忽略。Phase 3 仍仅支持 `mock`，设置其他 Provider 会明确拒绝启动。

## 启动 Backend

```bash
pnpm start
```

或：

```bash
npm start
```

默认地址：`http://127.0.0.1:3000`。

PowerShell 验证示例：

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
Invoke-RestMethod 'http://127.0.0.1:3000/api/enterprises?keyword=星澜'
Invoke-RestMethod http://127.0.0.1:3000/api/enterprises/demo-a-001
```

## API 列表

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/enterprises?keyword=&limit=&cursor=` | 搜索虚构 Demo 企业；无结果返回空数组 |
| GET | `/api/enterprises/:id` | 查询企业详情与字段 provenance |

所有响应均使用 `data/meta.requestId` 或统一 `error` envelope，并返回 `X-Request-Id`。客户端不会收到内部 stack trace。

搜索规则：关键词去首尾空格后 2–50 字符；`limit` 为 1–20；cursor 是 Provider 生成的不透明值。企业 ID 必须使用 `demo-*` 格式。

## Mock 企业

所有企业名称、编号、法人和数据均为虚构演示内容，不是企查查数据，也不映射真实主体。

| Scenario | ID | 虚构企业 | 用途 |
| --- | --- | --- | --- |
| A | `demo-a-001` | 杭州市星澜智造 Demo 有限公司 | 数据相对完整、研发与人员投入合理，供后续展示多个“较有希望” |
| B | `demo-b-001` | 杭州市云舟微研 Demo 有限公司 | 研发人员、收入、研发费用、知识产权等缺失，测试动态补数 |
| C | `demo-c-001` | 杭州市青禾商贸 Demo 有限公司 | 研发人员/费用为 0、无知识产权，供后续展示“暂不满足” |
| D | `demo-d-001` | 宁波市远汐数科 Demo 有限公司 | 数据较完整但不在杭州，供后续展示杭州新雏鹰“不适用” |

B/C 专门验证缺失语义：`null` 或字段不存在表示未知；`0`、`false` 表示已知值，不能按缺失处理。

## 测试

```bash
pnpm test
```

或：

```bash
npm test
```

Phase 3 最近结果：47 tests，47 PASS，0 FAIL。包含 Phase 2 全量回归，并覆盖四个 Evaluator、A/B/C/D、门槛边界、`manual_review`、地域不适用、动态字段、`0/false/null`、统计期/单位、补数合并、证据/缺口/行动、Report 生成和原对象不变性。真实记录见 [docs/test-cases.md](docs/test-cases.md)。

## 微信开发者工具导入

`NOT EXECUTED`。Phase 3 计划不包含小程序项目骨架或正式页面；`project.config.json` 与 `miniprogram/` 将按后续阶段创建并实际验证。当前请勿把仓库作为可运行小程序导入。

## 当前可验证流程

Phase 3 可验证：启动 API → Health Check → 搜索/查看四家虚构企业；通过自动测试调用 Engine → 计算动态缺失 → 合并用户补数 → 重新评估 → 生成 Report 对象。

完整的小程序主流程仍是后续阶段目标，目前 `NOT EXECUTED`。

## 已知限制

- Rule Engine、动态补数和 Report 目前只是领域层，尚无 REST、持久化、Session、异步诊断、顾问或 Admin。
- A 场景四类结果为 `opportunity`，因审计、官方平台、专家及材料真实性不能被 Mock 数据自动确认；不为演示效果将它们改为 `met`。
- Mock 数据只为演示产品分支，不代表真实企业，不具备官方或商业数据可信度。
- JSON fixture Repository 当前只读且面向单进程 Demo。
- 本阶段未在 Node.js 20 的独立机器复测；实际运行环境是满足 `>=20` 约束的 Node.js 24.14.0。
- 政策核验时点为 2026-08-10；规则实现阶段必须重新检查有效性。

## 生产环境仍需完成

- 正式微信 `code2Session`、密钥管理、HTTPS 合法域名和账号安全。
- 正式数据库、事务、备份、并发、监控和灾备。
- 企业数据商业授权、正式 Provider、字段映射、缓存/限流和展示合规。
- Rule Engine、政策治理、审计/专家/官方平台证据接入。
- 个人与企业敏感数据分类、加密、权限、保留/删除和审计。
- Admin 正式身份、RBAC、脱敏和访问审计。
