# 企业政府资质预评估微信小程序 Demo

> 当前状态：Phase 7 轻量 Admin 已实现；Phase 6 小程序核心流程保持不变。90 项自动测试全部通过，并已用真实 Backend 和本地浏览器验证 Admin 的 Loading / Empty / Error / Success。真机和专项异常/多尺寸验证仍为 `NOT EXECUTED`，Phase 8 未开始。

## 项目简介

这是一个招聘能力验证用微信小程序 Demo。系统结合四家完全虚构的企业画像和用户主动补充的经营数据，对高新技术企业、科技型中小企业、专精特新中小企业和“雏鹰企业（杭州新雏鹰区域示例）”进行可解释预评估。

本工具不是政府官方认定系统，不对资质或补贴结果作承诺。当前小程序已接通游客前置流程、协议弹窗、用户动作后的 Demo 登录、诊断进度、Backend 报告、证据、缺口/行动、报告 Tab、退出登录和游客顾问咨询。

## Phase 7 已实现

- 同一 Express 进程在 `http://127.0.0.1:3000/admin/` 提供原生 HTML/CSS/JavaScript 轻量 Admin，无独立构建链。
- 两个只读区展示当前 JSON Repository 中真实持久化的诊断记录与顾问线索；刷新后读取最新数据，不写死业务列表。
- 诊断展示企业、诊断 ID、状态、报告状态和创建时间；企业保持“虚构 Demo 数据”标记。
- 线索展示企业、联系人、默认脱敏手机号、咨询方向和提交时间；不返回原手机号、Consent、Session 或内部 hash。
- Admin 静态页与 `/api/admin/*` 只允许 Backend 本机访问，非本地请求返回 403；页面明确说明这不是生产权限安全方案。
- Loading / Empty / Error / Success 均有页面级反馈；不提供编辑、删除、导出、派单、审批或用户管理。

## Phase 6 已实现且保持不变

- `miniprogram/` 原生 WXML/WXSS/JavaScript 工程，三 Tab 为首页、报告、我的。
- 游客可完成首页 → 搜索 → 主体确认 → 画像 → 动态补数，全程无登录、无授权、无协议强制。
- 搜索和主体详情真实调用 `/api/enterprises`；企业列表没有复制进小程序。
- 补数页真实调用 `/api/assessments/missing-fields`，根据 schema 渲染 `money/integer/boolean/enum/list`，并在保存后由 Backend 重新计算剩余字段。
- 草稿按企业 ID 隔离、默认 2 小时 TTL；补充值按完整 measurement 口径发送，Backend 合并时标记 `sourceType=user`。
- 统一 `services/api.js`、安全错误映射、请求超时、搜索竞态保护、Loading/Empty/Error/Success 和重试交互。
- 游客可访问使用说明、隐私政策、用户协议和免责声明；未编造运营主体、客服电话或备案号。
- 协议弹窗每次打开均重置为未勾选；关闭、拒绝或未勾选确认都不登录、不创建诊断。
- `wx.login` 只封装在 `services/auth.js`。诊断场景须在协议弹窗明确同意；报告场景点击“登录查看报告”只打开协议弹窗，明确勾选并确认后才登录。App 启动、首页及 Tab `onShow` 不调用。
- Session token 仅保存在小程序本地 Session 存储并随受保护请求发送；Tab 只验证已存在 Session，不自动创建。
- Consent 随冻结的 `POST /api/assessments` 一次提交；成功后清除对应企业敏感草稿。
- 进度页轮询真实 `pending / processing / ready / failed`，后台停止，回前台从 Backend 恢复。
- 报告、Evidence、Gap、Action 全部读取 Backend Report 快照；前端只做展示格式化，不执行 Rule Engine。
- 报告 Tab 表达未登录、无报告、进行中、已完成、失败；“我的”仅已登录时显示退出。
- 顾问表单游客可用，手机号手填、独立同意默认未勾选，不含强制手机号授权。

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

Phase 7 没有修改小程序文件，也没有改变 Phase 2–6 已冻结的 Session、Consent、Diagnosis、Report 或 Rule Engine 契约。

## 技术架构

```text
Phase 6 小程序：
原生微信小程序 ── REST/JSON + Bearer Session ── Express API
       │                                │
       ├─ 协议/进度/报告/顾问页面          ├─ Session / Consent
       ├─ 统一 API/Auth Client             ├─ Assessment / Report
       └─ 按企业隔离的 TTL 草稿            └─ Lead / QualificationEngine

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

Phase 7 Admin：
本地浏览器 → 静态 Admin → 只读 AdminService → Assessment / Lead Repository
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
├── services/{api,auth,assessment-flow,draft}.js
├── utils/{form,format}.js
└── pages/                    # 首页、搜索、确认、画像、补数、进度、报告、证据、行动、顾问、我的、法律页
server/
├── data/fixtures/mock-enterprises.json
├── public/admin/             # 原生只读 Admin 静态资源
└── src/
    ├── app.js / server.js / config.js
    ├── auth/DemoAuthProvider.js
    ├── config/legalVersions.js
    ├── domain/{enterprise,qualification,dynamic-form,report}/
    ├── middleware/{auth,errors,errorHandler,requestId}.js
    ├── repositories/       # fixture + runtime Repository interfaces/JSON implementations
    ├── routes/             # enterprises/auth/assessments/reports/leads/admin
    ├── services/           # 用例编排，不放 HTTP 细节
    └── utils/
tests/
├── unit/
├── integration/api/
└── helpers/
```

`server/data/runtime/` 首次写入时自动创建并被 Git 忽略。

## Admin 入口与使用

1. 在仓库根目录执行 `pnpm start`。
2. 浏览器打开 `http://127.0.0.1:3000/admin/`。
3. 先在小程序完成一次诊断或提交一次顾问咨询，再点击 Admin 的“刷新数据”，即可看到相同 runtime Repository 中的新记录。

Admin 只允许从运行 Backend 的本机访问。它没有生产身份、RBAC、审计或导出控制，不应暴露到公网，也不能作为正式运营后台使用。

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
3. 当前 `project.config.json` 使用 `touristappid` 方便导入；Phase 6 的 `wx.login` 人工验收需要目标开发者工具环境支持该接口。若游客 AppID 受限，应改用评审方测试 AppID，但 AppSecret 仍不得进入仓库或小程序端。
4. 本地开发允许关闭域名校验，`project.config.json` 已设置 `urlCheck=false`；该设置不得用于发布。

## 本地 API 配置

小程序的 API 基址集中在 [miniprogram/config/index.js](miniprogram/config/index.js)，默认为 `http://127.0.0.1:3000`。微信开发者工具可访问电脑的该地址；真机中 `127.0.0.1`/`localhost` 指向手机自身，不能直接访问电脑 Backend。真机或发布环境需要 HTTPS 合法域名、微信后台 request 域名配置和正式服务端安全配置。

## Phase 6 完整演示流程

1. 打开小程序，确认首页无登录、授权或协议弹窗。
2. 点击“开始预评估”，输入“Demo”搜索四家虚构企业；输入无匹配词可验证 Empty。
3. 选择“杭州市云舟微研 Demo 有限公司”，核对主体字段后确认。
4. 在企业画像页查看已获取、缺失和当前需补充字段。
5. 进入补数页填写合法数据并保存；点击“使用当前数据发起诊断”。
6. 验证协议默认未勾选；关闭后仍可浏览。重新打开、明确勾选并确认后，才观察到 `wx.login → /api/auth/login → /api/assessments`。
7. 在进度页观察 `pending → processing → ready`，进入报告查看四类结果、证据链、缺口与行动。
8. 切到报告 Tab 查看已保存报告；切到“我的”确认已登录并可退出。

未登录单独验收报告 Tab 时：进入 Tab 只显示游客引导；点击“登录查看报告”打开默认未勾选的协议弹窗；关闭、拒绝或未勾选均保持游客态；明确勾选确认后才执行 `wx.login → /api/auth/login → /api/reports`。已有有效 Session 直接加载列表，不重复弹协议或登录。
9. 从报告或行动页进入“联系顾问”，不登录也可手填手机号、独立勾选同意并提交；成功文案为“咨询需求已提交”。

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
| GET | `/api/admin/assessments` | 本机限制 | Admin 只读诊断列表 |
| GET | `/api/admin/leads` | 本机限制 | Admin 只读顾问线索列表（手机号脱敏） |

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

Phase 7 最近结果：90 tests，90 PASS，0 FAIL。包含 Phase 2–6 的 85 项全量回归，以及 Admin 空数据、真实持久化数据、本机限制、安全错误、四态静态实现、手机号脱敏与内部字段过滤。

另以真实监听端口打开 Admin：默认 runtime 显示 1 条已完成诊断和 1 条已脱敏 Lead；独立空 runtime 显示两个 Empty 状态；断开 Backend 后刷新显示稳定 Error，刷新过程显示 Loading。详见 [docs/test-cases.md](docs/test-cases.md)。

2026-08-10，用户在微信开发者工具实际完成 Phase 6 的 30 项核心人工验收，覆盖编译、冷启动/三 Tab 无自动登录、报告协议门、Session 复用、游客企业流程、诊断协议、创建/进度、四类报告、Evidence、Gap/Action、报告列表、顾问、法律入口、退出及 Console 检查，全部 `PASS`。

## 微信开发者工具人工验收结果

Phase 5 游客流程：`PASS`。Phase 6 微信开发者工具核心主流程：`PASS`（用户执行 30/30）。真机、故障注入、专项多尺寸/键盘和前后台生命周期：`NOT EXECUTED`。

## 已知限制

- Demo Auth 不是真实微信认证，code 到 Demo user 的映射只服务本地演示。
- JSON Repository 仅适合本地单进程低并发；没有数据库事务、跨进程锁、备份或灾备。
- 查询时推进诊断状态是轻量异步模拟；没有队列或 worker。
- Phase 6 核心 UI 已通过微信开发者工具人工验收，但 failed 状态构造、登录/诊断网络故障注入、前后台轮询恢复、专项多尺寸/键盘和真机网络尚未执行。
- `touristappid` 是否允许目标环境完整执行 `wx.login` 仍需人工确认；不提供绕过微信登录的前端固定 code。
- Demo Auth 以每个新 code 派生本地 Demo user；退出后用新 code 登录不承诺恢复原 Demo 用户历史，这与生产稳定微信身份不同。
- Admin 只实现本机只读 Demo 能力，没有生产身份、RBAC、审计、加密、导出控制或正式隐私治理。
- 当前没有生产级限流、加密、访问审计、保留/删除流程或正式隐私合规评估。
- 政策核验时点为 2026-08-10；年度通知及地方政策变化后必须更新规则版本。

## 生产环境仍需完成

- 微信 `code2Session`、密钥托管、HTTPS 合法域名、稳定账号和安全策略。
- 正式数据库、事务、迁移、并发、备份、监控、审计和灾备。
- 企业数据商业授权、正式 Provider、缓存/限流和字段可信度治理。
- 政策版本治理、专家/审计/官方平台证据接入。
- 敏感数据分类、加密、最小权限、保留删除和隐私权利流程。
- Admin 正式身份、RBAC、脱敏与访问审计。
