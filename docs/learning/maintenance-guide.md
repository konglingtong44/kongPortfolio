# 以后想改规矩或流程，从哪里开始

这页给第一次接触项目的人用。**规矩**是“做事时要遵守什么”，**流程**是“按什么顺序做”。它们和网站功能不同：改开发规矩不会自动改变访客看到的网页。先读[零基础入口](start-here.md)，想查具体代码或文件时看[文件夹地图](file-map.md)和[逐文件清单](file-map-inventory.md)。

## 先看这张选择表

以下路径都从仓库根目录算起。“检查”指在自己的电脑上核对，不代表已经发布到 AWS。

| 想改什么 | 去哪里，适用范围 | 改后怎么检查 | 可能影响 |
|---|---|---|---|
| “一次只做一个小 Story”“不能提交密钥”等本项目共同约定 | [根目录 `AGENTS.md`](../../AGENTS.md)；影响在此仓库工作的助手与人。编辑项目自写的约定时，保留其中的 AI-DLC 受管块。 | 读一遍新旧措辞是否冲突；检查相关[项目规则](../../aidlc/spaces/default/memory/project.md)，运行 `node scripts/check-docs.mjs`。 | 后续任务的做法会改变；已有记录和代码不会自动重写。 |
| AI-DLC 在**这个项目**长期遵守的补充规则，例如固定本地检查 | 当前空间的 [`aidlc/spaces/default/memory/project.md`](../../aidlc/spaces/default/memory/project.md)；只针对这个项目。可通过 AI-DLC 的实践确认或学习反馈维护，手动改时也要先核对上层规则。 | 核对下文的层级关系与 `AGENTS.md`；用 AI-DLC 状态/诊断入口确认规则被读取，再跑相关本地检查。 | 以后 AI-DLC 处理需求、设计和实施时会读到它；不自动改旧意图的结果。 |
| 某个开发阶段的补充要求，例如“施工阶段生成完整文件” | 当前空间的 [`aidlc/spaces/default/memory/phases/`](../../aidlc/spaces/default/memory/phases/)；只适用于相应阶段。先与项目、团队及组织规则对照。 | 用 AI-DLC 在目标阶段查看实际生效规则，并做一次小范围流程演练。 | 同一阶段的多个任务会受影响，范围比单个 Story 大。 |
| 项目专用的执行清单，例如每次 Story 要跑哪些检查 | [项目 Story 技能](../../.agents/skills/portfolio-story/SKILL.md)；发布证据审阅另看[发布审阅技能](../../.agents/skills/portfolio-release-review/SKILL.md)。这些是项目自写的辅助工作方法。 | 核对链接、命令和 [Story 路线](../stories/README.md)，在一项小任务上实际执行并记录结果。 | 调用该技能时的具体步骤会变；它不会自动给 AI-DLC 增加生命周期阶段。 |
| 一个新需求的范围、验收标准或完成证据 | 按 [Story 模板](../stories/template.md)写一份 Story，入口在 [Story 路线](../stories/README.md)；只针对那一次改动。 | 按验收标准运行相应检查，把真实结果与未测项写回 Story。 | 本次改动更容易审核；不会把一次性的决定变成所有任务的规则。 |
| 教程说法、阅读顺序或文件用途 | [学习目录](README.md)、[零基础入口](start-here.md)、[逐文件清单](file-map-inventory.md)；只影响读者理解。 | 先对照源码与[当前架构](../architecture/overview.md)，再运行 `node scripts/check-docs.mjs`；增减文件时更新清单。 | 文档可能变得更准确或更难懂；它不改变程序行为。 |
| AWS 部署步骤、审批或 Terraform 资源 | 从[部署入口](../deployment/README.md)找到相应操作说明和 `infra/terraform/` 配置，先定范围、费用与验收。 | 先做相应本地检查和计划审阅；实际 AWS 结果要另有同次执行证据。 | 可能修改云资源并产生费用；创建付费资源需明确授权，生产保留两道审批。 |

例如，想让**每个新功能都先写验收标准**，先核对 `AGENTS.md` 与 `memory/project.md` 的项目级约定，再检查项目 Story 技能是否给出可执行步骤。想让**某一个按钮**有特殊验收，则把标准写进那一次的 Story；前者影响后续任务，后者只管这一次。修改后做文档链接检查，并在下一项小 Story 中确认约定真正被遵守。

## AI-DLC 的规则为什么分层

AI-DLC 是安排开发工作的流程；Codex 是在本项目里执行这套流程的工具环境。项目接入说明见 [AI-DLC 与 Codex](../ai/aidlc-codex.md)和[本仓库 Codex 入门](../../.codex/onboarding.md)。网站的 Bedrock 问答是给访客使用的另一件事，见[问答说明](../ai/README.md)。

AI-DLC 读取当前空间的规则时，按 **`org → team → project → phase → stage`** 逐层增加适用要求：

1. [`org.md`](../../aidlc/spaces/default/memory/org.md) 是通用默认方法；[`team.md`](../../aidlc/spaces/default/memory/team.md) 是团队确认过的习惯。团队文件注明应在实践确认关口维护。
2. [`project.md`](../../aidlc/spaces/default/memory/project.md) 放本项目特有、长期有效的补充；[`phases/`](../../aidlc/spaces/default/memory/phases/) 放特定阶段才适用的补充。
3. 最后才是具体阶段的要求。阶段由 AI-DLC 框架或其插件声明，不是把一段文字写进 `project.md` 就会出现的新步骤。

这些层是**叠加**，不是后面一层随意推翻前面一层。要改规则，先确认适用范围；若新句子和已有要求矛盾，应走相应实践确认或 AI-DLC 反馈流程解决冲突。当前空间是 `default`；如果以后切换空间，要先确定活动空间，再找那个空间的 `memory/`，不要因为这里给出 `default` 就改错地方。

## “增加流程”有两种意思

**给本项目增加一个做法**：例如每次改学习文档都更新索引、跑链接检查。把长期约定写在 `AGENTS.md` 或当前空间 `memory/project.md`，把可执行步骤放在项目自写的 `.agents/skills/portfolio-*` 或新的项目技能中，并在一个 Story 上验证。这仍使用已有 AI-DLC 生命周期。

**真正增加一个 AI-DLC 生命周期阶段**：例如想让每项工作都经历一个新的正式关口。那是扩展框架图，不是再写一份 `SKILL.md` 或改某次状态文件。现有[Codex 入门的插件说明](../../.codex/onboarding.md#plugins)指出，框架插件在 `plugins/<name>/` 声明阶段、范围或代理，选用插件后由框架生成阶段图与运行入口。应先设计该阶段的输入、产出、依赖和检查，再按框架的插件与编译流程实施并验证；这个项目当前没有因为本指南而新增阶段。若只是想调这一次工作的阶段、深度或计划，应从 AI-DLC 的计划/状态入口提出修改，让流程记录决定，而不是手改内部状态。

## 哪些地方只能查看，不能当成修改入口

- `aidlc/spaces/default/intents/<某次工作>/` 保存该次需求、计划和成果；其中状态、审计记录与阶段观察日志由 AI-DLC 管理。可以阅读它们理解发生了什么，但不能靠编辑这些记录“完成审批”或“跳到下一阶段”。[本次工作的记录](../../aidlc/spaces/default/intents/261117-docs-learning-restructur/aidlc-state.md)只是一个实例。
- `.codex/`、`.agents/skills/aidlc*` 主要是安装到 Codex 的框架适配文件；编译后的 `.codex/tools/data/stage-graph.json` 是结果，不是新增阶段的手写源文件。`.codex/rules/default.rules` 管 Codex 命令权限，不是上面那套 AI-DLC 方法规则。项目自写的 `portfolio-*` 技能则可以按上表维护。
- `docs/history/` 和 `docs/stories/` 中的旧结果记录的是当时的工作，不代表现在 AWS 线上状态。新决策应进入本次工作记录或新的 Story，并用当前代码和同次验证证据核对。

一句话记住：**项目约定找 `AGENTS.md`，长期 AI-DLC 项目规则找活动空间 `memory/project.md`，项目执行步骤找 `portfolio-*` 技能，一次任务找 Story，真正新增生命周期阶段走框架插件。**
