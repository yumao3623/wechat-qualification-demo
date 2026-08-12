# 企业政府资质预评估微信小程序 Demo｜测试用例

> 文档版本：v2.0
> 最近更新：2026-08-11
> 最近自动测试：`npm.cmd test`，91 tests / 91 PASS / 0 FAIL

## 1. 状态说明

- `PASS`：已实际执行，结果符合预期。
- `FAIL`：已实际执行，结果不符合预期。
- `NOT EXECUTED`：尚未实际执行，或当前环境无法验证。
- 后端、规则引擎、登录、隐私或报告契约修改后，应重新执行相关自动测试。
- 自动测试不能替代微信开发者工具或真机人工操作；未执行项不得标记为通过。

## 2. 功能与接口测试

| Test ID | 模块 | 类型 | 前置条件 | 操作步骤 | 预期结果 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| UI-GUEST-001 | 首页游客访问 | DevTools E2E | 清空本地存储，后端启动 | 打开小程序首页 | 首页可浏览；无 `wx.login`、手机号授权或协议弹窗 | PASS |
| UI-NAV-001 | 三 Tab | DevTools E2E | 游客状态 | 依次打开首页、报告、我的 | 三 Tab 可切换；报告显示未登录引导；我的法律入口可见 | PASS |
| UI-LEGAL-001 | 使用说明与法律页 | DevTools E2E | 游客状态 | 从我的打开使用说明、隐私政策、用户协议、免责声明 | 四个页面均免登录可访问，标题和正文存在 | PASS |
| ENT-001 | 企业搜索 | Unit / Integration / DevTools | Mock Provider 可用 | 搜索 `Demo` | 返回四家虚构企业，全部标记 Demo 数据 | PASS |
| ENT-002 | 搜索无结果 | Unit / API | Mock Provider 可用 | 搜索无匹配关键词 | 返回空数组或 Empty，不伪造真实企业 | PASS |
| ENT-003 | 企业主体确认 | DevTools E2E | 已选择企业 | 查看主体字段并确认 | 主体字段可见，确认后进入企业画像 | PASS |
| ENT-004 | 企业详情 | Unit / API | 使用已知企业 ID | 请求企业详情 | 返回统一企业画像、字段来源和 Demo 标签 | PASS |
| FORM-001 | 缺失数据识别 | Unit / API | 使用缺少研发、人员数据的企业 | 请求 missing-fields | 只返回规则需要且当前缺失或期间无效的字段 | PASS |
| FORM-002 | 动态表单生成 | Unit / DevTools | 使用动态补数企业 | 进入补充经营数据页 | 字段按 schema 渲染，并显示单位、期间、用途和口径提示 | PASS |
| FORM-003 | 补充数据影响诊断 | Unit / Integration | 使用动态补数企业 | 补齐有效字段后重新计算 | 缺失项减少，后续报告结果随输入变化 | PASS |
| FORM-004 | `0` 与 `false` 边界 | Unit | 企业数据含 `0` 或 `false` | 计算缺失和评估 | `0` 和 `false` 不被当作缺失，并参与判断 | PASS |
| FORM-005 | 补充数据关系校验 | Unit / DevTools | 动态表单已加载 | 输入研发人数大于总人数等非法关系 | 对应字段显示错误，其他合法输入保留 | PASS |
| FORM-006 | 企业草稿隔离 | Unit / DevTools | 两家企业均进入补数页 | 在企业 A 保存草稿后切换企业 B | 企业 B 不读取企业 A 的补充数据 | PASS |
| CONSENT-001 | 协议默认未勾选 | Unit / DevTools | 可打开协议弹窗 | 打开、勾选、关闭并重新打开 | 每次打开 `checked=false` | PASS |
| CONSENT-002 | 不同意协议 | DevTools E2E | 协议弹窗打开 | 未勾选确认、关闭或暂不发起 | 不调用 `wx.login`，不创建诊断，可继续游客浏览 | PASS |
| CONSENT-003 | 协议后端校验 | Integration | 有效 Session | 缺少协议版本或同意记录创建诊断 | 返回 `AGREEMENT_REQUIRED`，不保存诊断 | PASS |
| AUTH-001 | 登录触发时机 | Static / Unit / DevTools | 游客状态 | 冷启动、浏览游客页、明确同意发起诊断 | 只在明确同意后调用 `wx.login` | PASS |
| AUTH-002 | Demo Session | Integration | 合法 Demo code | 登录、查询 Session、注销 | 返回随机 token；服务端只存摘要；注销后旧 token 失效 | PASS |
| AUTH-003 | 未登录访问报告 | Integration / DevTools | 无 Session | 打开报告 Tab并请求报告 API | UI 显示登录原因和引导；API 返回 401；不自动授权 | PASS |
| AUTH-004 | 报告登录协议门 | Unit / DevTools | 报告 Tab 未登录 | 点击登录查看报告，关闭后再次打开并确认 | 按钮只打开默认未勾选的协议弹窗；确认后才登录 | PASS |
| AUTH-005 | 游客 AppID Demo 登录 | Unit | `wx.login` 返回失败 | 用户明确同意后发起登录 | 先尝试 `wx.login`；仅 Demo 配置生成本地 code 并建立 Session；关闭降级时终止登录 | PASS |
| AUTH-006 | 开发者工具重复登录 code | Unit / Integration | `wx.login` 返回已被后端消费的 code | 用户明确同意后发起登录 | 后端返回 `AUTH_CODE_REUSED`；仅 Demo 配置使用新 code 和新幂等键重试一次；其它 409 不重试 | PASS |
| ASM-001 | 诊断创建 | Integration | 有效 Session 和完整协议 | POST `/api/assessments` | 创建 `pending` 诊断，保存输入和协议快照 | PASS |
| ASM-002 | 诊断状态 | Integration | 已创建诊断 | 轮询状态 | 状态真实流转 `pending → processing → ready` 或进入 `failed` | PASS |
| ASM-003 | 诊断失败 | Integration | 注入领域或持久化错误 | 创建并推进诊断 | 状态为 `failed`，错误文案安全，不生成空报告 | PASS |
| ASM-004 | 诊断幂等 | Integration | 有效 Session 和协议 | 使用同一幂等键重复提交相同诊断 | 不重复创建诊断；不同 payload 复用键返回冲突 | PASS |
| RPT-001 | 报告生成 | Unit / Integration | 诊断完成 | 获取报告 | 恰好四类资质，包含规则版本、免责声明、证据、缺口和行动 | PASS |
| RPT-002 | 报告查询 | Integration | 当前用户有诊断 | GET `/api/reports` 和 `/api/reports/:id` | 只返回本人数据，列表可表达进行中、完成和失败 | PASS |
| RPT-003 | 证据链 | Unit / DevTools | 存在已完成报告 | 打开证据链 | 每项包含条件、要求、实际值、来源、结果、缺失和行动 | PASS |
| RPT-004 | 缺口与行动 | Unit / DevTools | 存在已完成报告 | 打开行动清单 | 展示缺口、重要性、优先级、建议行动和非承诺说明 | PASS |
| RULE-001 | 四类规则 | Unit | 使用 A、B、C、D 四类 fixture | 调用 QualificationEngine | 四类均有结构化结果，并覆盖机会、缺数据、暂不满足和不适用 | PASS |
| RULE-002 | 规则结果语义 | Unit | 构造已满足、未满足、未知、人工核验和不适用输入 | 执行四个 Evaluator | 单项和总体状态符合优先级，不将人工核验当作已满足 | PASS |
| RULE-003 | 规则与 UI 分离 | Static / Unit | 当前代码 | 扫描页面和 Route | 页面和 Route 不实现资质判断，规则层可独立测试 | PASS |
| LEAD-001 | 顾问提交 | Integration / DevTools | 游客状态 | 填写联系人、手机号、企业、方向和备注，独立同意后提交 | 201 保存线索；显示“咨询需求已提交”；不要求登录 | PASS |
| LEAD-002 | 顾问同意默认值 | Unit / DevTools | 可打开顾问页 | 首次打开、勾选、退出并重开 | 独立同意默认 `false`，不复用诊断协议 | PASS |
| LEAD-003 | 顾问输入与幂等 | Integration | 顾问接口可用 | 提交非法手机号、未同意、重复幂等请求 | 非法请求不保存；相同合法请求不重复创建线索 | PASS |
| API-001 | API 输入校验 | Integration | 后端启动 | 提交非法 keyword、code、mobile 和 supplements | 返回稳定字段错误，不保存部分数据，不暴露堆栈 | PASS |
| API-002 | 独立进程主链路 | Process E2E | 使用临时 runtime 目录 | 启动后端并依次调用 Health、企业、补数、登录、诊断、报告、顾问和注销 | 完整 HTTP 链路可运行，退出后旧 Session 失效 | PASS |
| CFG-001 | AppID 配置可移植性 | Static | 当前 `project.config.json` | 执行小程序静态测试 | 共享配置使用 `touristappid`，个人测试 AppID 放入私有配置 | PASS |
| CFG-002 | 交付 ZIP 隔离 | Package inspection | 执行交付打包脚本 | 检查 ZIP 条目和共享配置 | 包含运行所需源码、脚本、文档和测试；不含私有配置、`.env`、runtime、依赖和 Git 元数据 | PASS |
| SEC-001 | 敏感信息扫描 | Static | 当前仓库 | 扫描 Key、Secret、token、AppSecret 和 runtime | 无明文敏感凭证；`.env.example` 仅含变量和安全默认值 | PASS |
| COPY-001 | 禁止承诺文案 | Static | 当前代码与正式文档 | 扫描面向用户文案 | 不出现保证通过、一定符合、已获得资质、官方认定通过、保证补贴等承诺 | PASS |

## 3. 人工验收清单

| Test ID | 模块 | 类型 | 前置条件 | 操作步骤 | 预期结果 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-001 | 完整主流程 | DevTools E2E | 微信开发者工具和本地后端可用 | 首页 → 搜索 → 主体确认 → 画像 → 补数 → 协议同意 → 进度 → 报告 → 证据 → 行动 → 顾问 | 全流程可跑通；无自动登录；报告包含四类结果 | PASS |
| E2E-002 | 协议拒绝分支 | DevTools E2E | 游客状态 | 发起诊断后关闭、未勾选确认或暂不发起 | 不登录、不创建诊断、不阻塞继续浏览 | PASS |
| E2E-003 | 报告 Tab 五态 | DevTools E2E | 可构造无报告、进行中、完成和失败 | 分别进入报告 Tab | 未登录、无报告、进行中、完成和失败状态均可理解并可操作 | NOT EXECUTED |
| E2E-004 | 网络故障恢复 | DevTools E2E | 可停止和恢复后端 | 在搜索、诊断、报告、顾问提交时制造故障并重试 | 显示友好错误和重试；不展示内部堆栈；合法数据不丢失 | NOT EXECUTED |
| E2E-005 | 前后台恢复 | DevTools E2E | 诊断处于 processing | 切到后台，再回到前台 | 回前台后从后端读取最新状态并继续展示 | NOT EXECUTED |
| E2E-006 | 多尺寸与键盘 | DevTools E2E | 选择常见窄屏和标准屏 | 浏览搜索、表单、报告、顾问页并输入 | 文本不重叠，按钮可点，键盘不遮挡关键输入和提交操作 | NOT EXECUTED |
| E2E-007 | 真机 HTTPS | Real Device E2E | 测试 AppID、合法 HTTPS 域名和已配置 request 域名 | 真机打开并跑完整主流程 | 网络域名合规，登录、请求和页面行为正常 | NOT EXECUTED |
| E2E-008 | 草稿真实过期 | DevTools E2E | 已保存企业草稿 | 等待超过 2 小时后重新进入补数页 | 过期草稿被清理，不继续用于诊断 | NOT EXECUTED |

## 4. 最近执行记录

| 日期 | 环境 | 执行内容 | 结果 |
| --- | --- | --- | --- |
| 2026-08-11 | Node.js 自动测试，游客 AppID、Demo 登录降级与重复 code 恢复 | `npm.cmd test` | 91 tests / 91 PASS / 0 FAIL |
| 2026-08-11 | 重复登录 code 实际 HTTP 验证 | 连续使用相同 code、不同幂等键调用 `/api/auth/login` | PASS；首次 201，第二次 409 `AUTH_CODE_REUSED` |
| 2026-08-11 | 交付 ZIP 白名单检查 | `npm.cmd run package:delivery` + Zip 条目/AppID 检查 | PASS；`touristappid`，敏感/私有/运行时条目 0 项 |
| 2026-08-11 | 微信开发者工具 CLI 导入冒烟 | `cli.bat open --project ...` | NOT EXECUTED；CLI 超时且未启动可判定的进程或端口，不据此声明通过 |
| 2026-08-11 | Node.js 自动测试，配置调整前 | `pnpm test` | 87 tests / 87 PASS / 0 FAIL |
| 2026-08-10 | 微信开发者工具 | 冷启动、三 Tab、游客流程、动态补数、协议门、登录、诊断、报告、顾问、退出、Console 与 Network 冒烟 | PASS |

当前自动测试无失败；企业搜索与详情、动态表单、协议与 Session、游客模式登录降级、诊断创建与状态流、报告生成与查询、顾问线索、四类规则和独立后端进程主链路均通过。

真机 HTTPS、网络故障、多尺寸与键盘、前后台恢复及草稿真实等待仍保持 `NOT EXECUTED`。
