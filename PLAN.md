# 企业政府资质预评估微信小程序 Demo：项目实施计划

> 文档状态：Phase 0 规划基线  
> 基线日期：2026-08-10  
> 当前阶段边界：只做产品与技术规划，不实现正式页面、完整后端或业务规则代码。  
> 项目定位：招聘能力验证 Demo；输出仅为“预评估”，不构成官方认定或补贴承诺。

## 1. Phase 0 结论

### 1.1 仓库现状

- 当前仓库只有 `AGENTS.md` 与 `CODEX_TASK.md`，均未被 Git 跟踪；仓库无提交历史。
- 当前没有小程序、后端、后台、测试、依赖配置、README 或 `docs/` 文档。
- 因而不存在既有代码兼容问题，但后续所有工程、文档和验证能力都需要从零建立。
- 本文件和 `docs/decisions.md` 只是规划基线；它们不代表项目已经达到 Definition of Done。

### 1.2 推荐架构

采用一个仓库、一个轻量 Node.js 进程、三个展示端：

```text
原生微信小程序 ── REST/JSON ── Express API ── 业务服务 ── Repository ── 本地 JSON
                                      │
                                      ├── EnterpriseProvider
                                      │    └── MockEnterpriseProvider（默认）
                                      │
                                      ├── QualificationEngine
                                      │    ├── HighTechEnterpriseEvaluator
                                      │    ├── TechSMEEvaluator
                                      │    ├── SpecializedInnovativeEvaluator
                                      │    └── EagleEnterpriseEvaluator
                                      │
                                      └── 静态 Admin 页面（由同一 Express 进程提供）
```

选择：

- 前端：原生微信小程序，WXML + WXSS + JavaScript + 微信官方 API。
- 后端：Node.js 20 LTS + Express + REST；只引入必要依赖。
- 存储：Demo 默认使用本地 JSON 文件，通过 Repository 接口隔离；不引入原生数据库编译依赖。
- Admin：原生 HTML/CSS/JavaScript 静态页面，由 Express 提供，不单独引入前端构建框架。
- 测试：Node.js 内置测试运行器为主，HTTP 集成测试只在确有需要时增加轻量工具。
- 运行方式：Mock 企业数据和 Demo Auth 均可在没有企查查 Key、微信 AppSecret 的情况下运行。

这是对招聘 Demo 最简单且可靠的方案：单进程、依赖少、启动链路短，同时通过 Provider、Evaluator、Repository 三个必要边界保留可测试性和未来替换能力。

## 2. CODEX_TASK.md 强制交付清单

### 2.1 用户端产品能力

必须交付并实际跑通：

1. 首页：价值说明、“1 分钟预评估”、四类资质介绍、开始诊断 CTA、免责声明。
2. 企业搜索：关键词搜索虚构 Demo 企业，包含 Loading / Empty / Error / Success。
3. 主体确认：展示企业基本信息，可确认或返回重选。
4. 企业画像：区分已获取、缺失、待补充字段，并展示字段来源。
5. 动态补充经营数据：仅展示四类规则当前需要且企业缺失的字段；补充值确实进入诊断输入。
6. 发起诊断协议弹窗：用户协议、隐私政策、免责声明；复选框每次打开默认 `false`。
7. 登录与 Session：只有明确同意并发起诊断、或主动查看保存报告时才触发；使用 `wx.login`；禁止启动时自动登录、自动授权或强制手机号授权。
8. 诊断进度：真实的 `pending -> processing -> ready | failed` 状态流转和阶段展示。
9. 诊断报告：同时展示四类资质、合规状态文案、结论摘要和明显免责声明。
10. 证据链：展示条件、要求、企业实际值、来源、判断、缺失数据和说明；判断数据来自 Rule Engine。
11. 缺口与行动：针对未满足、缺失和需人工核验项给出优先级和非承诺式行动建议。
12. 报告 Tab：未登录、无报告、进行中、完成、失败五种状态；进入 Tab 不自动授权。
13. 我的 Tab：使用说明、隐私政策、用户协议、免责声明；仅已登录显示退出登录。
14. 联系顾问：游客可用；手填手机号为主，微信手机号授权仅可选；提交后真实保存线索并显示“咨询需求已提交”。
15. 法律/帮助页面：游客可访问使用说明、隐私政策、用户协议、免责声明。

必须复现的主流程：

```text
首次进入（游客、无授权）
→ 首页
→ 搜索企业
→ 主体确认
→ 企业画像
→ 动态补数据
→ 发起诊断
→ 协议默认未勾选
→ 明确同意
→ wx.login / Demo Session
→ 创建诊断
→ 进度
→ 四类报告
→ 证据链
→ 缺口与行动
→ 报告 Tab 可回看
→ 联系顾问并保存线索
```

### 2.2 后端业务能力

- 企业：搜索、详情。
- 登录：接收微信登录 code 的 Demo 流程、创建 Session、查询当前 Session、退出 Session。
- 诊断：创建、查询状态、获取生成后的报告。
- 报告：当前用户报告列表、单报告详情。
- 顾问：校验并保存咨询线索。
- Admin 数据：诊断记录列表、顾问线索列表。
- 基本输入校验、统一错误响应、Session 鉴权、前端友好错误信息。

建议 API 基线（最终以 `docs/architecture.md` 为准）：

| Method | Path | 登录 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/enterprises?keyword=` | 否 | 搜索 Demo 企业 |
| GET | `/api/enterprises/:id` | 否 | 企业详情与画像 |
| POST | `/api/auth/login` | 否 | code 换 Demo Session |
| GET | `/api/auth/session` | 是 | 查询当前 Session |
| DELETE | `/api/auth/session` | 是 | 退出登录 |
| POST | `/api/assessments/missing-fields` | 否 | 根据企业与草稿计算动态字段 |
| POST | `/api/assessments` | 是 | 创建诊断，附协议版本和同意时间 |
| GET | `/api/assessments/:id/status` | 是 | 查询真实诊断状态和阶段 |
| GET | `/api/reports` | 是 | 当前用户报告列表 |
| GET | `/api/reports/:id` | 是 | 单份完整报告 |
| POST | `/api/leads` | 否 | 提交顾问线索 |
| GET | `/api/admin/assessments` | Demo 本地限制 | Admin 诊断记录 |
| GET | `/api/admin/leads` | Demo 本地限制 | Admin 顾问线索 |

### 2.3 数据与规则能力

- `EnterpriseProvider` 接口，至少有 `searchEnterprises(keyword)`、`getEnterpriseById(id)`。
- 默认 `MockEnterpriseProvider`；只预留而不在核心 Demo 强求真实 `QichachaEnterpriseProvider`。
- 至少四家虚构企业，明确 Demo 标识，覆盖“较有希望 / 需补充数据 / 暂不满足 / 地区不适用”。
- 独立 `QualificationEngine` 和四个 Evaluator，禁止规则进入 WXML、Page 事件或 Route Handler。
- 动态字段由“Evaluator 声明的字段需求 − 已知且有效的企业字段”计算，不写死成固定表单。
- 每条证据保留值、单位、统计期、数据来源、结果和人工核验标记。
- 规则包含版本、发布日期/生效期、适用地域、来源链接、Demo 简化项。

### 2.4 Admin

- 轻量诊断记录页：企业、诊断 ID、诊断状态、创建时间、报告状态。
- 轻量顾问线索页：企业、联系人、手机号、咨询方向、提交时间。
- 不实现正式 CRM、角色权限、顾问派单或复杂运营系统。

### 2.5 文档、配置与验证

- `README.md`：项目说明、架构、环境、安装、后端启动、开发者工具导入、API 配置、Mock 企业、演示流程、Admin、测试命令、环境变量、限制和生产待办。
- `docs/PRD.md`：完整产品需求与验收。
- `docs/design.md`：所有页面、交互和四态设计。
- `docs/architecture.md`：系统、目录、API、模型、登录、Provider、Engine、Dynamic Form、Report、存储、安全、Mock/生产差异。
- `docs/test-cases.md`：规定字段与 `PASS / FAIL / NOT EXECUTED` 状态，覆盖任务要求的所有模块。
- `docs/decisions.md`：重要假设和决策日志。
- `.env.example` 和 `.gitignore`；不得提交 AppSecret、企查查 Secret、Token 或生产凭证。
- 自动测试、API 验证、敏感词/敏感信息扫描、微信开发者工具人工 E2E 记录。

## 3. 微信小程序约束分析

### 3.1 运行与导航约束

- 三个底部 Tab 必须在 `app.json` 的 `tabBar` 注册；Tab 页和普通页面使用不同导航 API，返回链路要在开发者工具中逐页验证。
- 小程序没有浏览器 DOM；页面用 WXML/WXSS 与小程序组件实现，Admin 才使用普通 HTML。
- 页面可能被销毁，小程序也会前后台切换。诊断进度页不能只依赖前端计时器；`onShow` 时应从后端重新读取状态。
- 页面传参长度有限且不适合携带完整企业对象；路由只传 ID，详情由状态层或 API 获取。
- API 地址在开发者工具可临时关闭域名校验，但真机/发布必须使用已配置的 HTTPS `request` 合法域名。不能把“开发工具能请求 localhost”当作上线验证。
- 基础库和开发者工具版本会影响 API 行为；项目需要记录最低基础库，并在目标版本上验证。

### 3.2 登录约束

- `wx.login` 只应在用户明确同意协议并确认发起诊断后调用，或在报告 Tab 中由用户主动点击登录后调用。
- 生产环境中 code 应由后端调用微信 `code2Session` 交换身份，AppSecret 只能存在于后端环境变量；客户端不可保存或发送 AppSecret。
- 登录 code 是短期、一次性材料，不能当 Session；后端应返回随机、不可预测的 Demo Session token。
- `wx.setStorage` 中的 token 不是安全凭据库，退出登录和 Session 失效时必须删除；服务端仍需验证每次受保护请求。
- 没有可用 AppID/AppSecret 时，默认 Demo Auth 仅校验非空 code 并创建明确标记的本地 Session；这不是生产认证。完整 `wx.login` 行为仍需在开发者工具的可用 AppID 环境验证。

### 3.3 隐私与用户体验约束

- 不在 `App.onLaunch`、首页 `onLoad`、Tab 切换时调用登录或敏感授权 API。
- 用户协议、隐私政策、免责声明使用原生页面展示，避免 web-view 域名与业务域名额外配置。
- 协议复选框必须在每次弹窗打开时显式重置为 `false`；关闭、拒绝、请求失败都不得推进登录或诊断。
- 若后续调用微信隐私接口，需要在小程序后台维护与代码实际收集行为一致的《小程序用户隐私保护指引》，并按微信当前隐私授权机制验证。
- 顾问线索中的姓名、手机号、备注属于个人信息。提交前提供短告知并取得针对该用途的明确同意；该同意不能反向阻塞游客浏览。
- 企业经营数据可能构成商业敏感信息。Demo 草稿只为完成当前流程短期本地保存，设置 TTL，并在成功提交/退出时清理；生产环境需重新做数据分类、加密、保留期和删除机制设计。

### 3.4 必须用开发者工具验证的行为

- 首次启动无登录、无手机号授权、无协议弹窗。
- 三个 Tab、普通页跳转、返回、冷启动和前后台切换。
- 协议弹窗首次及关闭后重开均默认未勾选；拒绝/关闭不调用 `wx.login`。
- 明确同意后才调用 `wx.login`，网络失败时停留在可恢复状态。
- Loading / Empty / Error / Success 的实际渲染及按钮可用性。
- 动态表单控件、数值键盘、输入校验、滚动、窄屏布局。
- 诊断轮询在锁屏、切后台、重新进入后能恢复。
- 报告 Tab 五态、我的 Tab 退出登录条件展示。
- API 域名、HTTPS、开发者工具与真机的网络差异。
- 隐私相关 API 和手机号可选授权（若实现）必须进一步做真机验证；仅模拟器通过不等同于发布合规。

## 4. 登录、协议、隐私流程与风险控制

### 4.1 推荐状态机

```text
guest_browsing
  └─ 点击“发起诊断” → agreement_open(checked=false)
       ├─ 关闭/拒绝 → guest_browsing（无登录、无诊断）
       ├─ 未勾选点击确认 → agreement_open + 校验提示
       └─ 明确勾选并确认 → login_pending
            ├─ wx.login/后端失败 → recoverable_error（不创建诊断）
            └─ Session 成功 → assessment_creating
                 ├─ 创建失败 → 可重试，避免重复任务
                 └─ 创建成功 → progress
```

报告 Tab：

```text
guest → 解释为何登录 + 用户主动登录按钮
session + no_report → 空态
session + pending/processing → 进度态
session + ready → 报告列表
session + failed → 失败和重试引导
```

### 4.2 服务端必须保存的同意证据

创建诊断请求附带并保存：

```js
{
  userAgreementVersion,
  privacyPolicyVersion,
  disclaimerVersion,
  agreedAt,
  agreementSource: "assessment-dialog"
}
```

Demo 不需要构建复杂审计平台，但不能只保存一个永久 `agreed: true`。协议版本变化后应再次确认。

### 4.3 主要风险

| 风险 | 后果 | 规划控制 |
| --- | --- | --- |
| 启动或切 Tab 自动调用登录 | 违反强制体验要求 | 登录入口集中到 AuthService；加入调用时序测试与人工验证 |
| checkbox 状态复用 | 二次打开被默认勾选 | 弹窗 `open()` 每次重置 `false`；单元测试 + DevTools 验证 |
| 同意前创建任务 | 合规和数据处理风险 | 后端要求 Session + 协议版本；前端状态机不越级 |
| Demo Session 被描述为生产安全 | 误导评审 | UI/README/架构均标记 Demo Auth；生产 Provider 单列 |
| 手填手机号无独立告知 | 个人信息处理不透明 | Lead 表单短告知、目的限制、显式同意、最少字段 |
| 企业经营数据长期留在本地 | 商业敏感信息泄露 | TTL、清理策略、日志脱敏；生产方案列为非目标待办 |
| 错误栈或 token 展示在客户端 | 泄露内部信息 | 统一错误码和用户文案；服务端日志脱敏 |
| 重复点击创建多个诊断 | 重复报告/脏数据 | 按 Session + 企业 + 请求幂等键防重复 |

## 5. 企查查数据接入风险

### 5.1 禁止与边界

- 禁止直接爬取企查查网页。
- Phase 1–最终 Demo 均以 `MockEnterpriseProvider` 为默认，企查查不可用不得影响演示。
- 不在本次核心范围内承诺 `QichachaEnterpriseProvider` 可用，只保留接口、配置位和生产接入说明。

### 5.2 风险清单

| 风险 | 说明 | 处理 |
| --- | --- | --- |
| 商业授权与接口套餐 | 可用接口、字段、限额、用途取决于合同 | 接入前由业务确认正式授权和用途范围 |
| 字段覆盖不足 | 研发费用、研发人员、细分市场占有率等通常不是工商基础字段 | Provider 只提供可得数据，缺失项交给动态表单或人工核验 |
| 字段含义/单位不一致 | 注册资本币种、日期、状态、行业编码等需标准化 | 建立 canonical enterprise schema 和 mapper |
| 时效性 | 企业状态与政策数据会变化 | 保存 `fetchedAt`、来源、字段级 provenance，报告提示时点 |
| 限流与故障 | 演示现场可能超时或被限流 | 超时、错误映射、可选缓存；Mock 始终可用 |
| 合规与展示权 | 数据可否缓存、展示、衍生判断取决于协议 | 上线前做合同、隐私和数据合规审查 |
| 身份歧义 | 同名企业、历史名称、分支机构易选错 | 主体确认页展示关键工商字段，不直接以搜索结果诊断 |
| 凭证泄露 | Secret 放前端或仓库会造成安全事故 | 仅后端环境变量；`.env.example` 只放占位符；扫描仓库 |

### 5.3 Provider 输出原则

Provider 返回统一字段和元数据，不返回供应商专用结构到 UI：

```js
{
  enterprise: { /* canonical fields */ },
  provenance: {
    fieldName: {
      sourceType: "demo_mock | provider | user | derived",
      sourceLabel,
      observedAt,
      confidence
    }
  },
  isDemoData: true
}
```

## 6. Mock 数据设计

### 6.1 数据原则

- 企业名完全虚构，例如“杭州市星澜智造 Demo 有限公司”，名称中保留明显 Demo 提示。
- 不伪造真实统一社会信用代码；使用 `DEMO-A-001` 等 Demo 主体编号，UI 明确标为“Demo 编号”。
- 所有列表、详情、报告都显示“虚构 Demo 数据”，不得出现企查查品牌暗示。
- 数值必须内部一致：员工数不小于研发人数，主营收入不大于总收入，研发费用统计期一致，比例可复算。
- `null`/缺失与 `0`/否严格区分，防止把未知误判为不满足。
- 每个字段包含来源、统计期和单位；用户补充值覆盖缺失，不静默覆盖已有公开值。

### 6.2 四个基准场景

| 场景 | 企业画像 | 目标结果覆盖 | 地区建议 |
| --- | --- | --- | --- |
| A 完整优势型 | 成立年限、收入、研发、人员、知识产权等较完整且较优 | 多项“较有希望”，证据链完整 | 杭州 |
| B 数据缺失型 | 缺研发费用、研发人员、知识产权或收入统计期 | 初始“需补充数据”；补充后结果发生变化 | 杭州 |
| C 明显不足型 | 研发占比低、无有效知识产权、关键门槛不满足 | 多项“暂不满足”，行动清单明显 | 杭州 |
| D 地域不匹配型 | 数据可完整，但注册地不在目标雏鹰政策辖区 | 雏鹰“不适用”；其他全国性项目仍评估 | 非杭州 |

每个企业还应支持测试变体：搜索无结果、详情异常、诊断失败注入，但失败注入放测试 fixture 或显式 Demo 开关，不能污染正常演示数据。

## 7. Rule Engine 设计

### 7.1 设计边界

`QualificationEngine` 只接收标准化企业画像、用户补充数据和评估上下文，返回结构化结果。它不依赖 Express、微信页面、本地文件或全局时间。

```js
QualificationEngine.evaluate(profile, context)
QualificationEngine.getMissingFieldSchema(profile, context)
```

四个 Evaluator 各自负责政策语义，不做一个通用 DSL 或复杂规则平台。共用的比例、年龄、区间、缺失判断可放纯函数库。

### 7.2 Evaluator 契约

```js
{
  qualificationType,
  displayName,
  jurisdiction,
  status, // promising | opportunity | needs_data | not_met | not_applicable
  summary,
  criteria: [{
    id,
    criterion,
    requirement,
    actualValue,
    unit,
    period,
    source,
    result, // met | unmet | unknown | manual_review | not_applicable
    missingData,
    explanation,
    action
  }],
  evidence,
  missingFields,
  gaps,
  actions,
  ruleVersion: {
    id,
    effectiveDate,
    checkedAt,
    jurisdiction,
    sources,
    simplifications
  }
}
```

### 7.3 结果归并原则

顺序优先级：

1. 地域或主体类型不适用 → `not_applicable`。
2. 关键门槛明确失败 → `not_met`。
3. 关键数据缺失，无法判断 → `needs_data`。
4. 门槛大体满足但存在人工核验/非硬性风险 → `opportunity`。
5. Demo 可判断项均通过且未见重大缺口 → `promising`。

“较有希望”仍不是官方通过；所有报告固定显示最终以主管部门政策、申报通知和审核为准。

### 7.4 动态表单

每个 Evaluator 声明字段要求：字段 key、标签、类型、单位、统计期、校验、出现条件、用途和敏感性。Engine 汇总四类要求后：

1. 计算适用的规则集合；
2. 排除已知且通过类型/统计期校验的字段；
3. 合并重复字段及其用途；
4. 按“阻塞性 + 填写成本”排序；
5. 返回前端可渲染 schema；
6. 补充后重新计算缺失项和评估结果。

不得用 truthy 判断缺失；`0`、`false` 是有效实际值，只有 `null`/`undefined`/无效统计期才视为缺失。

### 7.5 政策基线与不确定性

Phase 0 只确定来源与实现方法，不在本阶段声称已完成规则转译。正式编码前要制作逐条政策映射表并复核：

| 资质 | Phase 0 官方基线 | 主要不确定性/不可自动判断项 |
| --- | --- | --- |
| 高新技术企业 | 国科发火〔2016〕32号、国科发火〔2016〕195号；科技部页面标记有效 | 高新领域归属、知识产权关联性、科技成果转化、组织管理水平、成长性评分、审计口径需要材料或专家判断 |
| 科技型中小企业 | 国科发政〔2017〕115号、国科火字〔2022〕67号、2026 年度评价通知 | 年度窗口与流程会更新；人员/研发费用归集、知识产权有效性需佐证；2026 年组织管理口径需按最新通知确认 |
| 专精特新中小企业 | 工信部《优质中小企业梯度培育管理办法》，2026-04-01 实施 | 2022 旧标准已被替代；“科技和创新型中小企业”前置称号、市场地位、评价得分、产业与知识产权关联存在人工/外部数据判断 |
| 雏鹰企业 | Demo 暂以杭州市 2024 年《“新雏鹰”企业培育管理办法》作区域示例，有效期至 2027-12-31 | 不是全国统一资质；城市间名称、年限、行业、研发、知识产权和奖励标准均不同；非杭州主体返回“不适用” |

政策来源：

- 高新技术企业：[科技部《高新技术企业认定管理办法》](https://www.most.gov.cn/xxgk/xinxifenlei/fdzdgknr/fgzc/gfxwj/gfxwj2016/201602/t20160205_123998.html)
- 高新技术企业工作指引：[科技部国科发火〔2016〕195号](https://www.most.gov.cn/xxgk/xinxifenlei/fdzdgknr/fgzc/gfxwj/gfxwj2016/201606/t20160629_126169.html)
- 科技型中小企业：[科技部《科技型中小企业评价办法》](https://www.most.gov.cn/xxgk/xinxifenlei/fdzdgknr/fgzc/gfxwj/gfxwj2017/201705/t20170510_132709.html)
- 2026 科技型中小企业评价：[工业和信息化部 2026 年度通知](https://wap.miit.gov.cn/jgsj/qyj/wjfb/art/2026/art_92fae9ab4aba4b44a1ab2e7233c48a54.html)
- 专精特新：[工业和信息化部 2026 年《优质中小企业梯度培育管理办法》](https://wap.miit.gov.cn/cms_files/filemanager/1226211233/attach/20261/0c74a1a375e741f2ae3a5672c298a19c.pdf)
- 杭州新雏鹰：[杭州市“新雏鹰”企业培育管理办法](https://zfgb.hangzhou.gov.cn/11/105220253/t117220253054/518938.shtml)

每个开发阶段开始前，应再次检查来源有效性和申报年度通知。政策网页可访问不等于规则仍有效，必须检查生效、废止和过渡条款。

## 8. 数据模型与状态设计

### 8.1 核心实体

- `Enterprise`：标准化企业画像和字段 provenance。
- `AssessmentDraft`：企业 ID、用户补充值、字段统计期、短期 TTL。
- `Session`：随机 token 摘要、Demo user ID、创建/过期时间。
- `Assessment`：输入快照、协议快照、状态、当前阶段、错误码、时间戳。
- `Report`：四类 Evaluator 输出、报告版本、生成时间、免责声明。
- `Lead`：企业、联系人、手机号、方向、备注、单独同意记录、提交时间。

### 8.2 诊断异步模拟

不引入消息队列或 worker。创建诊断时持久化 `pending` 和时间戳；状态服务根据可注入 clock 与已过时间推进阶段，在 `ready` 时只生成一次报告。这样既有真实持久化状态变化，也避免后台定时任务在进程重启后丢失。测试使用 fake clock，不需要真实等待。

## 9. 项目目录

```text
.
├── AGENTS.md
├── CODEX_TASK.md
├── PLAN.md
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── project.config.json
├── miniprogram/
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── config/
│   │   └── index.js
│   ├── components/
│   │   ├── agreement-dialog/
│   │   ├── async-state/
│   │   ├── qualification-card/
│   │   └── source-badge/
│   ├── pages/
│   │   ├── home/
│   │   ├── enterprise-search/
│   │   ├── enterprise-confirm/
│   │   ├── enterprise-profile/
│   │   ├── business-supplement/
│   │   ├── assessment-progress/
│   │   ├── report-list/
│   │   ├── report-detail/
│   │   ├── evidence/
│   │   ├── actions/
│   │   ├── contact-advisor/
│   │   ├── me/
│   │   └── legal/                 # 使用说明及三类协议内容页
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── draft.js
│   └── utils/
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config.js
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── domain/
│   │   │   ├── enterprise/
│   │   │   │   ├── EnterpriseProvider.js
│   │   │   │   └── MockEnterpriseProvider.js
│   │   │   ├── qualification/
│   │   │   │   ├── QualificationEngine.js
│   │   │   │   ├── HighTechEnterpriseEvaluator.js
│   │   │   │   ├── TechSMEEvaluator.js
│   │   │   │   ├── SpecializedInnovativeEvaluator.js
│   │   │   │   └── EagleEnterpriseEvaluator.js
│   │   │   ├── dynamic-form/
│   │   │   └── report/
│   │   ├── repositories/
│   │   └── auth/
│   │       ├── DemoAuthProvider.js
│   │       └── WeChatAuthProvider.js        # 预留/生产说明，可不启用
│   ├── data/
│   │   ├── fixtures/
│   │   │   └── mock-enterprises.json
│   │   └── runtime/                         # Git 忽略的本地运行数据
│   └── public/admin/
│       ├── index.html
│       ├── admin.js
│       └── admin.css
├── tests/
│   ├── unit/
│   │   ├── enterprise/
│   │   ├── qualification/
│   │   ├── dynamic-form/
│   │   └── auth/
│   ├── integration/
│   │   └── api/
│   └── fixtures/
└── docs/
    ├── PRD.md
    ├── design.md
    ├── architecture.md
    ├── test-cases.md
    └── decisions.md
```

目录是目标结构，不要求一次性生成空文件；每阶段只创建实际需要且有内容的文件。

## 10. 开发阶段与每阶段验收标准

### Phase 0：规划基线（本阶段）

范围：阅读约束、盘点仓库、交付 `PLAN.md` 与初始化 `docs/decisions.md`。

验收标准：

- `AGENTS.md`、`CODEX_TASK.md` 已完整阅读。
- 必须交付物、架构、目录、风险、Mock、Rule Engine、政策差异、阶段和测试边界均有书面规划。
- 重要假设写入决策日志。
- 未创建正式页面、后端或业务代码。

### Phase 1：产品、政策与接口规格

范围：完成 `docs/PRD.md`、`docs/design.md`、`docs/architecture.md`、初版 `docs/test-cases.md`；逐条建立四类规则来源和 Demo 简化表；建立 API 与数据模型契约；创建 README 骨架。

验收标准：

- 四份强制文档覆盖任务要求的所有章节，互相无冲突。
- 每条规则标注来源、版本/日期、地域、自动/人工、Demo 简化。
- 所有页面有登录边界和四态定义。
- API request/response/error 和关键数据模型可供实现，不存在核心未决歧义。
- `test-cases.md` 初始状态均如实为 `NOT EXECUTED`。

### Phase 2：工程骨架、Mock 企业与 Provider

范围：初始化根脚本、Express 最小服务、配置、Repository、企业 API、四家 Mock 企业、输入校验和 `.env.example`；不先做其他复杂 API。

验收标准：

- 新环境按 README 可安装并启动；健康检查正常。
- 无任何真实 Key 时，企业搜索、无结果、详情可用。
- 四家企业均明显标记为虚构 Demo，数据关系校验通过。
- Provider 与路由隔离；Mock Provider 可独立单测。
- 敏感信息扫描无明文凭证。

### Phase 3：Rule Engine、动态字段与报告领域

范围：四个 Evaluator、Engine、字段 schema、结果归并、证据/缺口/行动生成、版本元数据和单元测试。

验收标准：

- 四类评估均返回统一结构，不依赖 UI/HTTP/文件系统。
- A/B/C/D 达成预期结果覆盖，D 的地域规则返回“不适用”。
- B 的缺失字段只显示需要项，补齐后输出确实变化。
- `0`/`false` 不被误判为缺失；统计期/单位错误能被识别。
- 每个 criterion 有 requirement、actualValue、source、result、missingData、action。
- 自动测试覆盖门槛边界、缺失、人工核验、地区和规则版本。

### Phase 4：Session、协议与完整后端诊断流

范围：Demo Auth、Session、协议快照、诊断状态机、报告持久化/列表/详情、顾问线索、Admin 查询 API。

验收标准：

- 未登录创建诊断与查询他人报告均被拒绝。
- 登录只接受预期输入，Session 有过期与退出行为。
- 没有完整协议版本/同意时间不能创建诊断。
- 诊断真实经过 pending/processing 到 ready 或 failed，重启/重复查询行为确定。
- 同一幂等请求不重复创建；报告与输入快照一致。
- 游客可以在独立同意后提交合法 Lead，非法手机号/超长备注被拒绝。
- API 集成测试全部通过。

### Phase 5：小程序游客前置流程

范围：首页、搜索、主体确认、画像、动态补充、帮助/法律页、基础组件和 API 层。

验收标准：

- 首次进入无登录、无授权、无协议强制。
- 游客能从首页完成搜索、确认、画像和动态补数。
- 搜索和页面均有 Loading / Empty / Error / Success。
- 返回重选不会串企业；补充值进入下一步且来源标记为用户补充。
- 微信开发者工具逐页人工验证通过并记录；自动可测的请求/校验逻辑通过。

### Phase 6：协议、登录、诊断、报告与顾问端到端

范围：协议弹窗、`wx.login`、进度、四类报告、证据、行动、报告 Tab 五态、我的 Tab、退出、联系顾问。

验收标准：

- 弹窗每次默认未勾选；拒绝/关闭不登录、不诊断且仍可游客浏览。
- 明确同意后才出现 `wx.login` 调用和诊断创建。
- 登录/网络/诊断失败均有可恢复错误态。
- 进度在切后台/返回后恢复；ready 自动进入或可进入报告。
- 报告同时展示四类结果、证据链、行动和免责声明，页面不重算规则。
- 报告 Tab 五态、我的 Tab 条件退出、游客顾问提交全部可演示。
- 完整指定 E2E 在微信开发者工具中跑通并记录真实结果。

### Phase 7：轻量 Admin

范围：同一服务内的静态 Admin，只读展示诊断与线索。

验收标准：

- 本地 URL 可打开，诊断记录字段和 Lead 字段齐全。
- 小程序新建诊断/Lead 后刷新 Admin 能看到真实数据。
- Loading / Empty / Error 状态存在。
- 明确标注本地 Demo 管理页，不宣称有生产权限安全。

### Phase 8：集成、硬化、文档收口与最终验收

范围：全量自动测试、人工 E2E、错误注入、敏感信息/禁用文案扫描、README 完成、文档与代码同步。

验收标准：

- `CODEX_TASK.md` 完整主流程可由首次接触项目的评审按 README 复现。
- 后端/Engine 改动后的相关测试全部重新运行。
- `docs/test-cases.md` 每项为真实 `PASS / FAIL / NOT EXECUTED`，没有把未执行写成通过。
- 不存在真实凭证、明显 `TODO`、Lorem ipsum、Coming soon 或保证性用语。
- README 覆盖启动、导入、配置、Mock、演示、Admin、测试、限制和生产待办。
- PRD、设计、架构、测试、决策与实际代码一致。
- 所有 Definition of Done 项逐条核对；未满足项必须明确报告，不能宣称项目完成。

## 11. 测试策略

### 11.1 可以自动测试

- `MockEnterpriseProvider`：搜索、无结果、详情、Demo 标识、字段标准化。
- Mock fixture 一致性：人数、收入、比例、统计期、必需 ID 唯一。
- 缺失数据识别与动态字段 schema：合并、条件字段、顺序、`0`/`false` 边界。
- 四个 Evaluator：门槛边界、缺失、人工核验、地域、结果归并、规则版本。
- 报告生成：criteria/evidence/gaps/actions 完整性和禁止用语。
- Session：创建、查询、过期、退出、无效 token。
- 协议服务端门槛：缺版本/未同意/时间无效时拒绝创建。
- 诊断：创建、幂等、状态推进、失败注入、报告生成、列表和权限隔离。
- 顾问：输入校验、游客提交、独立同意、数据保存。
- API：成功与错误响应、鉴权、404、输入边界。
- 静态检查：JSON 配置、敏感信息特征、禁用承诺文案、遗留占位文本。
- 可抽离的前端纯函数：表单校验、状态映射、错误映射、草稿 TTL。

### 11.2 必须在微信开发者工具人工验证

- 页面实际渲染、布局、字体、滚动、触控区域和不同屏幕尺寸。
- Tab 与普通页导航、返回、重新搜索、冷启动恢复。
- 首次进入无登录/授权；`wx.login` 的真实调用时机。
- 协议 checkbox 的首次、关闭重开、不同意、同意路径。
- 动态表单控件和键盘体验，补数后 UI 与报告变化。
- Loading / Empty / Error / Success 的可见反馈。
- 前后台切换、进度轮询恢复、失败重试。
- 报告 Tab 五态、退出登录后的状态清理。
- 法律文案链接和顾问表单完整交互。
- 本地 API 请求配置与开发者工具 Console/Network 无内部错误泄露。

### 11.3 最好进一步真机验证

- HTTPS 合法域名、网络超时与弱网。
- 微信版本/基础库差异。
- 涉及隐私接口或可选手机号授权时的平台隐私授权行为。
- 数字键盘、安全区、长文本和低端设备性能。

## 12. 主要风险总览

| 优先级 | 风险 | 应对 |
| --- | --- | --- |
| P0 | 登录或协议时序不合规 | 显式状态机、后端协议门槛、DevTools 调用时序验证 |
| P0 | 政策过期或把地区规则当全国规则 | 规则版本、适用地域、有效期、开发前复核、报告免责声明 |
| P0 | Demo 被误解为官方认定 | 全链路使用“预评估”和允许状态，扫描禁用承诺文案 |
| P0 | 动态表单实际是固定表单 | Evaluator 字段声明 + 缺失计算 + 补齐后回归测试 |
| P0 | 规则藏在 UI/路由 | 独立纯业务 Evaluator，单元测试先行 |
| P1 | 微信 AppID 环境影响 `wx.login` 演示 | README 说明前提，Phase 4/6 提前验证，保留明确 Demo Auth 模式 |
| P1 | 企查查授权/字段/限流不可控 | Mock 默认、Provider 隔离、真实接入非核心路径 |
| P1 | JSON 持久化并发/损坏 | Demo 单进程、原子写入、Repository 封装、fixture 与 runtime 分离 |
| P1 | 商业/个人敏感数据泄露 | 最小收集、TTL、清理、脱敏、环境变量、错误屏蔽 |
| P1 | 异步模拟因重启卡住 | 时间推导状态、可注入 clock、幂等报告生成 |
| P2 | Admin 过度开发挤压小程序 | 静态只读页面，安排在完整小程序之后 |
| P2 | 文档与代码漂移 | 每阶段验收包含文档同步，最终逐项交叉检查 |

## 13. 当前假设与决策入口

详细记录见 `docs/decisions.md`。当前最重要的可见假设：

1. 默认只运行 Mock 企业数据，不实现或依赖真实企查查调用。
2. Demo Auth 在后端本地换取随机 Session，不等同微信生产身份认证；仍在正确时机调用 `wx.login`。
3. 采用 JSON Repository 以降低环境依赖；只承诺单进程招聘 Demo 使用。
4. “雏鹰企业”暂选杭州市“新雏鹰”作为一个明确标注的区域示例；非杭州主体为“不适用”，不声称全国通用。
5. “专精特新”使用 2026-04-01 起实施的新标准，不沿用 2022 旧标准。
6. 无法仅靠结构化数据可靠判断的政策项返回 `manual_review`，不推测为满足。
7. 顾问线索允许游客提交，但对个人信息另行告知并取得明确同意。
8. Admin 只面向本地 Demo，不实现生产权限系统。

## 14. 需要特别注意的问题

- Phase 1 开始写规则规格前必须再次检查政策的有效性、年度通知和过渡条款；尤其是 2026 年专精特新新标准与科技型中小企业管理职责变化。
- 高企、专精特新的多项定性条件不能用几条财务公式替代；无法核验时必须显示“需人工核验/需补充数据”。
- “有数据”不等于“数据可信”。报告必须携带来源、统计期，用户补充与 Mock 公共信息要区分。
- 不应为追求“1 分钟”一次性索取所有字段；先按适用规则裁剪，再优先询问真正阻塞结论的字段。
- 协议弹窗里的同意不能替代顾问 Lead 对手机号处理的针对性告知，也不能把不同目的打包强制同意。
- 微信开发者工具关闭域名校验只用于本地开发；最终 README 必须明确真机和发布环境差异。
- `project.config.json` 不应包含私密配置；AppSecret 永不进入小程序代码。
- 测试结果必须如实记录。仅完成自动测试不能把 DevTools E2E 标为 `PASS`。
- 每个重要阶段结束仍需按 AGENTS.md 输出：已完成、修改文件、实际执行、测试结果、当前问题、下一步建议。

