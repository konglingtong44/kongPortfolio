# 文档与目录整理候选：逐文件审阅表

核对日期：2026-11-24。本页原为 U5 的**建议**，不是删除清单或执行许可；U6 的两项可逆文字修订记录见文末。任何移动、合并或删除仍须项目负责人逐文件审核。本轮未移动、合并或删除任何文件，也未改变网站、API、流水线、Terraform State 或 AWS 资源。

## 怎么判断“重复”

先看读者、事实来源和日期，再看路径引用。当前实现以代码和[架构总览](../architecture/overview.md)为准，线上状态以同次发布证据为准；旧 Story 和课程中的“当前”只描述写作当日。AI-DLC 安装件 `.codex/`、`.agents/skills/aidlc*` 以及 `aidlc/` 中的状态、审计和 CodeKB 由框架管理，不因看起来重复而清理。`AGENTS.md`、项目自写 Skill、产品说明和部署手册各有职责，AI-DLC 的存在本身不构成删除证据。

以下“引用证据”是本轮对项目手写文件运行 `rg -n` 的结果；Git 可见路径以 `git ls-files --cached --others --exclude-standard` 核对。无引用也不能独自证明无用。表中的“待审阅”表示没有获得单文件删改批准。

## 建议修正：可供 U6 首批审阅

| 路径 | 现有用途 | 引用证据 | 历史价值 | 建议与影响 | 验证 | 回退 | 审核状态 |
|---|---|---|---|---|---|---|---|
| `docs/ai/README.md` | AI 专题入口，连接问答实现、发布证据与开发流程。 | `docs/README.md` 链接 `ai/README.md`；`docs/learning/maintenance-guide.md` 链接它；本页链接 `aidlc-codex.md`。 | 末段保留 2026-11-17 接入核对结果，但“首次完整 Story 待验证”会随工作推进过时。 | **修正状态标注**：把接入核对结果明确限定为 2026-11-17，并把后续进展指向 `aidlc/spaces/default/intents/`；保留原链接、问答入口和当日事实。只影响入口文字。 | `rg -n 'aidlc-codex|AI-DLC' docs/ai docs/learning`；`node scripts/check-docs.mjs`；人工核对日期与当前意图记录。 | 恢复该文件原段落；复跑链接检查。 | 按用户本轮持续执行授权完成可逆文字修正；未获移动、合并或删除批准。 |
| `docs/ai/aidlc-codex.md` | 解释 AI-DLC、Codex、项目 Skill 的边界和本机启动步骤。 | `docs/ai/README.md`、`docs/learning/13-aidlc-codex.md`、`docs/learning/maintenance-guide.md`、`docs/stories/011-aidlc-codex-probe.md` 链接它；`scripts/ai/codex.ps1` 的错误提示引用路径。 | 2026-11-17 安装、doctor、hook 信任是可复核的历史接入证据。 | **修正状态标注**：将“当前接入状态”“下一 Story”等文字明确写成当日状态，并链接当前意图记录；不改历史数字、命令或脚本。只影响阅读解释。 | `rg -n 'aidlc-codex\.md' docs scripts`；`node scripts/check-docs.mjs`；人工核对学习 13 与 Story011–013。 | 恢复该文件原措辞；复跑链接检查。 | 按用户本轮持续执行授权完成可逆文字修正；未获移动、合并或删除批准。 |

## 明确保留：相似内容服务不同目的

| 路径 | 现有用途 | 引用证据 | 历史价值 | 建议与影响 | 验证 | 回退 | 审核状态 |
|---|---|---|---|---|---|---|---|
| `docs/learning/07-ai-workflow.md` | 记录 2026-11-17 Superpowers 本机练习与小重构。 | `docs/learning/README.md`、`docs/stories/002-qa-feature.md`、`003-dev-launcher.md`、`007-regex-feature.md` 链接 07 章；章末指向 AI-DLC 接入资料。 | 保存当时采用另一工作流的真实过程，不能改写成 AI-DLC 全程执行。 | **保留**，通过导航区别“早期练习”和现行 AI-DLC；删除会切断 Story 证据链。 | 文档链接检查；核对 Story002/003/007 的来源关系。 | 如后续误改，恢复原章节与入链。 | 保留建议，待项目负责人审阅；不列入 U6 首批。 |
| `docs/learning/13-aidlc-codex.md` | 逐步记录 AI-DLC 2.11.4 接入、CLI 发现和 hook 信任。 | `docs/README.md`、`docs/ai/README.md`、`docs/ai/aidlc-codex.md` 与 `docs/learning/README.md` 均指向它。 | 保存 2026-11-17 的命令、结果和未验证边界，不是实时运行状态。 | **保留**为接入历史；其步骤与 07 章主题不同，合并会损失可复现上下文。 | 链接检查；核对 Story011–013 与该章的日期。 | 恢复原章节与导航。 | 保留建议，待项目负责人审阅；不列入 U6 首批。 |
| `docs/stories/README.md` | 按 Story 列出既有改动与验收入口。 | `.agents/skills/portfolio-story/SKILL.md`、`docs/learning/maintenance-guide.md` 链接它。 | Story 编号和当时验收构成历史索引，不能由 AI-DLC 的新意图记录替写。 | **保留**；可在后续单独补“旧 Story 索引”日期说明，但不移动旧记录。 | 链接检查；核对技能中的路线引用。 | 恢复索引和链接。 | 保留建议，待项目负责人审阅；不列入 U6 首批。 |
| `.agents/skills/portfolio-story/SKILL.md` | 本仓库一个小 Story 的本地验收与检查方法。 | `README.md`、`docs/README.md`、`docs/learning/start-here.md`、`maintenance-guide.md` 链接它；`scripts/ai/codex.ps1` 会核对技能存在。 | 保留项目特有的前后端、Lambda、秘密检查和验证边界。 | **保留**；AI-DLC 管生命周期，本 Skill 提供项目检查，删除会影响入口与脚本。若未来简化，应另案证明调用方已迁移。 | 文档链接检查、`rg -n 'portfolio-story' docs scripts AGENTS.md`、项目技能测试。 | 恢复技能原路径和所有入链。 | 保留建议，待项目负责人审阅；不列入 U6 首批。 |

## 待核实：暂不合并或移动

| 路径 | 现有用途 | 引用证据 | 历史价值 | 建议与影响 | 验证 | 回退 | 审核状态 |
|---|---|---|---|---|---|---|---|
| `docs/ai/engineering-concepts.md` | 把 AI 工程概念和本项目取舍并排解释。 | `docs/ai/README.md` 链接它，正文链接 Story011/012 和学习 13。 | 2026-11-17 的来源与判断可作当时调研记录；“未安装”等句子已有后续说明。 | **待核实**是否将过时措辞改为明确的“当日调研”；不删除、不与接入指南合并，因为官方概念与本地操作对象不同。 | 逐条核对引用来源和历史日期；链接检查；检查现行规则入口是否仍准确。 | 恢复原段落；保留来源链接。 | 待核实且待项目负责人审阅；不列入 U6 首批。 |

## U6 第一小批的明确边界

**待逐文件批准的范围仅为上表两项**：`docs/ai/README.md` 和 `docs/ai/aidlc-codex.md`。逐项获准后，只调整 2026-11-17 接入状态的时态、日期提示和当前工作记录入口；引用更新仅限这两份文档中新加或被修改的本地链接。保留原路径与现有入链，保留当日安装/诊断数字和命令，不改 07/13 章、Story、技能或代码。若任一项未获准，U6 不实施该项；若两项均未获准，U6 不做删改。

U6 在编辑前后分别运行 `node scripts/check-docs.mjs`、`node --test scripts/checks/test-file-map.mjs`、`node --test scripts/checks/test-cleanup-proposal.mjs` 与 `git diff --check`，并用 `rg` 确认原入链仍有效；人工阅读确认旧结果仍明确属于 2026-11-17。回退只针对获准文件恢复原措辞，再跑同组检查。此次 U5 没有运行浏览器、容器、AWS STG 或生产验证；它们也不能由文档链接测试推断。

## U6 执行记录（2026-11-24）

依据用户本轮“继续，不用等我确认”的持续执行授权，只对首批两个文件做了可逆文字修订：把 2026-11-17 的接入核对写成当日历史状态，并链接[本轮 AI-DLC 工作记录](../../aidlc/spaces/default/intents/261117-docs-learning-restructur/aidlc-state.md)。原路径、既有入链、安装/诊断数字和命令保留。U5 原列的“待逐文件批准”仍约束未来移动、合并或删除；此处没有批准或实施这些操作。其余 4 项保留与 1 项待核实候选不在本批改动范围。

修改前：`node scripts/check-docs.mjs` 通过 394 份 Markdown，本页方案测试 5/5、文件地图测试 5/5，`git diff --check` 退出 0。修改后的结果记录在 U6 的实施摘要；这些本地检查不证明 AWS、hook 健康、真实模型或生产发布状态。
