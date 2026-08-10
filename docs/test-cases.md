# 企业政府资质预评估微信小程序 Demo｜测试用例与需求追踪

> 文档版本：Phase 1 / v1.0  
> 规格日期：2026-08-10  
> 执行说明：Phase 1 只完成测试规格，没有实现可执行系统。以下所有测试均真实保持 `NOT EXECUTED`；文档审查不等同功能测试通过。

## 1. 状态与执行规则

- `PASS`：按用例步骤实际执行，结果与预期一致且有证据。
- `FAIL`：已实际执行且至少一项预期不满足。
- `NOT EXECUTED`：未实际执行，或当前阶段无可执行实现。
- 自动测试结果不能替代微信开发者工具人工 E2E；模拟器结果不能替代要求的真机合规验证。
- 后端、Rule Engine 或政策规则发生修改后，须重跑相关用例并记录日期、环境和证据。

## 2. 游客、导航与页面

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| UI-GUEST-001 | 首页游客访问 | DevTools E2E | 清空本地存储，冷启动 | 打开小程序并停留首页 | 首页可浏览；无 `wx.login`、手机号授权或协议弹窗；显示价值、四类资质、CTA 和免责声明 | NOT EXECUTED |
| UI-NAV-001 | Tab 导航 | DevTools E2E | 游客状态 | 依次打开首页、报告、我的 Tab，再返回首页 | 三 Tab 可切换；未登录报告 Tab 不自动授权；我的法律入口可见 | NOT EXECUTED |
| UI-NAV-002 | 普通页返回 | DevTools E2E | 已进入主体确认 | 返回搜索并再次选择另一企业 | 导航正确；不保留旧企业上下文或补充值 | NOT EXECUTED |
| UI-STATE-001 | 通用四态 | DevTools E2E | 可注入 Loading/Empty/Error/Success | 逐页触发四态 | 状态布局、文案、按钮可见；Error 不展示内部堆栈 | NOT EXECUTED |
| UI-LEGAL-001 | 法律/帮助 | DevTools E2E | 游客状态 | 从我的打开使用说明、隐私、协议、免责声明 | 均可免登录查看；标题、版本、生效日期和正文存在 | NOT EXECUTED |

## 3. Enterprise Provider、搜索、确认与画像

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| ENT-PROV-001 | Mock Provider 搜索 | Unit | 四家虚构 fixture | 搜索可匹配关键词 | 返回正确摘要；均有 `isDemoData=true`、`DEMO-*` 编号和虚构标签 | NOT EXECUTED |
| ENT-PROV-002 | Mock Provider 无结果 | Unit | Provider 可用 | 搜索不存在关键词 | 返回空数组而非异常 | NOT EXECUTED |
| ENT-PROV-003 | Mock Provider 详情 | Unit | 已知企业 ID | 查询详情 | 返回 canonical profile、字段 provenance、`fetchedAt` 和 Demo 标签 | NOT EXECUTED |
| ENT-PROV-004 | Mock Provider 不存在 ID | Unit | 不存在 ID | 查询详情 | Provider 返回 `null`，service 映射为 404 | NOT EXECUTED |
| ENT-PROV-005 | Provider 契约 | Contract | Mock 与未来测试替身 | 对两个实现执行同一契约套件 | 不透传供应商结构；未知为 `null`；错误类别一致 | NOT EXECUTED |
| ENT-DATA-001 | fixture 一致性 | Unit | A/B/C/D fixture | 校验 ID、人数、收入、比例、统计期 | ID 唯一；研发人数≤总人数；主营≤营收；期间和单位有效 | NOT EXECUTED |
| ENT-SEARCH-001 | 搜索成功 | DevTools E2E | 游客，API 正常 | 输入合法关键词并搜索 | 显示 Loading 后展示匹配虚构企业及 Demo 标签 | NOT EXECUTED |
| ENT-SEARCH-002 | 搜索无结果 | DevTools E2E | 游客，API 正常 | 输入无匹配关键词 | 显示 Empty 和更换关键词入口，不伪造企业 | NOT EXECUTED |
| ENT-SEARCH-003 | 搜索校验 | API/UI | 游客 | 提交空、1 字、>50 字关键词 | 返回/显示字段级校验；不发无效搜索或服务端返回 400 | NOT EXECUTED |
| ENT-SEARCH-004 | 搜索故障 | DevTools E2E | 注入 503 | 发起搜索 | 显示可重试错误，不显示上游响应或堆栈 | NOT EXECUTED |
| ENT-SEARCH-005 | 搜索竞态 | Frontend unit/E2E | 可控制两次请求先后 | 快速提交 A 后提交 B，让 A 后返回 | 页面只显示最新 B 的结果 | NOT EXECUTED |
| ENT-CONFIRM-001 | 主体确认 | DevTools E2E | 已选择企业 | 查看关键字段并确认 | 名称、Demo 编号、法人、日期、资本、地区、状态、行业可见；进入画像 | NOT EXECUTED |
| ENT-CONFIRM-002 | 返回重选 | DevTools E2E | 企业 A 已有草稿 | 返回并选择企业 B | A 的草稿/schema 不进入 B | NOT EXECUTED |
| ENT-PROFILE-001 | 企业画像分组 | DevTools E2E | B 场景部分字段缺失 | 打开画像 | 已获取、缺失、需补充/核验分区正确，显示来源和期间 | NOT EXECUTED |
| ENT-PROFILE-002 | 画像 API 失败 | DevTools E2E | 注入详情 503 | 打开画像并重试 | 显示 Error；重试成功后正常恢复 | NOT EXECUTED |

## 4. 动态字段与补充数据

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| FORM-001 | 缺失字段计算 | Unit | 规则需收入/研发/人数，画像已有收入 | 生成 schema | 只返回研发和人数相关缺失项；`requiredFor` 完整 | NOT EXECUTED |
| FORM-002 | 字段合并 | Unit | 多类规则需要同一年度研发费用 | 生成 schema | 只出现一个字段，合并所有 rule ID | NOT EXECUTED |
| FORM-003 | `0`/`false` 边界 | Unit | 字段值分别为 0、false | 计算缺失 | 两者不被当作缺失；仍可被规则判定未满足 | NOT EXECUTED |
| FORM-004 | 无效期间 | Unit | 有 2024 值但规则需要 2025 | 计算缺失 | 标记 `invalid_period` 并要求 2025 值，不误用旧数据 | NOT EXECUTED |
| FORM-005 | 单位错误 | Unit/API | 金额字段单位缺失或错误 | 请求 missing-fields/提交补数 | 返回 422 或字段错误，不进入评估 | NOT EXECUTED |
| FORM-006 | 地域裁剪 | Unit | 企业注册地非杭州 | 生成 schema | 不为杭州新雏鹰单独询问字段；该资质预期不适用 | NOT EXECUTED |
| FORM-007 | 动态页面渲染 | DevTools E2E | B 场景 | 进入补充页 | 只渲染服务端 schema；标签、单位、期间、用途、帮助可见 | NOT EXECUTED |
| FORM-008 | 补数影响结果 | Integration/E2E | B 场景初始缺研发数据 | 记录初始 missing；补齐有效值；重新评估 | 缺失 schema 减少，报告 criterion/总体状态按规则真实变化 | NOT EXECUTED |
| FORM-009 | 数据冲突 | Unit/E2E | Provider 与用户给出不同非空值 | 提交补充 | 保留两个来源并要求确认/人工核验，不静默覆盖 | NOT EXECUTED |
| FORM-010 | 草稿 TTL | Frontend unit/E2E | 已保存敏感草稿 | 模拟未过期、过期、创建成功、退出 | 未过期可恢复；过期/成功/退出后清理；日志无草稿 | NOT EXECUTED |

## 5. 协议、登录与 Session

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CONSENT-001 | 协议默认值 | Unit/DevTools E2E | 从未打开弹窗 | 打开、勾选、关闭、重新打开 | 每次打开 `checked=false` | NOT EXECUTED |
| CONSENT-002 | 未同意确认 | DevTools E2E | 弹窗打开且未勾选 | 点击“同意并发起诊断” | 留在弹窗并提示；无 `wx.login`；无诊断 | NOT EXECUTED |
| CONSENT-003 | 关闭/拒绝 | DevTools E2E | 弹窗打开 | 点击关闭或暂不发起 | 返回原页；仍可游客浏览；无登录/诊断 | NOT EXECUTED |
| CONSENT-004 | 明确同意时序 | DevTools E2E | 弹窗未勾选 | 勾选并确认，观察调用 | 先同意，再调用 `wx.login`，Session 成功后才创建诊断 | NOT EXECUTED |
| CONSENT-005 | 服务端协议门 | Integration | 有 Session | 缺一版本、未同意、时间无效、来源错误分别创建 | 均返回 409/400；不保存 assessment | NOT EXECUTED |
| AUTH-001 | 首次无自动登录 | DevTools E2E | 清空状态 | 冷启动、切 Tab、浏览游客页面 | 全程不调用 `wx.login`，直到用户明确触发 | NOT EXECUTED |
| AUTH-002 | Demo 登录成功 | Integration | 合法非空 code | POST `/auth/login` | 返回随机 token 一次、`authMode=demo`、有效期；Repository 仅存摘要 | NOT EXECUTED |
| AUTH-003 | 登录输入校验 | Integration | 无 Session | 提交空、超长或类型错误 code | 返回 400；不创建 Session；日志无 code | NOT EXECUTED |
| AUTH-004 | 登录失败恢复 | DevTools E2E | 注入 `wx.login` 或后端失败 | 明确同意并发起 | 显示尚未创建诊断；可重试/关闭；游客功能仍可用 | NOT EXECUTED |
| AUTH-005 | 查询 Session | Integration | 有效 token | GET `/auth/session` | 返回当前 Session，不含 token/hash | NOT EXECUTED |
| AUTH-006 | 缺失/无效/过期 token | Integration | 三种 token 状态 | 请求受保护 API | 分别返回稳定 401 错误；不泄露资源 | NOT EXECUTED |
| AUTH-007 | 退出登录 | Integration/DevTools | 已登录且有本地 token | DELETE Session 并回到 Tab | 服务端吊销、本地清除 token/敏感草稿；报告 Tab 回未登录态 | NOT EXECUTED |
| AUTH-008 | 报告 Tab 主动登录 | DevTools E2E | 游客进入报告 Tab | 不点击按钮后观察；再点击“登录查看报告” | 初始无授权；点击后才调用 `wx.login` | NOT EXECUTED |

## 6. 诊断状态机与 API

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| ASM-001 | 创建诊断 | Integration | 有效 Session、完整协议、合法输入 | POST `/assessments` | 201，持久化 `pending`、输入/协议/规则快照 | NOT EXECUTED |
| ASM-002 | 未登录创建 | Integration | 无 Session | POST `/assessments` | 401；无持久化记录 | NOT EXECUTED |
| ASM-003 | 创建幂等 | Integration | 有效请求 | 使用同一幂等键重复提交 | 返回同一 assessment，不重复创建/报告 | NOT EXECUTED |
| ASM-004 | 幂等键冲突 | Integration | 同一幂等键 | 第二次修改 payload 提交 | 409 `STATE_CONFLICT`；原记录不变 | NOT EXECUTED |
| ASM-005 | 正常状态流转 | Unit/Integration fake clock | pending assessment | 推进 clock 并轮询 | 严格 `pending→processing→ready`，阶段单向且报告只生成一次 | NOT EXECUTED |
| ASM-006 | 失败状态流转 | Unit/Integration | 注入领域错误 | 推进状态 | `pending/processing→failed`；错误码友好；不得转 ready | NOT EXECUTED |
| ASM-007 | 重启恢复 | Integration | processing 已持久化 | 重建 app/repository 后查询 | 依创建时间/clock 继续推进，不永久卡住 | NOT EXECUTED |
| ASM-008 | 状态权限隔离 | Integration | 用户 A/B，各有 Session | B 查询 A 的 assessment | 404（防枚举）且无数据泄露 | NOT EXECUTED |
| ASM-009 | 报告未就绪 | Integration | assessment pending/processing | GET assessment report | 409 `REPORT_NOT_READY` 并返回状态链接 | NOT EXECUTED |
| ASM-010 | 进度前后台恢复 | DevTools E2E | processing | 切后台再回前台 | 后台停止轮询；回前台立即读服务端并恢复阶段 | NOT EXECUTED |
| ASM-011 | 诊断失败 UI | DevTools E2E | failed assessment | 打开进度/报告 Tab | 显示失败态、可理解原因和重新发起，不显示空报告 | NOT EXECUTED |

## 7. Rule Engine 与四类政策

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RULE-COMMON-001 | Engine 纯度 | Unit | 标准 profile/context | 在无 HTTP/UI/filesystem 下调用 | 输出确定、可序列化；不读全局时间 | NOT EXECUTED |
| RULE-COMMON-002 | 统一结构 | Unit | A/B/C/D | 评估四类 | 每类含 status/criteria/evidence/missing/gaps/actions/ruleVersion；criterion 字段完整 | NOT EXECUTED |
| RULE-COMMON-003 | 汇总优先级 | Unit | 构造不适用、硬失败、缺失、人工核验、全预筛通过 | 评估 | 依 `not_applicable→not_met→needs_data→opportunity→promising` 规则归并 | NOT EXECUTED |
| RULE-H-001 | 高企成立年限边界 | Unit | 成立 364、365、366 日 | 评估 H-02 | 364 unmet；365/366 met | NOT EXECUTED |
| RULE-H-002 | 高企研发比例档位 | Unit | 最近收入在 5000万、2亿边界及各比例上下 | 评估 H-06 | 含边界按 5%/4%/3% 正确；境内占比另行判断 | NOT EXECUTED |
| RULE-H-003 | 高企人员/收入比例 | Unit | 同期人数与高新收入值 | 评估 H-05/H-07 | 10%、60% 边界正确；期间不同返回 unknown | NOT EXECUTED |
| RULE-H-004 | 高企人工核验 | Unit | 有 IP/领域/创新材料但无专家结论 | 评估 H-03/H-04/H-08 | 产品关联、领域归属、创新能力为 `manual_review`，不自动 met | NOT EXECUTED |
| RULE-T-001 | 科技型中小企业规模门槛 | Unit | 500人、2亿元收入/资产及超出值 | 评估 T-02 | 等于上限 met；超出任一关键门槛 unmet | NOT EXECUTED |
| RULE-T-002 | 科技人员分档 | Unit | 30/25/20/15/10% 及略低 | 计算 T-06 | 分档分数与官方边界一致；<10% 得 0 | NOT EXECUTED |
| RULE-T-003 | 研发二选一评分 | Unit | 两种口径均有值 | 明确选择收入/成本口径 | 只按选定合法口径计分；未选择时 unknown，不取更高值猜测 | NOT EXECUTED |
| RULE-T-004 | 科技成果分档/关联 | Unit | I/II 类不同数量 | 评估 T-08 | 数量分档正确；产品关联/无争议无证据时保留 manual_review | NOT EXECUTED |
| RULE-T-005 | 直接确认条件 | Unit | 四类直接确认材料分别存在 | 评估 T-09 | 有可核验证据可走直接确认预筛；仅用户声明为 manual_review | NOT EXECUTED |
| RULE-T-006 | 2026 实地核查触发 | Unit | ≤5人、IP=0、研发<10万、首次参评 | 评估 T-10 | 生成 manual_review/action，不把触发本身判为 unmet | NOT EXECUTED |
| RULE-S-001 | 2026 版本门 | Unit | 评估日在 2026-04-01 前/后 | 选择规则版本 | 之后使用工信部企业〔2026〕2号；旧证书按到期过渡，不用旧标准评新申请 | NOT EXECUTED |
| RULE-S-002 | 专精特新财务门槛 | Unit | 营收/融资 OR、主营占比、负债率边界 | 评估 S-04 | OR 与 1500万/2000万、80%、80% 边界正确；投资者/实缴为 manual_review | NOT EXECUTED |
| RULE-S-003 | 专精特新两年研发 | Unit | 两年各 100万和3%边界、一年不满足 | 评估 S-05 | 两年均满足才通过数值预筛；任一年明确不足为 unmet | NOT EXECUTED |
| RULE-S-004 | 专精特新 IP/豁免 | Unit | I 类 IP、奖项/研发机构不同证据 | 评估 S-06 | 关联/应用/效益及豁免真实性为 manual_review；不凭数量直接 met | NOT EXECUTED |
| RULE-S-005 | 市场地位 | Unit | 用户填写市场份额/排名但无权威证据 | 评估 S-07 | 固定 `manual_review`，不得推定“靠前/有影响力” | NOT EXECUTED |
| RULE-S-006 | 平台质量评分 | Unit | 无得分、自报 50、附官方平台 50 | 评估 S-08 | 无/纯自报为 manual_review；有可核验平台结果按新申请边界预筛 | NOT EXECUTED |
| RULE-E-001 | 杭州地域 | Unit | 杭州/非杭州企业 | 评估 E-00 | 杭州继续；非杭州 `not_applicable`，不询问专属字段 | NOT EXECUTED |
| RULE-E-002 | 新雏鹰有效期 | Unit | 2027-12-31 与 2028-01-01 | 评估 E-00 | 到有效期当日按规则；之后未复核新文件则 not_applicable/manual action | NOT EXECUTED |
| RULE-E-003 | 新雏鹰比例/IP | Unit | 20%、10%、核心 IP/PCT 边界 | 评估 E-03/E-04 | 数量和比例正确；自研/类别/证据为 manual_review | NOT EXECUTED |
| RULE-E-004 | 新雏鹰三选一 | Unit | 人才奖项、研发投入、融资分别满足/缺证据 | 评估 E-05 | OR 逻辑正确；金额可预筛，资质/实缴/归集保留 manual_review | NOT EXECUTED |
| RULE-E-005 | 未来产业与官方评审 | Unit | 用户选择未来产业 | 评估 E-02/E-07 | 领域归类和最终综合评审均 `manual_review` | NOT EXECUTED |
| RULE-MOCK-001 | A/B/C/D 目标覆盖 | Unit | 四家基准企业 | 完整评估 | A 多项较有希望；B 需补数据；C 关键项暂不满足；D 新雏鹰不适用 | NOT EXECUTED |

## 8. 报告、证据、缺口与行动

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RPT-001 | 报告生成 | Unit/Integration | 四类结果存在 | 生成 Report | 恰好四类；保存输入 hash、规则版本、生成时间和免责声明 | NOT EXECUTED |
| RPT-002 | 报告不可变 | Integration | 已生成报告后更新规则 | 再查旧报告 | 旧报告规则/结果不变；新诊断使用新版本 | NOT EXECUTED |
| RPT-003 | 报告权限 | Integration | 用户 A/B | B 查询 A 的报告 | 404 且无摘要泄露 | NOT EXECUTED |
| RPT-004 | 报告列表 | Integration | 当前用户有 ready/processing/failed | GET `/reports` | 只返回本人摘要、分页和正确状态 | NOT EXECUTED |
| RPT-005 | 报告详情 UI | DevTools E2E | ready 报告 | 打开报告 | 四类卡、规则日期/地域、manual_review 数量、免责声明和入口可见 | NOT EXECUTED |
| EVD-001 | Evidence 完整性 | Unit | 各类 criterion | 生成 evidence | 每项有 ruleId、criterion、requirement、actualValue/source/result/missing/explanation/action/policyRef | NOT EXECUTED |
| EVD-002 | 缺失与零值展示 | Unit/UI | 一项 null、一项 0 | 展示证据 | null 显示未提供且 missing 非空；0 显示为 0 | NOT EXECUTED |
| EVD-003 | 派生值追溯 | Unit/UI | 比例 criterion | 展示 evidence | 可见分子、分母、公式、单位和同一统计期 | NOT EXECUTED |
| GAP-001 | Gap 生成 | Unit | unmet/unknown/manual/conflict | 生成 gaps | 类型、影响、优先级、关联 evidence 和 missingFields 正确 | NOT EXECUTED |
| ACT-001 | Action 生成 | Unit | gaps 存在 | 生成 actions | 每个阻塞 gap 有非承诺建议、优先级、材料和顾问建议 | NOT EXECUTED |
| RPT-TAB-001 | 报告 Tab 未登录 | DevTools E2E | 游客 | 打开报告 Tab | 解释登录原因和主动按钮，不自动授权 | NOT EXECUTED |
| RPT-TAB-002 | 报告 Tab 无报告 | DevTools E2E | 已登录无记录 | 打开报告 Tab | Empty + 开始预评估 CTA | NOT EXECUTED |
| RPT-TAB-003 | 报告 Tab 进行中 | DevTools E2E | pending/processing | 打开报告 Tab | 显示企业、阶段和进度入口 | NOT EXECUTED |
| RPT-TAB-004 | 报告 Tab 已完成 | DevTools E2E | ready | 打开报告 Tab | 显示报告摘要并可进入详情 | NOT EXECUTED |
| RPT-TAB-005 | 报告 Tab 失败 | DevTools E2E | failed | 打开报告 Tab | 显示失败原因和恢复入口，不显示空报告 | NOT EXECUTED |
| COPY-001 | 禁止承诺文案 | Static | 代码/fixture/文档完成 | 扫描面向用户文案 | 不出现保证通过、一定符合、已获资质、官方通过、保证补贴等承诺 | NOT EXECUTED |

## 9. 顾问、Admin、安全与异常 API

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LEAD-001 | 游客提交顾问 | Integration/E2E | 无 Session，合法表单且独立同意 | POST Lead | 201 并真实保存；UI 显示“咨询需求已提交” | NOT EXECUTED |
| LEAD-002 | Lead 同意默认值 | DevTools E2E | 首次/重开表单 | 打开、勾选、退出、重开 | 独立同意每次默认 false；不复用诊断协议 | NOT EXECUTED |
| LEAD-003 | Lead 输入校验 | Integration | 无 Session | 非法手机号、姓名过长、空方向、备注>500 | 各自 400；不保存部分记录 | NOT EXECUTED |
| LEAD-004 | Lead 幂等 | Integration | 合法请求 | 同一幂等键重复提交 | 返回同一 Lead，不重复保存 | NOT EXECUTED |
| LEAD-005 | 可选手机号授权 | DevTools/真机 | 若实现可选授权 | 拒绝授权后手填并提交 | 拒绝不阻塞；手填路径完整可用 | NOT EXECUTED |
| ADMIN-001 | Admin 诊断列表 | Browser E2E | 本地有诊断 | 打开 Admin | 显示企业、ID、状态、创建时间、报告状态及 Demo 标记 | NOT EXECUTED |
| ADMIN-002 | Admin Lead 列表 | Browser E2E | 本地有 Lead | 打开 Admin | 显示要求字段，手机号默认脱敏；只读 | NOT EXECUTED |
| ADMIN-003 | Admin 本地限制 | Integration | 非本地来源/未启用 | 请求 Admin API | 403；页面明确非生产权限方案 | NOT EXECUTED |
| API-001 | 统一成功/错误格式 | Integration | API 可用 | 覆盖 2xx/400/401/404/409/422/500/503 | 响应符合 envelope；含 requestId；无堆栈 | NOT EXECUTED |
| API-002 | 404 | Integration | 任意未知路由 | 请求不存在 endpoint | 返回 JSON 404，不返回 HTML 堆栈 | NOT EXECUTED |
| API-003 | 输入边界 | Integration | API 可用 | 提交超长、错误类型、未知枚举、逻辑矛盾 | 返回稳定校验错误；无异常崩溃 | NOT EXECUTED |
| SEC-001 | 敏感信息扫描 | Static | 工程和配置存在 | 扫描 Key/Secret/token/密码模式 | 无真实 AppSecret、企查查 Secret、token、生产密码 | NOT EXECUTED |
| SEC-002 | 日志脱敏 | Integration | 触发登录、Lead、诊断错误 | 检查日志 | 不记录 code、Bearer token、完整手机号或经营敏感 payload | NOT EXECUTED |
| SEC-003 | Runtime Git 隔离 | Static | 运行生成数据 | 检查 Git 状态 | `.env`、runtime JSON、token/Lead 数据不被跟踪 | NOT EXECUTED |
| ERR-001 | JSON 损坏 | Integration | runtime 文件损坏 | 启动/读取 | 返回明确内部错误并保留损坏文件，不静默覆盖为空 | NOT EXECUTED |
| ERR-002 | 弱网/超时 | DevTools/真机 | 注入超时或弱网 | 搜索、登录、轮询、Lead | 有超时与重试；不重复创建/提交；状态可恢复 | NOT EXECUTED |

## 10. 微信开发者工具人工 E2E 主清单

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-001 | 完整主流程 | DevTools E2E | Mock B 或适合展示的虚构企业，服务正常 | 游客首页→搜索→确认→画像→动态补数→协议未勾选→同意→登录→进度→四类报告→证据→行动→报告 Tab→顾问 | `CODEX_TASK.md` 指定链路完整可复现；所有关键按钮真实改变状态 | NOT EXECUTED |
| E2E-002 | 拒绝协议分支 | DevTools E2E | 到协议弹窗 | 不勾选、拒绝、关闭分别尝试 | 均无登录和诊断，游客仍可浏览 | NOT EXECUTED |
| E2E-003 | 登录/网络失败恢复 | DevTools E2E | 注入失败 | 明确同意后触发失败再恢复 | 不产生重复任务；重试后可继续 | NOT EXECUTED |
| E2E-004 | 四企业场景 | DevTools E2E | A/B/C/D fixture | 分别完成或查看预设诊断 | 状态覆盖较有希望、需补数据、暂不满足、新雏鹰不适用 | NOT EXECUTED |
| E2E-005 | 屏幕与交互适配 | DevTools E2E | 窄屏/标准屏 | 检查长名、键盘、滚动、触控、长证据 | 无关键遮挡/横向溢出；键盘不挡提交；触控可用 | NOT EXECUTED |
| E2E-006 | 前后台与冷启动 | DevTools E2E | 有草稿/processing/session | 切后台、关闭重开、冷启动 | 草稿按 TTL 恢复；进度从后端恢复；Session 状态一致 | NOT EXECUTED |
| E2E-007 | 真机网络与隐私 | 真机 | 可用测试 AppID、HTTPS 合法域名 | 验证 `wx.login`、弱网、隐私/可选手机号 | 行为与文档一致；失败可恢复；隐私机制符合当时平台要求 | NOT EXECUTED |

## 11. Requirement Traceability Check

检查日期：2026-08-10。结果含义为“规格已落文档”，不表示代码完成或测试通过。

| CODEX_TASK.md 章节 | 需求主题 | 规格落点 | Phase 1 检查结果 |
| --- | --- | --- | --- |
| 1 | 项目目标、四类资质、预评估边界 | `PRD.md` 1–2、11–13、17 | 已覆盖 |
| 2 | 低门槛、公开数据优先、动态补数、可解释 | `PRD.md` 5、9、12–15；`design.md` 1、10–16 | 已覆盖 |
| 3 | 首页/报告/我的三 Tab 和登录要求 | `PRD.md` 8；`design.md` 3、7、17–18 | 已覆盖 |
| 4 | 首页、搜索、确认、画像、动态表单 | `PRD.md` 8–9；`design.md` 7–11 | 已覆盖 |
| 5 | 发起诊断协议弹窗，默认未勾选 | `PRD.md` 9.3；`design.md` 12；CONSENT 用例 | 已覆盖 |
| 6 | 登录触发时机、游客页面、`wx.login` | `PRD.md` 9.3；`architecture.md` 9.3、10；AUTH 用例 | 已覆盖 |
| 7 | 诊断进度和真实状态流转 | `design.md` 13；`architecture.md` 11；ASM 用例 | 已覆盖 |
| 8 | 四类报告、允许/禁用文案、免责声明 | `PRD.md` 10、15；`design.md` 14；RPT/COPY 用例 | 已覆盖 |
| 9 | 证据链字段和 Engine 来源 | `PRD.md` 15；`design.md` 15；`architecture.md` 13 | 已覆盖 |
| 10 | 缺口与行动 | `PRD.md` 15；`design.md` 16；`architecture.md` 14 | 已覆盖 |
| 11 | 联系顾问、游客和可选手机号 | `PRD.md` 9.3–9.4、15；`design.md` 19；`architecture.md` 9.7、15 | 已覆盖 |
| 12 | Enterprise Provider 与禁止爬取 | `PRD.md` 12；`architecture.md` 6、19 | 已覆盖 |
| 13 | 四个虚构 Mock 场景 | `PRD.md` 2.1、17；RULE-MOCK/fixture 用例 | 已覆盖；具体 fixture 留 Phase 2 |
| 14 | 独立 Qualification Engine 和统一结果 | `PRD.md` 10、13；`architecture.md` 7 | 已覆盖 |
| 15 | 动态表单真实计算 | `PRD.md` 9.2、14；`architecture.md` 7.3；FORM 用例 | 已覆盖 |
| 16 | 企业、登录、诊断、报告、顾问 API | `architecture.md` 8–9 | 已覆盖 |
| 17 | 轻量 Admin 诊断/Lead | `design.md` 20；`architecture.md` 9.8；ADMIN 用例 | 已覆盖 |
| 18 | Loading/Empty/Error/Success | `design.md` 5–6 及逐页规格；UI-STATE 用例 | 已覆盖 |
| 19 | PRD 必需章节 | `PRD.md` 全文 | 已覆盖 |
| 20 | design.md 必需章节 | `design.md` 全文 | 已覆盖 |
| 21 | architecture.md 必需章节 | `architecture.md` 全文 | 已覆盖 |
| 22 | test-cases.md 字段和覆盖范围 | 本文件 1–10 | 已覆盖，全部 NOT EXECUTED |
| 23 | README 启动指导要求 | 根 `README.md` Phase 1 骨架 | 已建立骨架；运行内容须随实现补齐 |
| 24 | 完整 Demo 验收场景 | `PRD.md` 7；E2E-001 | 已规格化，未执行 |
| 25 | 开发优先级 | `PRD.md` 2、5、17；`architecture.md` 20 | 已覆盖 |
| 26 | 明确非目标 | `PRD.md` 6；`architecture.md` 17 | 已覆盖 |

### 11.1 AGENTS.md 追加追踪

| 约束 | 规格落点 | 检查结果 |
| --- | --- | --- |
| 四类政策来源、版本、地域、简化和人工边界 | `PRD.md` 11–13 | 已覆盖，来源均为政府官方站点 |
| 每个 criterion 字段要求 | `PRD.md` 13；`architecture.md` 7、13 | 已覆盖 |
| 报告 Tab 五态 / 我的条件退出 | `design.md` 17–18 | 已覆盖 |
| 协议拒绝不登录不阻塞 | `PRD.md` 9.3；`design.md` 12 | 已覆盖 |
| 敏感信息与环境变量 | `architecture.md` 18 | 已覆盖 |
| 测试状态必须真实 | 本文件 1；全部用例 Status | 全部 NOT EXECUTED |
| 人工 E2E Checklist | 本文件 10；`design.md` 22 | 已覆盖 |

## 12. Phase 1 测试结论

- 功能测试：`NOT EXECUTED`（无正式实现，符合阶段边界）。
- API 测试：`NOT EXECUTED`。
- Rule Engine 测试：`NOT EXECUTED`。
- 微信开发者工具 E2E：`NOT EXECUTED`。
- 真机验证：`NOT EXECUTED`。

