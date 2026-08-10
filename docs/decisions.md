# 决策与假设日志

> 初始化日期：2026-08-10  
> 用途：记录产品假设、技术选型、简化方案、业务规则假设、地区限制、Mock 处理及未决事项。  
> 状态说明：`ACCEPTED_FOR_DEMO` 表示当前 Demo 基线；`PROVISIONAL` 表示进入实现前需复核；`OPEN` 表示尚未决定，不能静默实现。

## D-001 原生微信小程序

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：小程序端使用原生 WXML、WXSS、JavaScript 和微信官方 API，不使用跨端框架。
- 原因：符合题目推荐方向，依赖少，招聘方可直接在微信开发者工具检查，登录与隐私 API 行为最容易解释。
- 影响：页面共享逻辑通过小组件、service 和纯函数控制，不为了复用引入复杂状态框架。

## D-002 单体 Node.js + Express REST

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：后端使用一个 Node.js 20 LTS + Express 进程，同时提供 REST API 和静态 Admin。
- 原因：完整流程所需规模很小，单进程最容易启动、演示和测试。
- 明确不做：微服务、消息队列、容器编排、复杂权限或独立 Admin 构建链。

## D-003 JSON Repository 作为 Demo 持久化

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：默认用本地 JSON 文件保存 Session、诊断、报告与 Lead，fixture 与 runtime 数据分离；所有访问经过 Repository。
- 原因：避免 SQLite 原生依赖或额外服务，降低评审启动失败概率。
- 限制：只承诺单进程、低并发 Demo；需采用原子替换写入并处理损坏错误。
- 生产替代：正式数据库、迁移、事务、备份和并发控制。

## D-004 静态轻量 Admin

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：Admin 使用原生 HTML/CSS/JavaScript，由 Express 提供，只读展示诊断与顾问线索。
- 原因：满足业务侧可见性要求，同时保持小程序为最高优先级。
- 限制：本地 Demo 页面不具备生产权限安全，必须在界面和文档明确标注。

## D-005 Mock 为默认且完整的数据模式

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：所有默认演示和自动测试使用 `MockEnterpriseProvider`；没有企查查 API Key 时全流程必须可用。
- Mock 规则：完全虚构名称、`DEMO-*` 主体编号、明显 Demo 标签、字段级来源、至少 A/B/C/D 四种结果。
- 原因：题目禁止爬取且未提供商业 API 授权；真实数据不是验证产品闭环的必要条件。
- 生产替代：在确认合同、字段、限流、缓存和展示授权后实现 `QichachaEnterpriseProvider` mapper。

## D-006 Demo Auth 与生产微信认证分离

- 状态：`PROVISIONAL`
- 决策：小程序在用户明确同意后调用 `wx.login`；默认后端 Demo Auth 接收非空 code 并签发随机、短期本地 Session，不调用微信 `code2Session`。
- 原因：仓库不能包含 AppSecret，评审环境未必有可用生产配置，但题目要求演示完整 Session 流程。
- 风险：某些测试 AppID/游客 AppID 环境可能限制 `wx.login`；必须在 Phase 4 前用目标开发者工具环境验证。
- 生产替代：服务端 `WeChatAuthProvider` 使用环境变量中的 AppID/AppSecret 调用 `code2Session`，绑定稳定用户标识并采用生产 Session 安全策略。
- 禁止：客户端保存 AppSecret、把 code 当 Session、启动时自动登录。

## D-007 协议同意是诊断创建的双重门槛

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：前端每次打开协议弹窗将 checkbox 重置为 `false`；后端创建诊断同时要求有效 Session 和三个法律文档版本及同意时间。
- 原因：只靠 UI 控制可被绕过；保存版本快照也避免把一次同意解释成永久同意。
- 拒绝行为：不登录、不创建诊断、不阻塞游客继续使用。

## D-008 顾问 Lead 使用独立隐私告知

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：游客可手填联系人与手机号提交 Lead；提交前提供针对咨询联系目的的简短告知和明确同意。微信手机号授权只作为未来可选增强。
- 原因：诊断协议不应被当作手机号营销/联系处理的通用授权；同时满足游客可联系顾问和不强制手机号授权。
- 数据最小化：姓名、手机号、企业、咨询方向、可选备注；不收集无关身份信息。

## D-009 规则采用显式 Evaluator，不做通用规则 DSL

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：四个独立 Evaluator 使用共享纯函数，输出统一结构；不构建可视化规则平台或复杂 JSON 表达式解释器。
- 原因：四类规则数量有限但语义不同，显式代码更易审核、测试和解释。
- 边界：Evaluator 不依赖 UI、HTTP、Repository 或全局时间。

## D-010 不确定规则返回人工核验

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：细分市场地位、技术领域归属、知识产权与主导产品关联、成果转化质量、审计口径等无法由 Demo 数据可靠判断时，criterion 返回 `manual_review` 或 `unknown`，不得默认满足。
- 原因：产品是预评估而非官方认定；假精确比保留不确定性风险更高。
- UI 影响：报告应解释缺什么证据、为何需人工核验、下一步行动是什么。

## D-011 雏鹰政策选择杭州市“新雏鹰”作为区域示例

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：Demo 的第四类显示为“雏鹰企业（杭州新雏鹰区域示例）”，规则基线暂采用杭州市 2024 年发布、有效期至 2027-12-31 的《杭州市“新雏鹰”企业培育管理办法》。非杭州企业返回 `not_applicable`。
- 原因：`雏鹰企业`没有全国统一认定口径；杭州现行文件有明确地域、条件和有效期，适合演示地域判断。Phase 0 检查到天津 2021 版相关办法页面已标记失效，因此不采用。
- Phase 1 复核：2026-08-10 已复核原文件的实施期，并核对杭州市科技局 2025 年行政规范性文件清理结果；杭科高〔2024〕50号列入“继续有效”目录。若产品方指定目标地区，应新增该地区规则版本并更新 Mock 和文档，而不是静默替换。
- 官方来源：https://zfgb.hangzhou.gov.cn/11/105220253/t117220253054/518938.shtml
- 有效性复核来源：https://zfgb.hangzhou.gov.cn/11/109220253/t126220253094/529631.shtml

## D-012 专精特新采用 2026 新办法

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：专精特新中小企业规则以工业和信息化部《优质中小企业梯度培育管理办法》为基线；该办法 2026-04-01 实施，旧暂行办法相关标准同时废止。
- 原因：采用常见的 2022 旧口径会直接造成规划过期。
- Phase 1 复核：工信部官方解读确认新办法自 2026-04-01 实施，质量评价引用工信厅企业〔2024〕75号并由优质中小企业梯度培育平台套用公式计算。Demo 只接受可核验的平台得分作为预筛输入；没有平台结果时返回 `manual_review`，不自行复算隐藏/不可得的完整平台计算环境。目标年度和省级申报通知仍须在申报前复核。
- 官方来源：https://wap.miit.gov.cn/cms_files/filemanager/1226211233/attach/20261/0c74a1a375e741f2ae3a5672c298a19c.pdf
- 官方解读：https://www.miit.gov.cn/jgsj/qyj/gzdt/art/2026/art_87cabbda70004e95b83e04730abf82e7.html

## D-013 政策规则版本化与时点快照

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：每个报告固定保存 `ruleVersion`、生效/检查日期、适用地域、来源、Demo 简化；规则更新不重写旧报告。
- 原因：政策、年度通知和地区实施细则会变化，报告必须能解释“当时按什么规则评估”。
- 发布门：每次修改规则都要更新政策映射、测试和文档，并重新执行四类规则回归。

## D-014 动态表单由规则字段需求计算

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：Evaluator 声明字段需求元数据；Engine 合并适用规则字段并排除已有有效数据，返回 UI schema。
- 原因：确保动态表单真实影响评估，而不是固定大表单换标题。
- 边界：`0` 和 `false` 是已知值；统计期不匹配或 `null` 才可能视为缺失。

## D-015 诊断异步采用时间推导状态，不引入 worker

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：保存创建时间和当前状态，查询时用可注入 clock 推进阶段，ready 时幂等生成报告。
- 原因：能展示真实状态流转，并在服务重启后恢复；无需消息队列或常驻后台任务。
- 测试：fake clock 快速覆盖 pending、processing、ready、failed，无需等待真实秒数。

## D-016 企业补充数据的 Demo 本地保留策略

- 状态：`PROVISIONAL`
- 决策：为跨页流程可用，允许小程序本地短期保存诊断草稿；草稿包含 TTL，在成功创建诊断、用户退出或过期后清理，不写日志。
- 原因：小程序页面可能销毁，仅存 Page data 容易丢失；但企业经营数据可能敏感，不应长期留存。
- 生产替代：上线前重新评估服务端草稿、加密、数据分类、保留期、删除与主体权利机制。

## D-017 当前开放决策

- 状态：`OPEN`
- 问题 1：招聘方最终用于 DevTools 验收的 AppID 类型是什么，是否支持完整 `wx.login`？
- 问题 2：是否有指定“雏鹰企业”目标城市；若有，杭州示例需替换或作为多地区版本之一。
- 问题 3：是否要求实现真实 `QichachaEnterpriseProvider`，以及是否已获得正式 API 授权与字段清单？当前计划不要求。
- 处理原则：这些问题不阻塞 Phase 1 文档细化和 Mock 开发，但分别是 Phase 4 登录验收、Phase 3 雏鹰规则冻结、真实数据接入前的决策门。

## D-018 Phase 1 政策核验基线

- 状态：`ACCEPTED_FOR_DEMO`
- 核验日期：2026-08-10。
- 决策：四类规则的正式实现只能以 `docs/PRD.md` 第 11–13 节列出的官方政府来源、版本、地域和字段映射为基线。每个申报年度及每次规则变更前重新检查有效性、年度通知和过渡条款。
- 自动化原则：能做确定性日期、地域、数量、比例和阈值计算的条件只做“预筛”；审计口径、人员/收入分类、知识产权或产品关联、专家评分、市场地位、平台得分和材料真实性，缺少对应官方/专业证据时返回 `manual_review` 或 `unknown`。
- 影响：Phase 3 的规则测试必须覆盖 `manual_review`，不能只覆盖 `met/unmet`。

## D-019 REST 与领域模型冻结方式

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：Phase 1 以 `docs/architecture.md` 的 REST request/response/error、Session、诊断状态机及 Report/Evidence/Gap/Action/Lead schema 作为 Phase 2–4 实现契约。
- 变更规则：后续若代码需要改变字段、枚举或状态转移，应先说明原因并同步更新 PRD、架构和相关测试，避免文档与实现漂移。

## D-020 Phase 2 企业 fixture 与 Repository 落地

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：Phase 2 使用只读 `JsonEnterpriseRepository` 加载 Git 跟踪的四家虚构 fixture，再由 `MockEnterpriseProvider` 输出 canonical summary/profile；Route 只做输入解析和 HTTP 映射，并通过 `EnterpriseService` 调用可注入 Provider。
- 多期字段：单一时点指标保存一个统一值对象；近两年/三年同名指标保存按年度升序的统一值对象数组，每个元素独立携带 `value/unit/period/source`。这是对 `architecture.md` 第 5、6 节未展开的多期存储方式的实现澄清，不改变 REST 模型语义。
- 缺失语义：B 场景有意同时使用 `null` 和字段不存在表示未知；C 场景有意保存 `0` 和 `false` 表示已知零值/否。不得使用 truthy 判断缺失。
- 真实 Provider：Phase 2 不创建可误认为已接通的 `QichachaEnterpriseProvider` 占位实现。配置为非 `mock` 时启动即明确拒绝；未来取得正式 API 授权后再按 D-005 与架构第 19 节实现。
- Repository 边界：本阶段 Repository 只读 fixture 并缓存解析结果，不实现 runtime 写入；Session/诊断/报告/Lead 的原子 JSON Repository 留在其计划阶段。

## D-021 Phase 2 package scripts 可移植性基线

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：`package.json` 的 `start` 固定使用 `node server/src/server.js`，`test` 固定使用 `node --test`；要求开发环境正常安装 Node.js >=20 并将 `node` 加入 PATH。
- 禁止：不得把 Codex App bundled Node、Windows 用户目录或其他机器专用绝对路径写入 scripts、README 运行命令或项目代码。
- 验证：2026-08-10 当前 Codex Shell 可直接找到 pnpm 11.16.0，但不能直接找到 bundled Node。仅对验证进程临时补齐 Node PATH 后，原样执行 `pnpm test` 为 22/22 PASS，原样执行 `pnpm start` 后 Health 返回 `ok` 且 Provider 为 `mock`。
- 结论：直接运行时的 PATH 差异属于 Codex 宿主环境配置，不是项目级缺陷；不为适配该环境修改可移植 scripts。

## D-022 Phase 3 统一领域结果与安全汇总

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：Phase 3 以 `architecture.md` 的总体状态 `promising | opportunity | needs_data | not_met | not_applicable` 和 criterion 结果 `met | unmet | unknown | manual_review | not_applicable` 为唯一领域枚举；不将 `manual_review` 增加为总体 status。
- 汇总：地域/版本不适用优先，其次是明确硬门槛失败、关键缺数据、人工核验，最后才是无明确缺口的预筛良好。
- A 场景实际结果：四类均为 `opportunity`，而非 Phase 0 早期示意的多项 `promising`。原因是高企领域/综合评分、科技型中小企业证据口径、专精特新平台/市场地位、新雏鹰产业/综合评审均不能由 Mock 结构化数据安全确认。
- 原因：不为演示效果把审计、官方平台、专家或材料真实性偷偷当作 `met`。A 仍是“数值较完整、无明确硬失败”的积极演示场景。
- 公开评分复核：Phase 3 实现时再次查阅科技部有效文件国科发政〔2017〕115号；科技人员指标满分 20，分档为 20/16/12/8/4/0，研发投入满分 50，科技成果满分 30。实现与正式文本一致，不使用记忆中的非官方分值。

## D-023 Phase 3 补充数据与 fixture 完整性

- 状态：`ACCEPTED_FOR_DEMO`
- 决策：用户补充使用第 5 节冻结的 `sourceType=user`，并额外保存 `sourceLabel=user_supplied` / `origin=user_supplied`以明确区分来源。与已有非空 Provider/Mock 值冲突时不覆盖，记入 `fieldConflicts[]` 并交人工核验。
- fixture 更新：A/D 完整场景补齐三年 `domesticRdExpense`、`totalRevenue`、`highTechRevenue`（D）及 `rdScoringMethod`，用于避免把“完整场景”误做成缺数据场景。
- 数据边界：新增值仍是虚构 `demo_mock`，没有改成 `official_platform/official_registry`，不表示真实官方证据。B 继续使用 `null`/字段不存在，C 继续使用 `0/false/空数组`。
