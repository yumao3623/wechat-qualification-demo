# 企业政府资质预评估微信小程序 Demo

> 当前状态：Phase 5（小程序游客前置流程）已实现，自动测试、真实 HTTP 游客 API 链路及微信开发者工具人工 E2E 均已通过。Phase 6 的协议、登录、诊断和报告页尚未实现，不能视为完整 Demo。

## 项目简介

这是一个招聘能力验证用微信小程序 Demo。系统结合四家完全虚构的企业画像和用户主动补充的经营数据，对高新技术企业、科技型中小企业、专精特新中小企业和“雏鹰企业（杭州新雏鹰区域示例）”进行可解释预评估。

本工具不是政府官方认定系统，不保证企业符合资质或获得补贴。当前可运行部分包含完整后端流程，以及原生微信小程序的游客首页、企业搜索、主体确认、企业画像、动态补数、报告游客占位、“我的”与法律/帮助页。

## Phase 5 已实现

- `miniprogram/` 原生 WXML/WXSS/JavaScript 工程，三 Tab 为首页、报告、我的。
- 游客可完成首页 → 搜索 → 主体确认 → 画像 → 动态补数，全程无登录、无授权、无协议强制。
- 搜索和主体详情真实调用 `/api/enterprises`；企业列表没有复制进小程序。
- 补数页真实调用 `/api/assessments/missing-fields`，根据 schema 渲染 `money/integer/boolean/enum/list`，并在保存后由 Backend 重新计算剩余字段。
- 草稿按企业 ID 隔离、默认 2 小时 TTL；补充值按完整 measurement 口径发送，Backend 合并时标记 `sourceType=user`。
- 统一 `services/api.js`、安全错误映射、请求超时、搜索竞态保护、Loading/Empty/Error/Success 和重试交互。
- 游客可访问使用说明、隐私政策、用户协议和免责声明；未编造运营主体、客服电话或备案号。
- Phase 5 代码中不存在 `wx.login`、手机号授权、`getUserProfile` 或 `/api/auth/login` 调用。

已有 Phase 2–4 后端能力保持不变：

- Node.js + Express 单进程 REST API、统一成功/错误 envelope、request ID 和安全错误屏蔽。
- `MockEnterpriseProvider` 与四家虚构企业；无任何真实企业数据或企查查依赖。
- 独立 `QualificationEngine`、四个 Evaluator、动态缺失字段、补数冲突保留和 `ReportGenerator`。
- `DemoAuthProvider`：接收合法非空 Demo code，签发随机 256-bit Session token；Repository 只保存 SHA-256 摘要。
- Session 创建、当前 Session、12 小时默认过期、注销、code 单次使用和登录幂等。
- 服务端 Consent Gate：三个协议版本、同意时间、来源、Session/User 和用途上下文均持久化。
- 诊断 `pending → processing → ready | failed` 状态机；查询时按可注入时钟推进，重启后可恢复。
- 企业、用户补数、规则版本和输入 hash 的不可变诊断快照；旧报告不依赖后续 fixture 变化重新计算。
- Report JSON 持久化、按诊断/报告 ID 获取、本人报告列表，以及 userId 所有权隔离。
- 游客顾问线索后端：独立隐私同意、字段校验、幂等保存。
- JSON runtime 原子替换写入和单进程内串行写队列；损坏文件不会被静默覆盖为空。

本阶段遵照任务边界，没有实现 Phase 6 的协议弹窗、`wx.login`、Session UI、诊断创建/进度、报告详情、证据、行动清单或顾问 UI，也没有实现 Admin。

## 技术架构

```text
Phase 5 小程序：
原生微信小程序 ── 游客 REST/JSON ── Express API
       │                                │
       ├─ 页面 + AsyncState/DemoBadge     ├─ EnterpriseProvider
       ├─ 统一 API Client                 ├─ DynamicFieldService
       └─ 按企业隔离的 TTL 草稿        └─ QualificationEngine

Phase 2–4 后端：
HTTP Route
  → Application Service
    ├─ DemoAuthProvider → SessionRepository
    ├─ EnterpriseProvider → EnterpriseRepository → Mock fixture
    ├─ ConsentService → ConsentRepository
    ├─ AssessmentService → QualificationEngine → ReportGenerator
    │                    └→ Assessment/Report Repository
    └─ LeadService → LeadRepository

runtime Repository → sessions / consents / assessments / reports / leads JSON
```

- 后端：Node.js 20+、Express 5、CommonJS JavaScript。
- 配置：环境变量 + dotenv。
- 测试：Node.js 内置 test runner。
- 数据：Git 跟踪的虚构 fixture + Git 忽略的本地 runtime JSON。
- 依赖边界：Route 只解析 HTTP；规则不进入 Route；领域层不依赖 Express 或文件系统。

详细契约见 [docs/architecture.md](docs/architecture.md)。

## 项目结构（当前实际）

```text
project.config.json
miniprogram/
├── app.js / app.json / app.wxss / sitemap.json
├── config/index.js           # 本地 API 与草稿 TTL
├── components/{async-state,demo-badge}/
├── services/{api,draft}.js
├── utils/{form,format}.js
└── pages/                    # 首页、搜索、确认、画像、补数、报告游客态、我的、法律页
server/
├── data/fixtures/mock-enterprises.json
└── src/
    ├── app.js / server.js / config.js
    ├── auth/DemoAuthProvider.js
    ├── config/legalVersions.js
    ├── domain/{enterprise,qualification,dynamic-form,report}/
    ├── middleware/{auth,errors,errorHandler,requestId}.js
    ├── repositories/       # fixture + runtime Repository interfaces/JSON implementations
    ├── routes/             # enterprises/auth/assessments/reports/leads
    ├── services/           # 用例编排，不放 HTTP 细节
    └── utils/
tests/
├── unit/
├── integration/api/
└── helpers/
```

`server/data/runtime/` 首次写入时自动创建并被 Git 忽略。

## 环境要求与安装

- Node.js 20 或更高版本
- npm 或 pnpm
- 微信开发者工具（用于导入和人工 E2E）
- 不需要企查查 Key、微信 AppSecret、数据库、Redis 或消息队列

```bash
pnpm install
pnpm start
```

也可执行 `npm install` 和 `npm start`。默认服务地址为 `http://127.0.0.1:3000`。

## 微信开发者工具导入

1. 先在仓库根目录执行 `pnpm start`，确认 `http://127.0.0.1:3000/api/health` 返回 `ok`。
2. 在微信开发者工具选择“导入项目”，项目目录选择本仓库根目录；工具会读取 [project.config.json](project.config.json) 并将 `miniprogram/` 作为小程序根目录。
3. 未配置正式 AppID 时使用 `touristappid` 本地 Demo 配置；本阶段不调用需要正式 AppID 的登录能力。
4. 本地开发允许关闭域名校验，`project.config.json` 已设置 `urlCheck=false`；该设置不得用于发布。

## 本地 API 配置

小程序的 API 基址集中在 [miniprogram/config/index.js](miniprogram/config/index.js)，默认为 `http://127.0.0.1:3000`。微信开发者工具可访问电脑的该地址；真机中 `127.0.0.1`/`localhost` 指向手机自身，不能直接访问电脑 Backend。真机或发布环境需要 HTTPS 合法域名、微信后台 request 域名配置和正式服务端安全配置。

## Phase 5 游客演示流程

1. 打开小程序，确认首页无登录、授权或协议弹窗。
2. 点击“开始预评估”，输入“Demo”搜索四家虚构企业；输入无匹配词可验证 Empty。
3. 选择“杭州市云舟微研 Demo 有限公司”，核对主体字段后确认。
4. 在企业画像页查看已获取、缺失和当前需补充字段。
5. 进入补数页，填写任意一项合法数据，点击“保存并重新计算缺失项”；剩余数应由 Backend 重新返回并减少。
6. 返回画像，确认用户补充草稿可恢复；返回重选企业后确认不串数据。
7. 查看报告 Tab 的游客占位和“我的”中四个法律/帮助入口。

本阶段验证环境：Windows、Node.js v24.14.0、pnpm v11.16.0。项目 scripts 仍是可移植的 `node --test` 与 `node server/src/server.js`，不包含 Codex 运行时或用户目录绝对路径。

## 环境变量

复制 `.env.example` 为 `.env` 后按需修改：

```dotenv
NODE_ENV=development
PORT=3000
ENTERPRISE_PROVIDER=mock
AUTH_MODE=demo
SESSION_TTL_MS=43200000
ASSESSMENT_PENDING_MS=300
ASSESSMENT_STAGE_MS=200
```

`RUNTIME_DATA_PATH` 可选，默认是 `server/data/runtime`。所有真实 Key/Secret 必须只存在后端环境或密钥托管；当前版本仅允许 `ENTERPRISE_PROVIDER=mock` 和 `AUTH_MODE=demo`。

## Demo Session 与生产微信登录的区别

Demo 登录入口是 `POST /api/auth/login`。它只校验 code 形态与单次使用，不调用微信服务器，也不能证明真实微信身份；`authMode` 明确返回 `demo`。Session token 只在登录响应中返回，服务端仅存摘要，默认 12 小时过期，注销后立即失效。

生产环境必须改用服务端微信 `code2Session`、后端环境变量中的 AppID/AppSecret、稳定用户绑定、TLS、token 轮换、风控和正式数据库。AppSecret 永远不能进入小程序、请求 body 或仓库。

## API 列表

| Method | Path | 登录 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/health` | 否 | 健康检查 |
| GET | `/api/enterprises?keyword=&limit=&cursor=` | 否 | 搜索虚构企业 |
| GET | `/api/enterprises/:id` | 否 | 企业详情 |
| POST | `/api/auth/login` | 否 | Demo code 换 Session |
| GET | `/api/auth/session` | 是 | 当前 Session |
| DELETE | `/api/auth/session` | 是 | 注销 Session |
| POST | `/api/assessments/missing-fields` | 否 | 动态缺失字段 |
| POST | `/api/assessments` | 是 | 协议门后创建诊断 |
| GET | `/api/assessments/:id/status` | 是 | 真实诊断状态 |
| GET | `/api/assessments/:id/report` | 是 | 按诊断获取报告 |
| GET | `/api/reports` | 是 | 本人报告/诊断状态列表 |
| GET | `/api/reports/:id` | 是 | 本人报告详情 |
| POST | `/api/leads` | 否 | 游客提交顾问咨询 |

所有变更请求使用 `X-Idempotency-Key`；受保护接口使用 `Authorization: Bearer <token>`。完整 request/response/error 契约见架构文档第 8–15 节。

## 后端诊断演示流程

1. `POST /api/auth/login`，保存返回的 Demo token。
2. 用户明确同意当前三个法律文件后，向 `POST /api/assessments` 提交企业、补数、协议版本、`agreedAt` 和 `agreementSource`。
3. 轮询 `GET /api/assessments/:id/status`，可观察 `pending → processing → ready`；失败时为 `failed`。
4. ready 后通过 `/api/assessments/:id/report` 或 `/api/reports/:id` 读取持久化报告。
5. `GET /api/reports` 返回当前用户自己的 pending/processing/ready/failed 项目。
6. `DELETE /api/auth/session` 注销；原 token 此后访问个人报告返回 401，但报告数据不被删除。

服务端允许 Scenario B 在仍有关键缺失数据时生成 `needs_data` 报告；不会擅自把缺失数据改成禁止创建诊断。

## Mock 企业

| Scenario | ID | 虚构企业 | 目标后端结果 |
| --- | --- | --- | --- |
| A | `demo-a-001` | 杭州市星澜智造 Demo 有限公司 | 四类均 `opportunity` |
| B | `demo-b-001` | 杭州市云舟微研 Demo 有限公司 | 初始四类 `needs_data`；补齐后改变 |
| C | `demo-c-001` | 杭州市青禾商贸 Demo 有限公司 | 四类 `not_met` |
| D | `demo-d-001` | 宁波市远汐数科 Demo 有限公司 | 杭州新雏鹰 `not_applicable` |

全部名称、编号、法人和数据均为虚构内容，不是企查查数据，也不映射真实主体。

## 测试

```bash
pnpm test
```

Phase 5 最近结果：74 tests，74 PASS，0 FAIL。在 Phase 2–4 全量回归基础上，新增覆盖动态表单 `0/false`、类型/单位/期间序列化、草稿 TTL/企业隔离、API 错误映射、页面成套存在、Tab 路径和无登录/授权调用。

另已实际启动 Backend 并用真实 HTTP 跑通：Health → Demo Session → Consent → pending → processing → ready → 四类报告 → Report List → Logout → 旧 token 访问报告返回 401。详见 [docs/test-cases.md](docs/test-cases.md)。

2026-08-10 已在微信开发者工具完成人工验证：主页、三 Tab、冷启动无登录授权、企业搜索及 Empty、主体确认与返回、企业画像、动态补数 20→19、草稿恢复、切换企业不串数据、四个法律/帮助页面、Console/Network 合规检查以及错误与重试，全部 `PASS`。

## 微信开发者工具人工验收结果

`PASS`。自动化环境最初调用微信开发者工具 CLI `open/preview` 超时，随后由用户在微信开发者工具中手动导入并完成 Phase 5 人工 E2E 清单，页面编译、导航、游客请求、动态补数、草稿隔离、法律/帮助页、无登录行为及错误恢复均通过。该结果只代表开发者工具中的 Phase 5 游客流程；真机、Phase 6 和专项多尺寸/键盘/生命周期测试不包含在内。

## 已知限制

- Demo Auth 不是真实微信认证，code 到 Demo user 的映射只服务本地演示。
- JSON Repository 仅适合本地单进程低并发；没有数据库事务、跨进程锁、备份或灾备。
- 查询时推进诊断状态是轻量异步模拟；没有队列或 worker。
- 当前只有报告 Tab 的 Phase 5 游客占位；没有协议弹窗、登录/Session UI、诊断进度、报告详情、证据、行动、顾问页或 Admin。
- 小程序已通过微信开发者工具中的 Phase 5 游客流程人工验证，但尚未完成真机、专项多尺寸/键盘遮挡和前后台生命周期验证。
- 当前没有生产级限流、加密、访问审计、保留/删除流程或正式隐私合规评估。
- 政策核验时点为 2026-08-10；年度通知及地方政策变化后必须更新规则版本。

## 生产环境仍需完成

- 微信 `code2Session`、密钥托管、HTTPS 合法域名、稳定账号和安全策略。
- 正式数据库、事务、迁移、并发、备份、监控、审计和灾备。
- 企业数据商业授权、正式 Provider、缓存/限流和字段可信度治理。
- 政策版本治理、专家/审计/官方平台证据接入。
- 敏感数据分类、加密、最小权限、保留删除和隐私权利流程。
- Admin 正式身份、RBAC、脱敏与访问审计。
