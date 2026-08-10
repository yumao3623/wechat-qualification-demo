# 企业政府资质预评估微信小程序 Demo｜测试用例与需求追踪

> 文档版本：Phase 8 / v1.8
> 规格日期：2026-08-10  
> 最近执行：2026-08-10，Node.js v24.19.0（满足项目 `>=20` 约束），Windows，Mock Provider + Demo Auth。Phase 8 共 92 tests / 92 PASS / 0 FAIL；包含 Phase 2–7 全量回归、独立 Backend 子进程完整 E2E和跨字段错误映射。用户使用测试 AppID 完成 14 项 DevTools 最终冒烟并全部 PASS。真机 HTTPS、弱网和专项多尺寸/键盘仍保持 `NOT EXECUTED`。

## 1. 状态与执行规则

- `PASS`：按用例步骤实际执行，结果与预期一致且有证据。
- `FAIL`：已实际执行且至少一项预期不满足。
- `NOT EXECUTED`：未实际执行，或当前阶段无可执行实现。
- 自动测试结果不能替代微信开发者工具人工 E2E；模拟器结果不能替代要求的真机合规验证。
- 后端、Rule Engine 或政策规则发生修改后，须重跑相关用例并记录日期、环境和证据。

## 2. 游客、导航与页面

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| UI-GUEST-001 | 首页游客访问 | DevTools E2E | 清空本地存储，冷启动 | 打开小程序并停留首页 | 首页可浏览；无 `wx.login`、手机号授权或协议弹窗；显示价值、四类资质、CTA 和免责声明 | PASS |
| UI-NAV-001 | Tab 导航 | DevTools E2E | 游客状态 | 依次打开首页、报告、我的 Tab，再返回首页 | 三 Tab 可切换；未登录报告 Tab 不自动授权；我的法律入口可见 | PASS |
| UI-NAV-002 | 普通页返回 | DevTools E2E | 已进入主体确认 | 返回搜索并再次选择另一企业 | 导航正确；不保留旧企业上下文或补充值 | NOT EXECUTED |
| UI-STATE-001 | 通用四态 | DevTools E2E | 可注入 Loading/Empty/Error/Success | 逐页触发四态 | 状态布局、文案、按钮可见；Error 不展示内部堆栈 | NOT EXECUTED |
| UI-LEGAL-001 | 法律/帮助 | DevTools E2E | 游客状态 | 从我的打开使用说明、隐私、协议、免责声明 | 均可免登录查看；标题、版本、生效日期和正文存在 | PASS |

## 3. Enterprise Provider、搜索、确认与画像

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| ENT-PROV-001 | Mock Provider 搜索 | Unit | 四家虚构 fixture | 搜索可匹配关键词 | 返回正确摘要；均有 `isDemoData=true`、`DEMO-*` 编号和虚构标签 | PASS |
| ENT-PROV-002 | Mock Provider 无结果 | Unit | Provider 可用 | 搜索不存在关键词 | 返回空数组而非异常 | PASS |
| ENT-PROV-003 | Mock Provider 详情 | Unit | 已知企业 ID | 查询详情 | 返回 canonical profile、字段 provenance、`fetchedAt` 和 Demo 标签 | PASS |
| ENT-PROV-004 | Mock Provider 不存在 ID | Unit | 不存在 ID | 查询详情 | Provider 返回 `null`，service 映射为 404 | PASS |
| ENT-PROV-005 | Provider 契约 | Contract | Mock 与未来测试替身 | 对两个实现执行同一契约套件 | 不透传供应商结构；未知为 `null`；错误类别一致 | NOT EXECUTED |
| ENT-DATA-001 | fixture 一致性 | Unit | A/B/C/D fixture | 校验 ID、人数、收入、比例、统计期 | ID 唯一；研发人数≤总人数；主营≤营收；期间和单位有效 | PASS |
| ENT-SEARCH-001 | 搜索成功 | DevTools E2E | 游客，API 正常 | 输入合法关键词并搜索 | 显示 Loading 后展示匹配虚构企业及 Demo 标签 | PASS |
| ENT-SEARCH-002 | 搜索无结果 | DevTools E2E | 游客，API 正常 | 输入无匹配关键词 | 显示 Empty 和更换关键词入口，不伪造企业 | NOT EXECUTED |
| ENT-SEARCH-003 | 搜索校验 | API/UI | 游客 | 提交空、1 字、>50 字关键词 | 返回/显示字段级校验；不发无效搜索或服务端返回 400 | NOT EXECUTED |
| ENT-SEARCH-004 | 搜索故障 | DevTools E2E | 注入 503 | 发起搜索 | 显示可重试错误，不显示上游响应或堆栈 | NOT EXECUTED |
| ENT-SEARCH-005 | 搜索竞态 | Frontend unit/E2E | 可控制两次请求先后 | 快速提交 A 后提交 B，让 A 后返回 | 页面只显示最新 B 的结果 | NOT EXECUTED |
| ENT-CONFIRM-001 | 主体确认 | DevTools E2E | 已选择企业 | 查看关键字段并确认 | 名称、Demo 编号、法人、日期、资本、地区、状态、行业可见；进入画像 | PASS |
| ENT-CONFIRM-002 | 返回重选 | DevTools E2E | 企业 A 已有草稿 | 返回并选择企业 B | A 的草稿/schema 不进入 B | NOT EXECUTED |
| ENT-PROFILE-001 | 企业画像分组 | DevTools E2E | B 场景部分字段缺失 | 打开画像 | 已获取、缺失、需补充/核验分区正确，显示来源和期间 | PASS |
| ENT-PROFILE-002 | 画像 API 失败 | DevTools E2E | 注入详情 503 | 打开画像并重试 | 显示 Error；重试成功后正常恢复 | NOT EXECUTED |

## 4. 动态字段与补充数据

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| FORM-001 | 缺失字段计算 | Unit | 规则需收入/研发/人数，画像已有收入 | 生成 schema | 只返回研发和人数相关缺失项；`requiredFor` 完整 | PASS |
| FORM-002 | 字段合并 | Unit | 多类规则需要同一年度研发费用 | 生成 schema | 只出现一个字段，合并所有 rule ID | PASS |
| FORM-003 | `0`/`false` 边界 | Unit | 字段值分别为 0、false | 计算缺失 | 两者不被当作缺失；仍可被规则判定未满足 | PASS |
| FORM-004 | 无效期间 | Unit | 有 2024 值但规则需要 2025 | 计算缺失 | 标记 `invalid_period` 并要求 2025 值，不误用旧数据 | PASS |
| FORM-005 | 单位错误 | Unit/API | 金额字段单位缺失或错误 | 请求 missing-fields/提交补数 | 返回 422 或字段错误，不进入评估 | PASS |
| FORM-006 | 地域裁剪 | Unit | 企业注册地非杭州 | 生成 schema | 不为杭州新雏鹰单独询问字段；该资质预期不适用 | PASS |
| FORM-007 | 动态页面渲染 | DevTools E2E | B 场景 | 进入补充页 | 只渲染服务端 schema；标签、单位、期间、用途、帮助可见 | PASS |
| FORM-008 | 补数影响结果 | Integration/E2E | B 场景初始缺研发数据 | 记录初始 missing；补齐有效值；重新评估 | 缺失 schema 减少，报告 criterion/总体状态按规则真实变化 | PASS |
| FORM-009 | 数据冲突 | Unit/E2E | Provider 与用户给出不同非空值 | 提交补充 | 保留两个来源并要求确认/人工核验，不静默覆盖 | PASS |
| FORM-010 | 草稿 TTL | Frontend unit/E2E | 已保存敏感草稿 | 模拟未过期、过期、创建成功、退出 | 未过期可恢复；过期/成功/退出后清理；日志无草稿 | NOT EXECUTED |

## 5. 协议、登录与 Session

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CONSENT-001 | 协议默认值 | Unit/DevTools E2E | 从未打开弹窗 | 打开、勾选、关闭、重新打开 | 每次打开 `checked=false` | PASS |
| CONSENT-002 | 未同意确认 | DevTools E2E | 弹窗打开且未勾选 | 点击“同意并发起诊断” | 留在弹窗并提示；无 `wx.login`；无诊断 | PASS |
| CONSENT-003 | 关闭/拒绝 | DevTools E2E | 弹窗打开 | 点击关闭或暂不发起 | 返回原页；仍可游客浏览；无登录/诊断 | PASS |
| CONSENT-004 | 明确同意时序 | DevTools E2E | 弹窗未勾选 | 勾选并确认，观察调用 | 先同意，再调用 `wx.login`，Session 成功后才创建诊断 | PASS |
| CONSENT-005 | 服务端协议门 | Integration | 有 Session | 缺一版本、未同意、时间无效、来源错误分别创建 | 均返回 409/400；不保存 assessment | PASS |
| AUTH-001 | 首次无自动登录 | DevTools E2E | 清空状态 | 冷启动、切 Tab、浏览游客页面 | 全程不调用 `wx.login`，直到用户明确触发 | PASS |
| AUTH-002 | Demo 登录成功 | Integration | 合法非空 code | POST `/auth/login` | 返回随机 token 一次、`authMode=demo`、有效期；Repository 仅存摘要 | PASS |
| AUTH-003 | 登录输入校验 | Integration | 无 Session | 提交空、超长或类型错误 code | 返回 400；不创建 Session；日志无 code | PASS |
| AUTH-004 | 登录失败恢复 | DevTools E2E | 注入 `wx.login` 或后端失败 | 明确同意并发起 | 显示尚未创建诊断；可重试/关闭；游客功能仍可用 | NOT EXECUTED |
| AUTH-005 | 查询 Session | Integration | 有效 token | GET `/auth/session` | 返回当前 Session，不含 token/hash | PASS |
| AUTH-006 | 缺失/无效/过期 token | Integration | 三种 token 状态 | 请求受保护 API | 分别返回稳定 401 错误；不泄露资源 | PASS |
| AUTH-007 | 退出登录（后端） | Integration | 已登录且有 token | DELETE Session 后用旧 token 请求个人报告 | 服务端吊销；旧 token 失效且已生成报告不删除 | PASS |
| AUTH-008 | 报告 Tab 协议登录 | DevTools E2E | 游客进入报告 Tab | 观察无自动登录；点击“登录查看报告”；分别未勾选、关闭、拒绝、勾选确认 | 按钮只开默认未勾选协议；前三种保持游客且无登录；明确同意后才调用 `wx.login` 并加载列表 | PASS |

## 6. 诊断状态机与 API

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| ASM-001 | 创建诊断 | Integration | 有效 Session、完整协议、合法输入 | POST `/assessments` | 201，持久化 `pending`、输入/协议/规则快照 | PASS |
| ASM-002 | 未登录创建 | Integration | 无 Session | POST `/assessments` | 401；无持久化记录 | PASS |
| ASM-003 | 创建幂等 | Integration | 有效请求 | 使用同一幂等键重复提交 | 返回同一 assessment，不重复创建/报告 | PASS |
| ASM-004 | 幂等键冲突 | Integration | 同一幂等键 | 第二次修改 payload 提交 | 409 `STATE_CONFLICT`；原记录不变 | PASS |
| ASM-005 | 正常状态流转 | Unit/Integration fake clock | pending assessment | 推进 clock 并轮询 | 严格 `pending→processing→ready`，阶段单向且报告只生成一次 | PASS |
| ASM-006 | 失败状态流转 | Unit/Integration | 注入领域错误 | 推进状态 | `pending/processing→failed`；错误码友好；不得转 ready | PASS |
| ASM-007 | 重启恢复 | Integration | processing 已持久化 | 重建 app/repository 后查询 | 依创建时间/clock 继续推进，不永久卡住 | PASS |
| ASM-008 | 状态权限隔离 | Integration | 用户 A/B，各有 Session | B 查询 A 的 assessment | 404（防枚举）且无数据泄露 | PASS |
| ASM-009 | 报告未就绪 | Integration | assessment pending/processing | GET assessment report | 409 `REPORT_NOT_READY` 并返回状态链接 | PASS |
| ASM-010 | 进度前后台恢复 | DevTools E2E | processing | 切后台再回前台 | 后台停止轮询；回前台立即读服务端并恢复阶段 | NOT EXECUTED |
| ASM-011 | 诊断失败 UI | DevTools E2E | failed assessment | 打开进度/报告 Tab | 显示失败态、可理解原因和重新发起，不显示空报告 | NOT EXECUTED |

## 7. Rule Engine 与四类政策

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RULE-COMMON-001 | Engine 纯度 | Unit | 标准 profile/context | 在无 HTTP/UI/filesystem 下调用 | 输出确定、可序列化；不读全局时间 | PASS |
| RULE-COMMON-002 | 统一结构 | Unit | A/B/C/D | 评估四类 | 每类含 status/criteria/evidence/missing/gaps/actions/ruleVersion；criterion 字段完整 | PASS |
| RULE-COMMON-003 | 汇总优先级 | Unit | 构造不适用、硬失败、缺失、人工核验、全预筛通过 | 评估 | 依 `not_applicable→not_met→needs_data→opportunity→promising` 规则归并 | PASS |
| RULE-H-001 | 高企成立年限边界 | Unit | 成立 364、365、366 日 | 评估 H-02 | 364 unmet；365/366 met | PASS |
| RULE-H-002 | 高企研发比例档位 | Unit | 最近收入在 5000万、2亿边界及各比例上下 | 评估 H-06 | 含边界按 5%/4%/3% 正确；境内占比另行判断 | NOT EXECUTED |
| RULE-H-003 | 高企人员/收入比例 | Unit | 同期人数与高新收入值 | 评估 H-05/H-07 | 10%、60% 边界正确；期间不同返回 unknown | NOT EXECUTED |
| RULE-H-004 | 高企人工核验 | Unit | 有 IP/领域/创新材料但无专家结论 | 评估 H-03/H-04/H-08 | 产品关联、领域归属、创新能力为 `manual_review`，不自动 met | PASS |
| RULE-T-001 | 科技型中小企业规模门槛 | Unit | 500人、2亿元收入/资产及超出值 | 评估 T-02 | 等于上限 met；超出任一关键门槛 unmet | PASS |
| RULE-T-002 | 科技人员分档 | Unit | 30/25/20/15/10% 及略低 | 计算 T-06 | 分档分数与官方边界一致；<10% 得 0 | PASS |
| RULE-T-003 | 研发二选一评分 | Unit | 两种口径均有值 | 明确选择收入/成本口径 | 只按选定合法口径计分；未选择时 unknown，不取更高值猜测 | PASS |
| RULE-T-004 | 科技成果分档/关联 | Unit | I/II 类不同数量 | 评估 T-08 | 数量分档正确；产品关联/无争议无证据时保留 manual_review | NOT EXECUTED |
| RULE-T-005 | 直接确认条件 | Unit | 四类直接确认材料分别存在 | 评估 T-09 | 有可核验证据可走直接确认预筛；仅用户声明为 manual_review | NOT EXECUTED |
| RULE-T-006 | 2026 实地核查触发 | Unit | ≤5人、IP=0、研发<10万、首次参评 | 评估 T-10 | 生成 manual_review/action，不把触发本身判为 unmet | NOT EXECUTED |
| RULE-S-001 | 2026 版本门 | Unit | 评估日在 2026-04-01 前/后 | 选择规则版本 | 之后使用工信部企业〔2026〕2号；旧证书按到期过渡，不用旧标准评新申请 | NOT EXECUTED |
| RULE-S-002 | 专精特新财务门槛 | Unit | 营收/融资 OR、主营占比、负债率边界 | 评估 S-04 | OR 与 1500万/2000万、80%、80% 边界正确；投资者/实缴为 manual_review | NOT EXECUTED |
| RULE-S-003 | 专精特新两年研发 | Unit | 两年各 100万和3%边界、一年不满足 | 评估 S-05 | 两年均满足才通过数值预筛；任一年明确不足为 unmet | PASS |
| RULE-S-004 | 专精特新 IP/豁免 | Unit | I 类 IP、奖项/研发机构不同证据 | 评估 S-06 | 关联/应用/效益及豁免真实性为 manual_review；不凭数量直接 met | NOT EXECUTED |
| RULE-S-005 | 市场地位 | Unit | 用户填写市场份额/排名但无权威证据 | 评估 S-07 | 固定 `manual_review`，不得推定“靠前/有影响力” | PASS |
| RULE-S-006 | 平台质量评分 | Unit | 无得分、自报 50、附官方平台 50 | 评估 S-08 | 无/纯自报为 manual_review；有可核验平台结果按新申请边界预筛 | PASS |
| RULE-E-001 | 杭州地域 | Unit | 杭州/非杭州企业 | 评估 E-00 | 杭州继续；非杭州 `not_applicable`，不询问专属字段 | PASS |
| RULE-E-002 | 新雏鹰有效期 | Unit | 2027-12-31 与 2028-01-01 | 评估 E-00 | 到有效期当日按规则；之后未复核新文件则 not_applicable/manual action | PASS |
| RULE-E-003 | 新雏鹰比例/IP | Unit | 20%、10%、核心 IP/PCT 边界 | 评估 E-03/E-04 | 数量和比例正确；自研/类别/证据为 manual_review | NOT EXECUTED |
| RULE-E-004 | 新雏鹰三选一 | Unit | 人才奖项、研发投入、融资分别满足/缺证据 | 评估 E-05 | OR 逻辑正确；金额可预筛，资质/实缴/归集保留 manual_review | NOT EXECUTED |
| RULE-E-005 | 未来产业与官方评审 | Unit | 用户选择未来产业 | 评估 E-02/E-07 | 领域归类和最终综合评审均 `manual_review` | NOT EXECUTED |
| RULE-MOCK-001 | A/B/C/D 目标覆盖 | Unit | 四家基准企业 | 完整评估 | A 数值无明确硬失败但人工核验使总体为 opportunity；B 需补数据；C 关键项暂不满足；D 新雏鹰不适用 | PASS |

## 8. 报告、证据、缺口与行动

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RPT-001 | 报告生成 | Unit/Integration | 四类结果存在 | 生成 Report | 恰好四类；保存输入 hash、规则版本、生成时间和免责声明 | PASS |
| RPT-002 | 报告不可变 | Integration | 已生成报告后更新规则 | 再查旧报告 | 旧报告规则/结果不变；新诊断使用新版本 | NOT EXECUTED |
| RPT-003 | 报告权限 | Integration | 用户 A/B | B 查询 A 的报告 | 404 且无摘要泄露 | PASS |
| RPT-004 | 报告列表 | Integration | 当前用户有 ready/processing/failed | GET `/reports` | 只返回本人摘要、分页和正确状态 | PASS |
| RPT-005 | 报告详情 UI | DevTools E2E | ready 报告 | 打开报告 | 四类卡、规则日期/地域、manual_review 数量、免责声明和入口可见 | PASS |
| EVD-001 | Evidence 完整性 | Unit | 各类 criterion | 生成 evidence | 每项有 ruleId、criterion、requirement、actualValue/source/result/missing/explanation/action/policyRef | PASS |
| EVD-002 | 缺失与零值展示 | Unit/UI | 一项 null、一项 0 | 展示证据 | null 显示未提供且 missing 非空；0 显示为 0 | NOT EXECUTED |
| EVD-003 | 派生值追溯 | Unit/UI | 比例 criterion | 展示 evidence | 可见分子、分母、公式、单位和同一统计期 | NOT EXECUTED |
| GAP-001 | Gap 生成 | Unit | unmet/unknown/manual/conflict | 生成 gaps | 类型、影响、优先级、关联 evidence 和 missingFields 正确 | NOT EXECUTED |
| ACT-001 | Action 生成 | Unit | gaps 存在 | 生成 actions | 每个阻塞 gap 有非承诺建议、优先级、材料和顾问建议 | NOT EXECUTED |
| RPT-TAB-001 | 报告 Tab 未登录 | DevTools E2E | 游客 | 打开报告 Tab | 解释登录原因和主动按钮，不自动授权 | PASS |
| RPT-TAB-002 | 报告 Tab 无报告 | DevTools E2E | 已登录无记录 | 打开报告 Tab | Empty + 开始预评估 CTA | NOT EXECUTED |
| RPT-TAB-003 | 报告 Tab 进行中 | DevTools E2E | pending/processing | 打开报告 Tab | 显示企业、阶段和进度入口 | NOT EXECUTED |
| RPT-TAB-004 | 报告 Tab 已完成 | DevTools E2E | ready | 打开报告 Tab | 显示报告摘要并可进入详情 | PASS |
| RPT-TAB-005 | 报告 Tab 失败 | DevTools E2E | failed | 打开报告 Tab | 显示失败原因和恢复入口，不显示空报告 | NOT EXECUTED |
| COPY-001 | 禁止承诺文案 | Static | 代码/fixture/文档完成 | 扫描面向用户文案 | 不出现保证通过、一定符合、已获资质、官方通过、保证补贴等承诺 | PASS |

## 9. 顾问、Admin、安全与异常 API

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LEAD-001 | 游客提交顾问 | Integration | 无 Session，合法表单且独立同意 | POST Lead | 201 并真实保存；前端成功文案待 Phase 6 | PASS |
| LEAD-002 | Lead 同意默认值 | DevTools E2E | 首次/重开表单 | 打开、勾选、退出、重开 | 独立同意每次默认 false；不复用诊断协议 | NOT EXECUTED |
| LEAD-003 | Lead 输入校验 | Integration | 无 Session | 非法手机号、姓名过长、空方向、备注>500 | 各自 400；不保存部分记录 | PASS |
| LEAD-004 | Lead 幂等 | Integration | 合法请求 | 同一幂等键重复提交 | 返回同一 Lead，不重复保存 | PASS |
| LEAD-005 | 可选手机号授权 | DevTools/真机 | 若实现可选授权 | 拒绝授权后手填并提交 | 拒绝不阻塞；手填路径完整可用 | NOT EXECUTED |
| ADMIN-001 | Admin 诊断列表 | Integration + Browser E2E | 本地有诊断 | 打开 Admin | 显示企业、ID、状态、创建时间、报告状态及 Demo 标记 | PASS |
| ADMIN-002 | Admin Lead 列表 | Integration + Browser E2E | 本地有 Lead | 打开 Admin | 显示要求字段，手机号默认脱敏；只读 | PASS |
| ADMIN-003 | Admin 本地限制 | Integration | 非本地来源 | 请求 Admin API/静态页 | 403；页面明确非生产权限方案 | PASS |
| ADMIN-004 | Admin 四态与安全过滤 | Integration + Browser E2E | 空/正常/断开 Backend/读取异常 | 加载、刷新并检查响应 | Loading / Empty / Error / Success 可见；无 Session/Hash/完整手机号/堆栈 | PASS |
| API-001 | 统一成功/错误格式 | Integration | API 可用 | 覆盖 2xx/400/401/404/409/422/500/503 | 响应符合 envelope；含 requestId；无堆栈 | PASS |
| API-002 | 404 | Integration | 任意未知路由 | 请求不存在 endpoint | 返回 JSON 404，不返回 HTML 堆栈 | PASS |
| API-003 | 输入边界 | Integration | API 可用 | 提交超长、错误类型、未知枚举、逻辑矛盾 | 返回稳定校验错误；无异常崩溃 | PASS |
| SEC-001 | 敏感信息扫描 | Static | 工程和配置存在 | 扫描 Key/Secret/token/密码模式 | 无真实 AppSecret、企查查 Secret、token、生产密码 | PASS |
| SEC-002 | 日志脱敏 | Integration | 触发登录、Lead、诊断错误 | 检查日志 | 不记录 code、Bearer token、完整手机号或经营敏感 payload | NOT EXECUTED |
| SEC-003 | Runtime Git 隔离 | Static | 运行生成数据 | 检查 Git 状态 | `.env`、runtime JSON、token/Lead 数据不被跟踪 | PASS |
| ERR-001 | JSON 损坏 | Integration | runtime 文件损坏 | 启动/读取 | 返回明确内部错误并保留损坏文件，不静默覆盖为空 | PASS |
| ERR-002 | 弱网/超时 | DevTools/真机 | 注入超时或弱网 | 搜索、登录、轮询、Lead | 有超时与重试；不重复创建/提交；状态可恢复 | NOT EXECUTED |

## 10. 微信开发者工具人工 E2E 主清单

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-001 | 完整主流程 | DevTools E2E | Mock B 或适合展示的虚构企业，服务正常 | 游客首页→搜索→确认→画像→动态补数→协议未勾选→同意→登录→进度→四类报告→证据→行动→报告 Tab→顾问 | `CODEX_TASK.md` 指定链路完整可复现；所有关键按钮真实改变状态 | PASS |
| E2E-002 | 拒绝协议分支 | DevTools E2E | 到协议弹窗 | 不勾选、拒绝、关闭分别尝试 | 均无登录和诊断，游客仍可浏览 | PASS |
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
| 测试状态必须真实 | 本文件 1；全部用例 Status | 按自动、HTTP、DevTools、真机分别记录，未执行项不冒充 PASS |
| 人工 E2E Checklist | 本文件 10；`design.md` 22 | 已覆盖 |

## 12. Phase 1 历史测试结论

- 功能测试：`NOT EXECUTED`（无正式实现，符合阶段边界）。
- API 测试：`NOT EXECUTED`。
- Rule Engine 测试：`NOT EXECUTED`。
- 微信开发者工具 E2E：`NOT EXECUTED`。
- 真机验证：`NOT EXECUTED`。

## 13. Phase 2 执行记录

自动测试命令（桌面环境使用 bundled Node 的绝对路径执行等价 `node --test`）：

```text
node --test
```

结果：22 tests，22 PASS，0 FAIL，0 skipped。以下为 Phase 2 新增的精确执行追踪：

可移植性复核：`package.json` 的 `test` 为 `node --test`，`start` 为 `node server/src/server.js`。Codex App Shell 的 bundled Node 未默认加入 PATH；仅在验证进程临时补齐 PATH 后，标准 `pnpm test` 通过 22/22，标准 `pnpm start` 启动并返回健康检查 `ok/mock`。未向仓库写入任何宿主绝对路径。

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P2-HEALTH-001 | Health Check | Integration + live HTTP | Backend 可启动 | GET `/api/health` | 200；统一 envelope；`status=ok`；Provider 为 mock；有 request ID | PASS |
| P2-API-001 | 企业搜索 | Integration + live HTTP | 四家 fixture | GET `/api/enterprises?keyword=星澜` | 200；只返回 A；摘要为 canonical 且标记 Demo | PASS |
| P2-API-002 | 搜索无结果 | Integration | Provider 可用 | 搜索“没有匹配” | 200；`items=[]`，不返回 404 | PASS |
| P2-API-003 | 企业详情 | Integration + live HTTP | A 存在 | GET `/api/enterprises/demo-a-001` | 200；详情、provenance、Demo 标识完整 | PASS |
| P2-API-004 | 企业不存在 | Integration | 合法但不存在 ID | 查询 `demo-z-999` | 404 `ENTERPRISE_NOT_FOUND`，无 stack | PASS |
| P2-API-005 | 企业输入校验 | Integration | API 可用 | 空/1 字/数组关键词，非法 limit/cursor/ID | 400 `VALIDATION_ERROR`，字段原因与 request ID 完整 | PASS |
| P2-API-006 | 搜索 cursor 分页 | Integration | 四家 fixture | 以 `limit=2` 连续请求两页 | 两页无重复覆盖四家；末页 `nextCursor=null` | PASS |
| P2-API-007 | JSON body parsing | Integration | API 可用 | 提交畸形 JSON | 400 `VALIDATION_ERROR`；定位 body；无 stack | PASS |
| P2-ARCH-001 | Route / Provider 解耦 | Integration | 注入不读取 fixture 的 fake Provider | 搜索并查详情 | Route 使用注入返回；调用参数符合 Provider 契约 | PASS |
| P2-ERR-001 | Provider 错误屏蔽 | Integration | 注入 `PROVIDER_UNAVAILABLE` | 发起搜索 | 503 `DEPENDENCY_UNAVAILABLE`；可重试；不暴露内部错误/stack | PASS |
| P2-DATA-001 | Scenario 与缺失语义 | Unit | A/B/C/D fixture | 校验场景、关系及 B/C 边界 | A/B/C/D 唯一；D 非杭州；`0/false/null/字段不存在` 可区分 | PASS |
| P2-SEC-001 | 敏感信息签名扫描 | Static | 工程与配置存在 | 扫描常见云 Key、OpenAI/GitHub token、私钥和非空企业/微信 Secret | 未发现真实凭证签名；`.env` 与 runtime 已忽略 | PASS |
| P2-PORT-001 | package scripts 可移植性 | Runtime | Node 已加入验证进程 PATH | 原样执行 `pnpm test`、`pnpm start` 并请求 Health | 测试 22/22；服务启动；scripts 无宿主绝对路径 | PASS |

本阶段未执行且保持 `NOT EXECUTED`：微信开发者工具/真机、小程序页面、动态表单、Rule Engine、登录/Session、诊断、报告、顾问和 Admin。它们不属于 Phase 2。

## 14. Phase 3 执行记录

自动测试命令（Codex 桌面验证进程使用 bundled Node；项目脚本仍为可移植的 `node --test`）：

```text
node --test
```

结果：47 tests，47 PASS，0 FAIL，0 skipped。其中包含 Phase 2 的 22 项全量回归。

Phase 3 新增并实际执行的领域覆盖：

| Test ID | Module | Type | Precondition | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P3-RULE-001 | 四类 Evaluator | Unit | A/B/C/D fixture + 固定 context | 独立调用四个 Evaluator/Engine | 恰好四类、统一结构、版本/地域完整 | PASS |
| P3-RULE-002 | 门槛边界 | Unit | 成立日、规模、评分档、两年研发边界 | 执行 H/T/S/E 对应规则 | 边界取等和超限结果符合冻结规格 | PASS |
| P3-RULE-003 | 人工核验 | Unit | 无审计/平台/专家结论 | 评估定性与官方证据项 | 保留 `manual_review`，不伪造 met/平台分数 | PASS |
| P3-MOCK-001 | Scenario A | Unit | 完整优势型 | 执行四类评估 | 四类均 `opportunity`，无 missing/硬失败，保留人工核验 | PASS |
| P3-MOCK-002 | Scenario B | Unit | 关键数据缺失型 | 初次评估、以用户来源补齐、再评估 | 初始四类 `needs_data`；schema 20 项；补齐后 schema 0 且转 `opportunity` | PASS |
| P3-MOCK-003 | Scenario C | Unit | `0/false/空 IP` 已知 | 执行四类评估 | 四类 `not_met`；0/false 不被当 missing | PASS |
| P3-MOCK-004 | Scenario D | Unit | 宁波企业 | 评估杭州新雏鹰并生成 schema | `not_applicable`；不询问杭州专属字段 | PASS |
| P3-FORM-001 | Dynamic Missing Fields | Unit | 多 Evaluator 重复需求 | 计算、合并、排序 schema | 按规则需求减已知有效值；`requiredFor` 合并 | PASS |
| P3-FORM-002 | 缺失语义 | Unit | `0/false/null/undefined`、错期间/单位 | 计算 schema | 0/false 已知；null/undefined 缺失；口径错误有稳定原因 | PASS |
| P3-MERGE-001 | 用户补充合并 | Unit | 缺失字段和已有字段 | 合并补充值 | `user/user_supplied`、保留统计期；冲突不覆盖并交人工核验 | PASS |
| P3-EVD-001 | Evidence/Gap/Action | Unit | met/unmet/unknown/manual 结果 | 生成统一领域输出 | Evidence 字段完整；缺口/行动关联；建议无承诺 | PASS |
| P3-RPT-001 | Report Domain | Unit | 四类结果与输入快照 | 生成 Report | 四类唯一；企业快照/hash/规则/证据/缺口/行动/时间/免责声明完整 | PASS |
| P3-PURE-001 | 纯度与不变性 | Unit | 冻结 profile/context | 连续评估并对比原对象 | 输出确定；原企业/fixture 对象未被修改 | PASS |

Phase 3 未执行并保持 `NOT EXECUTED`：Session/Auth、协议门、诊断 REST/状态机、Report REST/列表/权限、顾问 API、小程序/DevTools/真机 E2E、Admin。它们属于 Phase 4 及之后。

## 15. Phase 4 执行记录

自动测试命令（Codex 桌面验证进程使用 bundled Node；项目脚本仍为可移植的 `node --test`）：

```text
node --test
```

结果：68 tests，68 PASS，0 FAIL，0 skipped；包含 Phase 2/3 的 47 项全量回归。

Phase 4 新增并实际执行的覆盖：

| Test ID | Module | Type | 实际结果 | Status |
| --- | --- | --- | --- | --- |
| P4-AUTH-001 | Demo Session | Integration | 创建、查询、随机 token、仅存摘要、code 单次使用、幂等与输入校验通过 | PASS |
| P4-AUTH-002 | Session 生命周期 | Integration fake clock | 缺失/格式错误/未知/过期 token 均返回稳定 401；注销后 token 失效 | PASS |
| P4-CONSENT-001 | Consent Gate | Integration | 无 Session、缺协议、旧版本、拒绝状态均不能创建；合法记录保存版本/时间/Session/User/用途 | PASS |
| P4-ASM-001 | 创建与幂等 | Integration | pending 快照、输入 hash、规则版本保存；重复不新增，payload 冲突 409 | PASS |
| P4-ASM-002 | 状态机 | Integration fake clock | 实际观察 pending → processing → ready；Report 只保存一次 | PASS |
| P4-ASM-003 | 失败与恢复 | Integration | Engine 异常、Report 保存异常转 failed；服务重建后可恢复 ready | PASS |
| P4-RPT-001 | 四场景报告 | Integration | A 为 opportunity；B 可生成 needs_data；C 为 not_met；D 新雏鹰 not_applicable | PASS |
| P4-RPT-002 | Report API | Integration | 未就绪 409；按诊断/ID获取、本人列表、空列表、processing/ready/failed 表达通过 | PASS |
| P4-AUTHZ-001 | 权限隔离 | Integration | 用户 B 查询用户 A 的 diagnosis/report 均为 404；列表无摘要泄露 | PASS |
| P4-INPUT-001 | Supplemental Data | Integration | user 来源、统计期、单位、逻辑校验、企业快照与 fixture 不变性通过 | PASS |
| P4-LEAD-001 | 顾问线索 | Integration | 游客合法提交、独立同意、输入校验、幂等和企业匹配通过 | PASS |
| P4-REPO-001 | JSON Repository | Integration | 分集合原子写入；损坏文件安全 500 且不静默覆盖；注销不删除报告 | PASS |
| P4-SEC-001 | 错误与敏感信息 | Integration/Static | 响应无 stack/路径/token/code；runtime 被 Git 忽略 | PASS |

真实 HTTP 验证（非 test runner 内部调用）：

```text
health=ok
authMode=demo
statusHistory=pending -> processing -> ready
qualificationCount=4
reportListCount=1
logout 后访问个人报告 HTTP 401
```

实际步骤：启动 Backend → POST Demo Login → 提交三个协议版本及同意时间 → POST Assessment → 轮询 Status → 获取 Report → 查询 Report List → DELETE Session → 使用旧 token 查询 Report。运行数据写入独立临时目录并在验证后清理；输出未打印 Session token。

Phase 4 仍为 `NOT EXECUTED`：所有微信小程序/DevTools/真机 UI 用例、协议 checkbox 默认值的 UI 行为、前端草稿 TTL、Report Tab/My Tab、Admin 与完整小程序 E2E。不得用后端 PASS 替代这些状态。

## 16. Phase 5 执行记录

自动测试命令（Codex 桌面验证进程临时使用 bundled Node；项目脚本仍为可移植的 `node --test`）：

```text
pnpm test
```

结果：74 tests，74 PASS，0 FAIL，0 skipped；包含 Phase 2–4 的 68 项全量回归。

| Test ID | Module | Type | 实际结果 | Status |
| --- | --- | --- | --- | --- |
| P5-FORM-001 | 动态表单纯函数 | Frontend Unit | `money/integer/boolean/enum/list` 序列化、单位/期间、负数/整数校验通过；`0/false` 保留 | PASS |
| P5-DRAFT-001 | 游客草稿 | Frontend Unit | A/B 企业草稿按 ID 隔离；TTL 内恢复、过期清理通过 | PASS |
| P5-API-001 | API 错误映射 | Frontend Unit | 保留安全用户文案、字段和 request ID，不透传额外内部字段 | PASS |
| P5-STATIC-001 | 小程序结构 | Static/Unit | `app.json` 注册页均有 JS/JSON/WXML/WXSS；三 Tab 路径正确；`wx.request` 只出现在统一 API Client | PASS |
| P5-STATIC-002 | 游客边界 | Static/Unit | `wx.login` / `getPhoneNumber` / `getUserProfile` / `/api/auth/login` 调用均为 0 | PASS |
| P5-HTTP-001 | 搜索与详情 | Real HTTP | `GET /enterprises?keyword=Demo` 返回 4 家且全部 `isDemoData=true`；B 详情 200/provider=mock | PASS |
| P5-HTTP-002 | 缺失字段重算 | Real HTTP | B 初始 20 项，补充 `rdEmployeeCount.2025` 后再请求为 19 项 | PASS |
| P5-DEVTOOLS-001 | 小程序编译/基础页面 | DevTools E2E | 用户实际导入项目；首页显示、三 Tab、四个法律/帮助页全部通过 | PASS |
| P5-DEVTOOLS-002 | 游客完整前置流 | DevTools E2E | 用户实际执行搜索、Empty、确认/返回、画像、动态补数 | 全部 PASS；B 场景缺失字段从 20 减少到 19 | PASS |
| P5-DEVTOOLS-003 | 草稿与企业隔离 | DevTools E2E | 返回画像、再进入，然后切换企业 | 草稿可恢复；不同企业不串补充数据 | PASS |
| P5-DEVTOOLS-004 | Console / Network | DevTools E2E | 完整操作期间观察调试器 | Console 无红色业务错误；Network 无登录、诊断创建或报告请求 | PASS |
| P5-DEVTOOLS-005 | 错误与重试 | DevTools E2E | 停止 Backend 后请求，恢复 Backend 后重试 | 错误文案与重试恢复通过，无内部堆栈 | PASS |
| P5-DEVICE-001 | 真机网络/布局 | Device E2E | 未配置 HTTPS 合法域名，未真机执行 | NOT EXECUTED |

真实 HTTP 输出摘要：

```text
searchStatus=200, searchCount=4, allSearchItemsDemo=true
detailStatus=200, detailProvider=mock
initialMissingCount=20
supplementedKey=rdEmployeeCount.2025
recalculatedStatus=200, remainingMissingCount=19, reduced=true
```

Phase 5 开发者工具验证证据来自用户于 2026-08-10 按人工清单执行后提供的逐项 PASS 结果。当时没有验证草稿等待 2 小时后真实过期、多屏幕尺寸/键盘遮挡、前后台生命周期或真机网络；当时尚未实现的 Phase 6 UI 也均为 `NOT EXECUTED`。当前 Phase 6 的最新结果以下一节为准。

## 17. Phase 6 执行记录

自动测试命令：

```text
pnpm test
```

Codex Shell 初次原样执行时因宿主 PATH 找不到 `node` 而未进入测试；仅在验证进程临时加入 bundled Node 路径后，再次原样执行项目脚本。最新结果：85 tests，85 PASS，0 FAIL，0 skipped；包含 Phase 2–5 的 74 项全量回归。

| Test ID | Module | Type | 实际结果 | Status |
| --- | --- | --- | --- | --- |
| P6-AUTH-001 | 用户动作登录时序 | Frontend Unit | 无本地 Session 时读取状态不调用登录；显式调用用户动作函数后顺序为 `wx.login → /auth/login`；已有 Session 只验证不重复登录 | PASS |
| P6-AUTH-002 | Session 本地生命周期 | Frontend Unit | 保存/读取、后端验证、401 清除、注销调用与本地清理逻辑通过 | PASS |
| P6-CONSENT-001 | 协议默认未勾选 | Frontend Unit/Static | `AgreementDialog.open()` 每次写入 `checked=false`；未勾选分支在 emit confirm 前 return | PASS |
| P6-RPT-AUTH-001 | 报告按钮不直接登录 | Frontend Unit/Static | 未登录按钮绑定 `openLoginAgreement`；调用只执行 `AgreementDialog.open()`，不创建 Session | PASS |
| P6-RPT-AUTH-002 | 报告确认后登录时序 | Frontend Unit | `AgreementDialog confirm → Session 创建 → 弹窗关闭 → Reports List 加载` 顺序固定 | PASS |
| P6-CONSENT-002 | Consent request 契约 | Frontend Unit | 三版本、`accepted=true`、`agreedAt`、`assessment-dialog` 与 `POST /assessments` body 保持冻结结构 | PASS |
| P6-STATUS-001 | 状态与中文文案 | Frontend Unit | pending/processing/ready/failed 阶段映射与五种资质中文文案使用设计冻结值 | PASS |
| P6-RPT-001 | Report 展示适配 | Frontend Unit | Evidence 缺失/0 值、来源、人工核验中文映射及报告列表状态适配通过；前端无 Evaluator 引用 | PASS |
| P6-LEAD-001 | 顾问表单 | Frontend Unit | 独立同意默认 false、手机号/姓名/方向/备注校验和游客 API payload 逻辑通过 | PASS |
| P6-DRAFT-001 | 草稿清理 | Frontend Unit | 创建成功调用当前企业清理；退出清理所有 `qualification-draft:*` 和当前企业 key | PASS |
| P6-STATIC-001 | 页面与调用边界 | Static/Unit | 新页面均成套注册；`wx.login` 直接调用仅在 Auth service；App/首页/报告/我的不直接登录；无手机号授权 API | PASS |
| P6-HTTP-001 | 完整 Backend 联调 | Real HTTP | Auth → Consent/Diagnosis → pending → processing → ready → 四类 Report + Evidence/Gap/Action → Reports List → Logout；旧 token 返回 401 | PASS |
| P6-HTTP-002 | Lead 联调 | Real HTTP | 无 Session 调用 Lead API 返回 201/submitted，使用独立同意与幂等键 | PASS |
| P6-SCAN-001 | 合规静态扫描 | Static | 自动登录/强制授权/敏感凭证签名/面向用户承诺文案扫描无违规实现；命中文档中的禁止词仅为规范说明 | PASS |
| P6-DEVTOOLS-001 | Phase 6 完整主流程 | DevTools E2E | 用户实际执行 30 项清单；后台健康、编译、无自动登录、两类协议门、Session、游客链路、诊断、四类报告、Evidence、Gap/Action、报告列表、顾问、法律入口、退出及 Console 均符合预期 | PASS |
| P6-DEVICE-001 | 真机登录/弱网/隐私 | Device E2E | 未配置正式测试 AppID、HTTPS 合法域名，未真机执行 | NOT EXECUTED |

真实 HTTP 联调摘要：

```text
authMode=demo
statusHistory=pending -> processing -> ready
qualificationCount=4
evidence/gaps/actions 均为非空
reportsListReportId 与生成报告一致
leadStatus=submitted
logoutStatus=204
logout 后旧 token 查询报告 HTTP 401
```

用户于 2026-08-10 在微信开发者工具实际执行核心人工清单，提交 30 项逐项结果且全部为 `PASS`。覆盖后台健康、项目编译、冷启动及三 Tab 无自动登录、报告协议首次/重开默认未勾选、未同意/拒绝保持游客、明确同意后登录、有效 Session 复用、企业游客链路、诊断协议、创建与进度、四类报告、Evidence、Gap/Action、报告 Tab ready 记录、顾问无强制手机号授权与 Lead 提交、法律入口、退出及 Console 无红色异常。

仍保持 `NOT EXECUTED`：真机；登录/诊断/报告网络故障注入；报告 Tab pending/processing/failed 专项构造；前后台生命周期与轮询恢复；窄屏、多尺寸和键盘遮挡；草稿真实等待 2 小时过期；Admin。用户本次未注明测试 AppID 类型，该信息不影响已观察行为的记录，但发布前仍须以正式测试 AppID 和 HTTPS 合法域名复验。

## 18. Phase 7 执行记录

自动测试命令：

```text
pnpm test
```

Codex Shell 初次原样执行时延续既有宿主问题：PATH 中没有 `node`，因此命令未进入测试。仅对验证进程临时加入 Codex bundled Node 目录后，重新原样执行项目脚本。结果：90 tests，90 PASS，0 FAIL，0 skipped；Phase 2–6 的 85 项全部回归通过。

| Test ID | Module | Type | 实际结果 | Status |
| --- | --- | --- | --- | --- |
| P7-ADMIN-001 | 静态 Admin 入口 | Integration + Browser | `/admin/` 由同一 Express 服务返回；页面固定展示本地 Demo/非生产权限提示 | PASS |
| P7-ADMIN-002 | 诊断只读列表 | Integration + Browser | 默认 runtime 的已完成诊断显示企业、Demo 标记、诊断 ID/状态、报告状态和创建时间 | PASS |
| P7-ADMIN-003 | Lead 只读列表 | Integration + Browser | 默认 runtime 的 Lead 显示企业、联系人、方向、提交时间；手机号显示为掩码 | PASS |
| P7-ADMIN-004 | Repository 真实来源 | Integration | 通过现有 Auth/Assessment/Lead API 创建数据后，Admin 列表读取同一 JSON Repository，pending 与 ready/report 关联均正确 | PASS |
| P7-ADMIN-005 | 本地访问限制 | Integration | 注入非本地策略后两个 API 和静态页均返回 403 统一错误，无 stack | PASS |
| P7-ADMIN-006 | 字段过滤 | Integration | 响应不含完整手机号、user/session、token/hash、幂等/request hash、Consent/Agreement 或输入快照 | PASS |
| P7-ADMIN-007 | 四态 | Browser + Static/Integration | 正常 runtime 为 Success；独立空 runtime 为 Empty；刷新中观察 Loading；停止 Backend 后刷新为稳定中文 Error | PASS |
| P7-REG-001 | Phase 2–6 全量回归 | Automated | 既有 85 项全部 PASS；Rule Engine、Session、Consent、Diagnosis、Report、Lead 和小程序静态契约未回归 | PASS |
| P7-MINI-001 | 小程序改动边界 | Git Diff | `git diff -- miniprogram` 无输出 | PASS |

真实浏览器验证摘要：

```text
Success：诊断记录=1，顾问线索=1；诊断 ready/report ready；Lead 手机号为掩码
Empty：独立空 runtime 下两区计数均为 0，并显示引导文案
Loading：断开 Backend 后点击刷新，两个区显示“正在加载数据…”且按钮禁用
Error：请求失败后两个区显示稳定中文 Backend 重试提示
```

Phase 7 没有执行并保持 `NOT EXECUTED`：真机、Phase 6 已列出的专项故障/多尺寸/生命周期补充项，以及 Phase 8 最终集成硬化。Phase 7 完成后立即停止，不把这些未执行项写成通过。

## 19. Phase 8 最终集成与验收记录

自动与可移植性命令：

```text
pnpm install --frozen-lockfile
pnpm start + GET /api/health
pnpm test
node --test tests/integration/api/phase8-startup-e2e.test.js tests/unit/miniprogram/phase5-frontend.test.js
node --check <全部 97 个 JavaScript 文件>
ConvertFrom-Json <全部 22 个 JSON 文件>
git diff --check
```

最终结果：`pnpm install --frozen-lockfile` 无锁文件变更；`pnpm start` 实际启动后 Health 为 `ok`、Provider 为 `mock`；全量 92 tests / 92 PASS / 0 FAIL / 0 skipped / 0 todo。独立进程测试真实启动 `server/src/server.js`，使用独立临时 runtime 并在结束后清理。

| Test ID | 模块 | 前置条件 | 操作步骤 | 预期/实际结果 | Status |
| --- | --- | --- | --- | --- | --- |
| P8-PORT-001 | 安装与脚本可移植性 | Node.js 24.19、pnpm 11.16 | frozen install；检查 package scripts、绝对路径和共享 AppID | 依赖一致；scripts 仅用 `node`；无用户目录绝对路径；共享 AppID 为 `touristappid` | PASS |
| P8-STATIC-001 | JS/JSON/页面 | 当前仓库 | 语法检查、JSON 解析、13 页四件套、3 Tab 与注册路径检查 | 97 JS、22 JSON、13 页和 3 Tab 全部有效 | PASS |
| P8-STATIC-002 | 登录/API 边界 | 当前小程序 | 扫描登录、请求和敏感授权 API | 登录 adapter 仅在 `services/auth.js`；`wx.request` 仅在 `services/api.js`；无手机号/用户资料授权 API | PASS |
| P8-SCAN-001 | 合规与清理 | Git 跟踪文件 | 扫描 TODO/FIXME/占位、承诺文案、疑似凭证、runtime、日志、本机路径和大文件 | 实现中无命中；无被跟踪 runtime/私密配置/日志；无 >1MB 意外文件 | PASS |
| P8-E2E-001 | 独立 Backend 主链路 | Mock Provider、Demo Auth、临时 runtime | Health → Search/Detail → Missing Fields → Auth/Consent/Diagnosis → pending/processing/ready → Report/List → Lead → Logout | 状态和 API 契约全部符合；旧 Session 返回 401 | PASS |
| P8-E2E-002 | Report 完整性 | P8-E2E-001 ready | 读取报告 | 四类结果且 Evidence/Gap/Action 均非空 | PASS |
| P8-ADMIN-001 | Admin 集成 | 同一临时 runtime 已有诊断与 Lead | 读取两个本机 Admin API | 各 1 条真实记录；完整手机号和 Session token 不出现；手机号脱敏 | PASS |
| P8-MOCK-001 | A/B/C/D 最终状态 | 四家虚构 fixture | 全量 Engine/API 回归 | A 四类 opportunity；B 初始四类 needs_data 且补数可改变；C 四类 not_met 且 0/false 不算 missing；D 杭州新雏鹰 not_applicable | PASS |
| P8-FORM-001 | 跨字段错误反馈 | Scenario B 总人数 45 | 研发人数填 100 并保存；修复后执行映射单测 | Backend 拒绝；“不能大于企业总人数”映射到 `rdEmployeeCount.2025` 行内错误，不保存非法草稿 | PASS |
| P8-DEVTOOLS-001 | 最终微信开发者工具冒烟 | 本机测试 AppID、本地 Backend | 用户执行导入/编译、冷启动、三 Tab、游客链路、动态补数、协议拒绝/同意、登录、状态流、报告、顾问、Report Tab、退出、Console/Network | 14 项逐项反馈全部 PASS；使用测试 AppID，不是 touristappid 模拟登录 | PASS |
| P8-GIT-001 | Git 交付检查 | Phase 8 修改完成 | status、diff、diff-check、跟踪文件与大文件检查 | 修改均在预期范围；无 runtime/秘密/大文件；diff-check 通过 | PASS |

### 19.1 Requirement Traceability 最终结果

| 原始要求 | 实现/验证证据 | 最终状态 |
| --- | --- | --- |
| 首页、企业搜索、主体确认、企业画像、补充经营数据免登录 | 原生页面 + Phase 5/6 DevTools PASS + 前端静态回归 | PASS |
| 发起诊断先协议后登录；默认不勾选；拒绝仍可浏览 | AgreementDialog、Auth 时序测试、Phase 6 DevTools PASS | PASS |
| 诊断进度、报告、Evidence、Gap/Action 登录保护 | Session/所有权 API 测试 + Phase 6 DevTools PASS + P8-E2E | PASS |
| Contact Consultant 免登录且独立同意 | Lead API/UI 测试 + Phase 6 DevTools PASS + P8-E2E | PASS |
| Report Tab 未登录引导和五态 | 前端单测 + Phase 6 DevTools 核心路径；专项 pending/failed UI 构造见未执行项 | PASS |
| My Tab 免登录；使用说明、隐私政策、用户协议、免责声明；条件退出 | 页面/静态测试 + Phase 6 DevTools PASS | PASS |
| 四类资质、动态缺失字段、可解释报告 | Engine/Report 单测、A/B/C/D 集成、P8-E2E | PASS |
| Mock 数据虚构、`isDemoData`、不冒充企查查 | fixture/Provider/UI 标识测试与静态扫描 | PASS |
| Admin 本机只读、诊断/脱敏 Lead、无敏感快照 | Phase 7 浏览器/API PASS + P8-ADMIN-001 | PASS |
| PRD、design、architecture、test cases、decisions、README | Phase 8 同步收口 | PASS |
| 可安装、可启动、可完整运行 Demo | frozen install、92 项测试、独立 Backend E2E、测试 AppID DevTools 最终冒烟 | PASS |

### 19.2 Phase 8 仍未执行

- 正式 AppID + 生产微信 `code2Session`：`NOT EXECUTED`（明确不属于 Demo 实现范围）。
- 真机 HTTPS 合法域名：`NOT EXECUTED`。
- 弱网/超时专项、登录/诊断/报告网络故障 UI 注入：`NOT EXECUTED`。
- 窄屏、多尺寸、键盘遮挡和真实触控专项：`NOT EXECUTED`。
- 前后台生命周期与轮询恢复专项人工复验：`NOT EXECUTED`。
- 草稿真实等待 2 小时到期：`NOT EXECUTED`（自动 fake-time TTL 已 PASS）。
- `docs/test-cases.md` 中仍标记 `NOT EXECUTED` 的细粒度 Provider 契约和政策边界扩展用例未在 Phase 8 补做；现有实现主链路不因此冒充这些专项已通过。
