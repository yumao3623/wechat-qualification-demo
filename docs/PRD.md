# 企业政府资质预评估微信小程序 Demo｜产品需求文档（PRD）

> 文档版本：Phase 7 / v1.5
> 规格基线日期：2026-08-10  
> 政策核验日期：2026-08-10  
> 产品性质：招聘能力验证 Demo，仅提供约 1 分钟的准备度预评估，不构成主管部门认定、申报意见或补贴承诺。  
> 当前边界：Phase 7 已实现同一 Express 服务内的本地只读 Admin，展示持久化诊断与脱敏顾问线索并覆盖四态；Phase 6 小程序流程与核心契约未修改。Phase 8 未开始。

## 1. 项目背景

企业面对高新技术企业、科技型中小企业、专精特新中小企业及地方科技企业培育项目时，通常存在政策分散、口径复杂、材料准备滞后和无法解释“不满足在哪里”等问题。本 Demo 以虚构企业公开画像和用户主动补充的经营数据为输入，快速给出四类资质的预评估、证据链、缺口和行动建议，并提供顾问咨询入口。

系统不得将预评估描述为官方认定。任何政策版本、年度申报通知、地区细则或主管部门审核结果与本 Demo 不一致时，以主管部门文件及审核为准。

## 2. 产品目标与成功标准

### 2.1 产品目标

1. 游客无需登录即可完成企业搜索、主体确认、画像查看和动态补数。
2. 仅在用户为发起诊断或查看保存报告明确勾选并确认协议后建立 Session；报告 Tab 的登录按钮本身只打开协议弹窗。
3. 动态表单只询问当前适用规则需要且企业画像中缺失或统计期无效的字段。
4. 同一报告同时覆盖四类资质，并解释每项条件的要求、实际值、来源、判断边界和行动。
5. 不能可靠自动判断的条件输出 `manual_review` 或 `unknown`，不得推定为满足。
6. 通过虚构 Mock 企业覆盖较有希望、需补充数据、暂不满足和地域不适用等场景。

### 2.2 体验与业务指标（Demo 验收口径）

- 首次进入不调用登录或敏感授权 API。
- 从搜索到发起诊断前的游客流程目标操作时长约 1 分钟；该目标不以牺牲必要字段和告知为代价。
- 协议弹窗每次打开时复选框均为 `false`。
- 报告的每个 criterion 均可追溯到规则版本、输入值和数据来源。
- 顾问线索提交成功后真实保存；只显示“咨询需求已提交”。

## 3. 用户角色与需求

| 角色 | 核心需求 | 登录边界 |
| --- | --- | --- |
| 企业经营者/申报负责人 | 快速了解准备度、补齐关键数据、查看差距 | 游客可完成前置流程；创建诊断和查看保存报告需登录 |
| 财务/研发人员 | 理解所需数据口径、统计期和证据材料 | 同上；Demo 不做多人协作 |
| 顾问意向用户 | 提交最小必要联系方式获得后续咨询 | 不强制登录；需对咨询联系用途单独同意 |
| Demo 评审人员 | 可本地复现完整流程并检查规则可解释性 | 使用 Demo Session；不宣称生产身份安全 |
| 本地业务观察者 | 在轻量 Admin 查看诊断和线索 | 仅本地 Demo；不实现生产权限体系 |

## 4. 用户痛点

- 政策条件分散，且全国规则、年度通知和地方规则容易混用。
- 工商公开信息无法覆盖研发费用、研发人员、主营收入、细分市场等核心指标。
- 传统表单一次要求大量数据，无法解释为什么需要填写。
- 单一“符合/不符合”结论掩盖缺失数据和人工核验项。
- 用户在体验价值前被要求登录或授权手机号。

## 5. 产品原则

1. **先体验后登录**：登录不作为浏览前置条件。
2. **先公开数据后补充**：Provider 字段优先，用户只补阻塞判断的信息。
3. **值、单位、期间、来源并重**：有值但期间或单位不匹配仍不能直接使用。
4. **不确定性显式化**：`manual_review` 与 `unknown` 是正常结果，不做乐观猜测。
5. **规则与界面分离**：页面只渲染 Engine 输出，不重新计算政策规则。
6. **政策版本化**：报告保存规则快照；更新规则不重写历史报告。

## 6. 范围与非目标

### 6.1 Demo 范围

- 原生微信小程序三 Tab 与完整主流程。
- Mock Enterprise Provider、动态字段、四类预评估、报告、证据、行动和顾问线索。
- Demo Auth、Session、诊断状态流转、JSON Repository 和本地只读 Admin。
- 四类政策的规则版本、适用地域、自动化边界和人工核验提示。

### 6.2 非目标

- 官方申报、审批、资质证书或补贴发放。
- 政府系统直连、企查查网页爬取、完整商业企业数据库。
- 正式支付、CRM、短信、顾问派单、生产级账号与权限系统。
- 对审计口径、专家评分、细分市场地位或材料真实性作官方结论。
- Phase 1 内实现任何正式页面、后端业务逻辑或 Rule Engine。

## 7. 用户场景与主旅程

```text
首次进入（guest）
→ 首页
→ 企业搜索
→ 主体确认
→ 企业画像
→ 动态补充经营数据（如有）
→ 点击“发起诊断”
→ 协议弹窗（checked=false）
→ 明确同意
→ wx.login
→ Demo Session
→ 创建诊断
→ pending → processing → ready | failed
→ 四类诊断报告
→ 证据链
→ 缺口与行动
→ 报告 Tab 回看
→ 联系顾问（独立隐私同意）
```

关闭协议、拒绝协议或登录失败均不创建诊断，并返回可继续游客浏览的状态。

## 8. 信息架构与页面清单

| 页面/组件 | 入口 | 登录 | 核心任务 |
| --- | --- | --- | --- |
| 首页 Tab | 默认 Tab | 否 | 价值说明、四类资质、开始诊断、免责声明 |
| 企业搜索 | 首页 CTA | 否 | 搜索虚构 Demo 企业；区分无结果和错误 |
| 主体确认 | 搜索结果 | 否 | 核对名称、Demo 编号、法人、成立日、资本、地区、状态、行业 |
| 企业画像 | 确认主体 | 否 | 区分已获取、缺失、待补充并展示来源/期间 |
| 补充经营数据 | 画像页 | 否 | 按缺失 schema 动态填写；保存短期草稿 |
| 协议弹窗 | 发起诊断 CTA | 否 | 展示三份法律文件；默认不勾选；明确同意后才登录 |
| 诊断进度 | 创建诊断成功 | 是 | 展示真实状态、阶段、失败和恢复 |
| 报告详情 | ready 诊断/报告 Tab | 是 | 四类结论、规则版本、免责声明 |
| 证据链 | 报告资质卡 | 是 | 展示每项 criterion 和 evidence |
| 缺口与行动 | 报告资质卡 | 是 | 展示 gap、action、优先级和顾问建议 |
| 报告 Tab | 底部 Tab | 保存数据需登录 | 未登录、无报告、进行中、完成、失败五态 |
| 我的 Tab | 底部 Tab | 否 | 使用说明、隐私、协议、免责声明；已登录才显示退出 |
| 联系顾问 | 报告/行动页 | 否 | 最小化收集并提交咨询线索 |
| 法律/帮助页 | 我的/协议弹窗 | 否 | 使用说明、隐私政策、用户协议、免责声明 |
| Admin | 本地浏览器 | 本地限制 | 只读查看诊断和顾问线索 |

所有页面的 Loading / Empty / Error / Success 规格见 `docs/design.md`。

## 9. 功能需求

### 9.1 企业搜索与主体确认

- 关键词去首尾空格后长度为 2–50 个字符。
- Demo 搜索只返回明显标记的虚构企业，不使用真实统一社会信用代码。
- 搜索结果展示 `isDemoData=true` 和“虚构 Demo 数据”。
- 主体确认前不得创建草稿或诊断；返回重选需清理旧企业上下文。

### 9.2 企业画像与动态补数

- 字段状态：`known`、`missing`、`invalid_period`、`needs_user_input`、`manual_evidence_required`。
- 动态 schema = 适用规则字段需求 − 已知且类型/单位/统计期有效的字段。
- `0` 与 `false` 是有效值，不得按缺失处理。
- 用户补充值标记 `sourceType=user`，不得静默覆盖 Provider 的非空值；冲突时保留两个来源并提示选择/核验。
- 企业财务和研发草稿只做短期本地保存，带 TTL；成功创建诊断、退出或过期后清理。

### 9.3 协议、登录与隐私

- 首次进入、页面 `onLoad`、Tab 切换均不得自动调用 `wx.login` 或手机号授权。
- 协议弹窗包含用户协议、隐私政策、免责声明链接及版本号。
- 每次打开弹窗必须设置 `checked=false`；未勾选点击确认仅提示，不推进状态。
- 关闭/拒绝不登录、不创建诊断、不阻塞游客功能。
- 未登录报告 Tab 只显示游客引导；“登录查看报告”打开报告场景协议弹窗。未勾选、关闭或拒绝均保持游客状态且不调用登录。
- 报告场景明确同意后才允许建立 Session 并加载列表；已有有效 Session 直接加载，不要求每次进入报告重复同意。
- 明确同意后才调用 `wx.login`，由后端换取短期随机 Demo Session。
- 诊断创建还须由后端校验三个协议版本和 `agreedAt`，不能仅依赖前端。
- 顾问 Lead 的手机号处理使用独立告知与同意，不复用诊断协议。

### 9.4 诊断、报告与顾问

- 诊断必须持久化并真实经历 `pending → processing → ready`，或由 `pending/processing → failed`。
- 状态页切后台或重开时从服务端恢复，不依赖单一前端定时器。
- 报告保存输入快照、规则快照、四类结果、证据、缺口、行动和免责声明。
- 报告状态文案仅使用：较有希望、存在机会、需补充数据、暂不满足、不适用。
- 顾问提交校验手机号、长度、同意记录和幂等性；成功文案固定为“咨询需求已提交”。
- 冻结产品逻辑允许在关键字段仍缺失时生成 `needs_data` 报告，不把缺失数据临时改成诊断创建阻断条件。
- 本地报告列表基于本人诊断记录表达空、`pending/processing/ready/failed`；只有 ready 项包含完整四类摘要。

## 10. 规则结果语义

### 10.1 Criterion 结果

| 值 | 含义 |
| --- | --- |
| `met` | 数据口径有效且可自动确认达到预筛条件；仍非官方认定 |
| `unmet` | 数据口径有效且明确未达到预筛门槛 |
| `unknown` | 所需数据缺失、冲突、期间无效或无法获得 |
| `manual_review` | 有数据也不能可靠自动判断，必须核验证据、平台结果、审计或专家意见 |
| `not_applicable` | 地域、主体或规则版本明确不适用 |

### 10.2 资质汇总状态

1. 地域/主体明确不适用：`not_applicable`（不适用）。
2. 关键硬门槛明确失败：`not_met`（暂不满足）。
3. 关键字段缺失：`needs_data`（需补充数据）。
4. 硬门槛大体满足但有人工核验或非硬性风险：`opportunity`（存在机会）。
5. Demo 可自动判断项均通过且未发现重大缺口：`promising`（较有希望）。

`promising` 不得覆盖仍然存在的 `manual_review` 明细，也不得转换为“符合/通过”。

## 11. 政策基线与官方来源

| 资质 | 规则版本/日期 | 适用地域 | 2026-08-10 核验结论 |
| --- | --- | --- | --- |
| 高新技术企业 | 国科发火〔2016〕32号、国科发火〔2016〕195号，均自 2016-01-01 实施 | 中国境内（不含港澳台）的居民企业 | 科技部页面均标记“有效” |
| 科技型中小企业 | 国科发政〔2017〕115号；国科火字〔2022〕67号；2026 年工企业函〔2026〕160号 | 全国；年度评价 | 2017 办法有效；2026 填报 06-01 至 08-31，并强化材料审核/实地核查 |
| 专精特新中小企业 | 工信部企业〔2026〕2号，自 2026-04-01 实施；质量评价引用工信厅企业〔2024〕75号 | 全国，由省级中小企业主管部门认定 | 2022 旧办法中相关认定标准已废止；旧证书按过渡条款持续至到期 |
| 雏鹰企业 | 杭科高〔2024〕50号，自 2024-10-11 实施，有效至 2027-12-31 | 仅杭州市“新雏鹰”区域示例 | 2025 年杭州市科技局有效文件清理目录列为继续有效；非杭州返回不适用 |

官方来源（仅使用政府站点）：

- [高新技术企业认定管理办法（国科发火〔2016〕32号）](https://www.most.gov.cn/xxgk/xinxifenlei/fdzdgknr/fgzc/gfxwj/gfxwj2016/201602/t20160205_123998.html)
- [高新技术企业认定管理工作指引（国科发火〔2016〕195号）](https://www.most.gov.cn/xxgk/xinxifenlei/fdzdgknr/fgzc/gfxwj/gfxwj2016/201606/t20160629_126169.html)
- [科技型中小企业评价办法（国科发政〔2017〕115号）](https://www.most.gov.cn/xxgk/xinxifenlei/fdzdgknr/fgzc/gfxwj/gfxwj2017/201705/t20170510_132709.html)
- [科技型中小企业评价服务工作指引（国科火字〔2022〕67号）](https://kjt.guizhou.gov.cn/wzzt/kjxqypy_5939804/kjxzxqy_5939820/zcwj_5939821/202306/t20230612_80172566.html)
- [2026 年度科技型中小企业评价通知（工企业函〔2026〕160号）](https://wap.miit.gov.cn/jgsj/qyj/wjfb/art/2026/art_92fae9ab4aba4b44a1ab2e7233c48a54.html)
- [优质中小企业梯度培育管理办法（工信部企业〔2026〕2号）](https://wap.miit.gov.cn/cms_files/filemanager/1226211233/attach/20261/0c74a1a375e741f2ae3a5672c298a19c.pdf)
- [工信部对 2026 新办法及质量评价体系的官方解读](https://www.miit.gov.cn/jgsj/qyj/gzdt/art/2026/art_87cabbda70004e95b83e04730abf82e7.html)
- [杭州市“新雏鹰”企业培育管理办法（杭科高〔2024〕50号）](https://zfgb.hangzhou.gov.cn/11/105220253/t117220253054/518938.shtml)
- [杭州市科技局 2025 年规范性文件清理结果（列为继续有效）](https://zfgb.hangzhou.gov.cn/11/109220253/t126220253094/529631.shtml)

政策只在规则版本标注的时点有效。每次进入 Rule Engine 实现/更新阶段和每个申报年度均须重新核验年度通知、地方申报要求和过渡条款。

## 12. 统一字段目录与来源策略

`EnterpriseProvider` 表示可通过授权的数据提供层获得，不等于商业 Provider 一定有该字段。财务、研发、人员、融资及材料真实性通常需要用户补充或官方平台/审计证据。

| 字段组 | 代表字段 key | Provider 可提供 | 动态补充 | 自动化边界 |
| --- | --- | --- | --- | --- |
| 主体 | `enterpriseId`, `name`, `registrationRegion`, `establishedAt`, `legalStatus`, `industryCode` | 是（优先） | 仅纠错，不静默覆盖 | 日期/地域可自动；居民企业、行业适用性可能需核验 |
| 企业规模 | `employeeCount`, `annualRevenue`, `totalAssets`, `totalLiabilities`（按年度） | 可能 | 是 | 比例/阈值自动；会计与合并口径人工核验 |
| 人员 | `techEmployeeCount`, `rdEmployeeCount`（按年度） | 通常否 | 是 | 比例自动；人员定义、工作月数、社保/合同证据人工核验 |
| 研发 | `rdExpense`, `domesticRdExpense`, `costExpense`（按年度） | 通常否 | 是 | 比例自动；归集、专项审计口径人工核验 |
| 收入 | `salesRevenue`, `operatingRevenue`, `mainBusinessRevenue`, `highTechRevenue`（按年度） | 通常否 | 是 | 比例自动；收入分类及高新属性人工核验 |
| 知识产权 | `intellectualProperties[]`（类别、权属、授权日、有效期、来源、产品关联） | 可能 | 是 | 数量/有效期可自动；权属争议、技术关联、经济效益人工核验 |
| 研发成果 | `transformations[]`, `rdInstitutions[]`, `scienceAwards[]`, `standardsLed[]` | 可能 | 是 | 数量可预筛；级别、排名、真实性、质量人工核验 |
| 市场/产品 | `mainProduct`, `marketSegment`, `marketShare`, `futureIndustryCategory` | 通常否 | 是 | 用户选择不能替代官方分类或市场地位核验 |
| 融资/人才 | `equityInvestments[]`, `coreTalentQualifications[]` | 通常否 | 是 | 金额可预筛；合格投资者、实缴、人才等级人工核验 |
| 风险信用 | `businessAbnormal`, `seriousDishonesty`, `majorIncidents[]`, `prohibitedIndustry` | 可能（仅授权官方数据） | 可声明 | 无官方时点证据时 `manual_review` |
| 已有称号 | `qualificationCertificates[]` | 可能 | 是 | 证书状态/有效期可预筛；需官方平台或证书核验 |
| 平台评分 | `specializedDevelopmentScore` | 仅官方平台 | 可录入结果 | 未附官方平台结果一律 `manual_review`，Demo 不复算隐藏公式 |

每个可变指标均须携带 `value`、`unit`、`period`、`sourceType`、`sourceLabel`、`observedAt`、`confidence`；缺任一必要口径时不进入自动阈值判断。

## 13. 四类规则—字段—自动化边界映射

### 13.1 高新技术企业（H）

| Rule ID | 政策条件 | 依赖字段 | 首选来源 | 用户动态补充 | 结果策略 / Demo 简化 |
| --- | --- | --- | --- | --- | --- |
| H-01 | 中国境内（不含港澳台）注册的居民企业 | `registrationCountry`, `registrationRegion`, `residentEnterpriseStatus` | Provider + 税务/登记证据 | `residentEnterpriseStatus` | 地域可自动；居民企业身份无证据时 `manual_review` |
| H-02 | 申请时注册成立一年以上 | `establishedAt`, `assessmentDate` | Provider | 否（仅纠错） | 满 365 日自动 `met/unmet` |
| H-03 | 拥有对主要产品发挥核心支持作用的知识产权所有权 | `intellectualProperties[].owner/status/acquisition/productRelation` | Provider 可给登记信息 | 知识产权清单、产品关联说明 | 有效期/数量预筛；所有权争议、核心支持作用必须 `manual_review`；无任何知识产权可 `unmet` |
| H-04 | 核心技术属于国家重点支持的高新技术领域 | `mainProduct`, `technologyDescription`, `highTechDomainCandidate` | Provider 通常不足 | 是 | 只能给候选领域；最终归类 `manual_review` |
| H-05 | 当年科技人员占职工总数 ≥10% | `employeeCount`, `techEmployeeCount`, 同一年度 | Provider 可能仅有总人数 | 是 | 比例自动；科技人员定义/工作时长证据 `manual_review` |
| H-06 | 近三年研发费用占销售收入：最近一年收入≤5000万为≥5%；5000万–2亿为≥4%；>2亿为≥3%；境内研发费用占比≥60% | 最近 3 年 `salesRevenue`, `rdExpense`, `domesticRdExpense` | 财务数据通常需用户 | 是 | 算术门槛自动；研发归集、审计/鉴证、合并口径 `manual_review` |
| H-07 | 近一年高新技术产品（服务）收入占总收入 ≥60% | `highTechRevenue`, `totalRevenue`, `period` | 通常需用户 | 是 | 比例自动；收入是否属于高新产品 `manual_review` |
| H-08 | 创新能力综合得分 >70（知识产权≤30、成果转化≤30、组织管理≤20、成长性≤20） | IP、`transformations[]`, 管理制度证据、净资产/销售增长 | 混合 | 是 | 专家定性评分不可可靠复算，criterion 固定 `manual_review`；仅展示可准备证据和可复算的成长性指标 |
| H-09 | 申请前一年无重大安全/质量事故或严重环境违法 | `majorIncidents[]`, `assessmentDate` | 授权官方信用/监管数据 | 企业声明 | 无完整官方核验时 `manual_review`；有明确不利官方记录可 `unmet` |

### 13.2 科技型中小企业（T）

| Rule ID | 政策条件 | 依赖字段 | 首选来源 | 用户动态补充 | 结果策略 / Demo 简化 |
| --- | --- | --- | --- | --- | --- |
| T-01 | 中国境内居民企业，会计核算健全、查账征收、可准确归集研发费用并缴纳企业所得税 | `residentEnterpriseStatus`, `accountingSound`, `taxCollectionMethod`, `canAccuratelyCollectRd` | 主体 Provider + 用户材料 | 是 | 地域可自动；会计/税务口径 `manual_review` |
| T-02 | 职工≤500、销售收入≤2亿元、资产≤2亿元 | 同年度 `employeeCount`, `salesRevenue`, `totalAssets` | Provider 可能部分提供 | 是 | 口径有效时自动阈值 |
| T-03 | 产品/服务不属于禁止、限制、淘汰类及研发加计扣除不适用行业 | `industryCode`, `productCategory`, `prohibitedIndustry` | Provider + 官方目录映射 | 产品说明 | 行业映射不确定时 `manual_review` |
| T-04 | 填报上一年及当年无重大事故、严重环境违法、科研严重失信；未列经营异常/严重违法失信 | `majorIncidents[]`, `researchDishonesty`, `businessAbnormal`, `seriousDishonesty` | 授权官方系统 | 用户声明 | 无完整官方证据时 `manual_review`；明确记录可 `unmet` |
| T-05 | 综合评分≥60，且科技人员指标不得为 0 | T-06～T-08 | 用户 + 可核验 IP | 是 | 分档公式自动计算，证据真实性仍人工 |
| T-06 | 科技人员占比得分（30%/25%/20%/15%/10%分档） | `techEmployeeCount`, `employeeCount`, 同年度 | 用户 | 是 | 自动计分；人员定义证据 `manual_review` |
| T-07 | 研发投入二选一计分：研发费/销售收入或研发费/成本费用 | `rdExpense`, `salesRevenue`, `costExpense`, 同年度；用户选择口径 | 用户 | 是 | 自动选用用户明确选择且证据完整的口径；归集真实性人工 |
| T-08 | 有效且与主要产品相关的 I/II 类知识产权分档 | `intellectualProperties[].category/status/dispute/productRelation` | Provider + 用户 | 是 | 数量/有效期自动；无争议与产品关联 `manual_review` |
| T-09 | 满足基础条件后，四类情形之一可直接确认：有效高企、近五年国家科技奖前三、省部级以上研发机构、近五年主导标准前五 | `qualificationCertificates[]`, `scienceAwards[]`, `rdInstitutions[]`, `standardsLed[]` | Provider 可能提供 | 是 | 证书/年限/排名可预筛；材料未核验则 `manual_review`，不自动宣称直接确认 |
| T-10 | 2026 年实地核查触发：≤5人、IP=0、研发费<10万元、近三年相关风险、首次参评 | `employeeCount`, IP 数、`rdExpense`, 风险史、`firstTimeApplicant` | 混合 | 是 | 这是核查触发而非否决条件；触发时增加 `manual_review` 和行动，不返回 `unmet` |
| T-11 | 2026 年申报时间窗 06-01 至 08-31 | `assessmentDate`, `targetApplicationYear` | 系统规则 | 否 | 仅提示当年窗口；窗口外不等同企业不符合，结果为 `manual_review`/行动建议 |

### 13.3 专精特新中小企业（S，2026 新办法）

| Rule ID | 政策条件 | 依赖字段 | 首选来源 | 用户动态补充 | 结果策略 / Demo 简化 |
| --- | --- | --- | --- | --- | --- |
| S-01 | 境内依法设立、符合中小企业划型标准、守法合规；申报期无经营异常/严重失信；近三年无规定重大风险 | 主体、行业规模字段、信用/事故字段 | Provider + 官方监管 | 是 | 企业划型需行业和财务口径；不完整时 `manual_review` |
| S-02 | 已获科技和创新型中小企业称号 | `qualificationCertificates[]`（类型、有效期） | Provider/官方平台 | 是 | 有官方有效证据可 `met`；用户自报无证据 `manual_review` |
| S-03 | 截至上年末从事特定细分市场 ≥3年 | `marketSegment`, `marketSegmentStartDate`, `periodEnd` | 通常用户 | 是 | 年限可计算；“特定细分市场”定义/连续性 `manual_review` |
| S-04 | 上年营收≥1500万 **或** 近两年新增合格机构实缴股权投资≥2000万；主营占比≥80%；资产负债率≤80% | 两年 `operatingRevenue`, `equityInvestments[]`; 上年 `mainBusinessRevenue`, `totalAssets`, `totalLiabilities` | 用户/审计 | 是 | 数值自动；合格投资者、实缴和财务口径 `manual_review` |
| S-05 | 近两年研发费用每年≥100万且每年占营收≥3% | 两年 `rdExpense`, `operatingRevenue` | 用户/审计 | 是 | 比例自动；审计归集 `manual_review` |
| S-06 | ≥1项与主导产品相关、已应用并产生经济效益的 I 类知识产权；符合科技奖/研发机构豁免时不考察 | `intellectualProperties[]`, `mainProduct`, `economicBenefitEvidence`, `scienceAwards[]`, `rdInstitutions[]` | 混合 | 是 | 数量、I类、转入限制、排名可预筛；关联/应用/效益与豁免证据 `manual_review` |
| S-07 | 主导产品在国内或国际细分市场占有率较为靠前且有一定知名度、影响力 | `marketSegment`, `marketShare`, `marketRank`, `influenceEvidence` | 通常用户 | 是 | 政策未给自动数值线，固定 `manual_review` |
| S-08 | 本年度专精特新发展评价得分≥50（复核企业近两年任一年≥50） | `specializedDevelopmentScore`, `scoreYear`, `isRenewal`, `officialPlatformEvidence` | 工信部培育平台 | 可录入平台结果 | Demo 不复算 20 余项平台公式；无官方平台结果固定 `manual_review` |
| S-09 | 2026-04-01 前旧证书按过渡条款至到期有效，到期后按新办法认定/复核 | `certificateIssuedAt`, `certificateExpiresAt`, `assessmentDate` | 官方证书 | 是 | 仅判断适用版本；不把旧证书自动等同新申报条件 |

### 13.4 雏鹰企业（E：杭州“新雏鹰”区域示例）

| Rule ID | 政策条件 | 依赖字段 | 首选来源 | 用户动态补充 | 结果策略 / Demo 简化 |
| --- | --- | --- | --- | --- | --- |
| E-00 | 仅适用杭州市，规则有效至 2027-12-31 | `registrationRegion`, `assessmentDate` | Provider | 否 | 非杭州或规则到期未更新：`not_applicable` |
| E-01 | 杭州市内注册的省科技型中小企业，成立≤5年 | `registrationRegion`, `establishedAt`, `provincialTechSmeCertificate` | Provider + 证书 | 是 | 地域/年限自动；证书无官方证据 `manual_review` |
| E-02 | 产品/服务属于列举的未来产业领域 | `mainProduct`, `futureIndustryCategory`, `technologyDescription` | 用户 | 是 | 用户选择只作候选，最终分类 `manual_review` |
| E-03 | 上年研发人员占职工≥20%，研发费占营收≥10% | `rdEmployeeCount`, `employeeCount`, `rdExpense`, `operatingRevenue`, 同年度 | 用户 | 是 | 比例自动；人员和研发口径人工核验 |
| E-04 | 自研申请核心 IP≥3（其中授权≥1），或 PCT 申请≥1 | `intellectualProperties[].selfDeveloped/applicationType/status` | Provider + 用户 | 是 | 数量/状态自动；自研属性与材料真实性 `manual_review` |
| E-05A | 研发团队核心成员含杭州市 D 类及以上人才≥1，或落地项目获省科技奖二等奖及以上 | `coreTalentQualifications[]`, `scienceAwards[]` | 用户/官方证据 | 是 | 等级、成员关系、项目落地和奖项 `manual_review` |
| E-05B | 上年研发投入≥1000万，或近三年累计≥2000万 | 三年 `rdExpense` | 用户/审计 | 是 | 金额自动；归集证据人工核验 |
| E-05C | 累计获合格机构投资者实缴股权融资≥2000万 | `equityInvestments[]` | 用户/投资材料 | 是 | 金额自动；合格机构与实缴 `manual_review` |
| E-05 | E-05A/B/C 至少一项 | 上述字段 | 混合 | 是 | 仅当一条有充分证据时预筛 `met`；否则 `manual_review/unknown` |
| E-06 | 未列入严重失信名单 | `seriousDishonesty`, `checkedAt` | 信用中国/官方部门 | 可声明 | 无近期官方查询证据 `manual_review` |
| E-07 | 官方还需审核推荐、综合评审，必要时现场考察 | 申报材料、评审结果 | 主管部门 | 否 | 永久 `manual_review`；Demo 不预测专家择优结果 |

## 14. 动态字段优先级

1. 先判断地域、规则日期和主体是否适用，避免询问不适用项目的数据。
2. 优先询问会阻塞多个资质的低成本字段：年度营收、人数、研发人数、研发费用。
3. 再询问知识产权、主营收入、资产负债、融资等结构化字段。
4. 定性材料仅询问“是否有证据/可上传或待核验”，不强迫用户在 1 分钟内完成专家判断。
5. 对 `manual_review` 所需的长材料只生成行动项，不把上传完整申报材料纳入 Demo。

## 15. Report、Evidence、Gap/Action 与 Lead 产品要求

- `Report`：报告身份、企业和输入快照、诊断状态、四类资质结果、规则快照、免责声明。
- `Evidence`：criterion、政策要求、实际值、单位/期间、字段来源、结果、缺失项、解释、建议。
- `Gap`：关联规则、类型（未满足/缺失/人工核验）、影响、优先级、证据引用。
- `Action`：关联 gap、建议行动、优先级、负责人建议、是否建议咨询、非承诺说明。
- `ConsultantLead`：最小化联系人、手机号、企业、咨询方向、可选备注、独立同意版本/时间、提交时间与状态。

精确定义见 `docs/architecture.md`。

## 16. 异常与恢复

| 场景 | 产品行为 |
| --- | --- |
| 搜索无结果 | 显示 Empty，不伪造真实企业；可更换关键词 |
| Provider/API 失败 | 显示友好错误码和重试；不展示堆栈 |
| 企业被重选 | 清理旧企业草稿和动态 schema |
| 数据值冲突 | 同时保留来源，标记冲突并要求确认/人工核验 |
| 统计期不匹配 | 当作 `invalid_period`，不参与规则计算 |
| 协议未勾选/关闭 | 不登录、不创建诊断，继续游客浏览 |
| `wx.login` 或换 Session 失败 | 可重试；不得创建半成品诊断 |
| Session 过期 | 受保护请求返回 401；用户主动重新登录，草稿按 TTL 策略保留 |
| 重复创建 | 使用幂等键返回同一诊断，不重复保存 |
| 诊断失败 | 状态为 `failed`，显示可理解的错误与重新发起入口 |
| 报告未就绪 | 返回进度状态，不返回空壳报告 |
| Lead 校验失败 | 字段级提示；不保存部分个人信息 |
| 服务重启 | 从 JSON 快照和创建时间恢复状态推进，不依赖仅内存定时器 |
| 越权读取 | 其他用户的诊断/报告统一按 404 处理，减少资源枚举 |

## 17. 验收标准

### 17.1 Phase 1 文档验收

- PRD 覆盖背景、角色、痛点、目标、非目标、场景、旅程、IA、页面、功能、登录/隐私、动态表单、规则、报告、顾问、异常和验收。
- 四类政策逐条包含官方来源、版本/日期、地域、字段依赖、Provider/用户来源、自动/人工边界和 Demo 简化。
- 设计、架构和测试文档与本 PRD 的状态名称、页面登录边界和数据模型无冲突。
- API 的 request/response/error、Session、诊断状态机和关键模型可直接供 Phase 2–4 实现。
- 所有尚未执行的测试状态为 `NOT EXECUTED`。

### 17.2 最终 Demo 验收（后续阶段）

- `CODEX_TASK.md` 指定主流程可本地复现。
- 游客访问、协议时序、登录边界、四类结果、证据、行动、报告 Tab 五态和顾问提交均真实可用。
- Mock A/B/C/D 场景覆盖目标状态且明确为虚构数据。
- 不存在明文凭证、内部堆栈、保证性文案或将 `manual_review` 当通过的行为。

### 17.3 Phase 5 实现与验收边界

- 游客可从首页到达搜索、主体确认、画像与动态补数；页面不调用 `wx.login`、用户资料/手机号授权或登录 API。
- 搜索和企业详情使用现有 REST API；动态补数只渲染 `/api/assessments/missing-fields` 返回的 schema，保存后再请求 Backend 重算。
- 补充草稿按企业 ID 隔离、TTL 为 2 小时；不建立用户 Session。
- 报告 Tab 只显示游客说明，“我的”只显示帮助/法律菜单，不显示退出登录。
- Node 自动测试与真实 HTTP 链路已执行；用户于 2026-08-10 在微信开发者工具完成 Phase 5 游客流程及 Phase 6 核心流程人工 E2E，Phase 6 所列 30 项均为 `PASS`。真机、草稿真实等待 2 小时过期、故障注入、多尺寸/键盘和前后台生命周期专项检查仍为 `NOT EXECUTED`。

### 17.4 Phase 7 Admin 实现与验收边界

- Admin 入口为同一 Backend 的 `/admin/`，使用原生 HTML/CSS/JavaScript，不进入微信小程序导航。
- 诊断和线索只读取现有 JSON Repository；没有第二套评估逻辑，也不修改历史 Report。
- 诊断字段为企业、诊断 ID、状态、报告状态和创建时间；线索字段为企业、联系人、脱敏手机号、咨询方向和提交时间。
- 页面和 API 默认仅允许 Backend 本机访问；这只是 Demo 限制，不宣称生产鉴权。
- Loading / Empty / Error / Success、非本地 403、手机号和内部认证字段过滤均已自动验证并完成本地浏览器实际检查。

## 18. 已知限制与发布门

- 政策核验时点为 2026-08-10；后续年度通知可能改变申报时间和材料要求。
- 专精特新发展评价得分依赖官方培育平台，Demo 不掌握完整计算环境，必须使用平台结果或人工核验。
- 企业经营、研发、人员、知识产权关联和市场数据大多不是工商基础字段，用户填写不等于已核验。
- 杭州“新雏鹰”只作为区域示例；若产品指定其他城市，应新增独立规则版本，不能静默替换。
- Demo Session 不等于生产微信认证；生产上线需 `code2Session`、正式 AppID/AppSecret、数据保护和安全审查。
