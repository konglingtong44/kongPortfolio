# 第一次看 kongPortfolio：从零开始

如果你还不知道 AI、编程或 AWS 是什么，从这里读起。你不用先注册云账号，也不用运行任何命令。本文解释“这是什么”以及“去哪里看”；[原有的操作课程](README.md)留给想亲手练习的人。

## 先用一句话认识项目

kongPortfolio 是一个用日语、中文和英语展示个人资料的网页，也提供一个范围有限的问答入口。[根目录说明](../../README.md)列出本地运行方法；[当前实现地图](../architecture/overview.md)列出代码入口。本资料只解释仓库里能看到的实现，不替作者编造经历或账号信息。

想象一家小型展馆：

| 你看到的事 | 项目里是谁负责 | 可以先记成 |
|---|---|---|
| 打开网页、切换语言、点开介绍 | **前端**，主要在 [`frontend/`](../../frontend/) | 展厅和按钮 |
| 网页向另一端索取资料或提交问题 | **API**，由 [`backend/`](../../backend/) 提供 | 点单窗口 |
| 决定哪些资料能给访客、问题是否可答 | **后端**，Java 程序在 `backend/` | 后台工作人员 |
| 保存和分发网页、接收线上请求 | **AWS**，配置写在 [`infra/`](../../infra/) | 展馆所在的场地和通道 |
| 根据允许使用的资料组织回答 | **AI 模型**，由后端有条件地调用 | 一位会组织文字的助手 |

“前端”是浏览器里运行的页面；“后端”是接收请求、执行规则并返回结果的程序。**API** 是两者约定的“问什么、答什么”的接口。**AWS** 是提供线上存储和运行服务的云平台；“云”仍然是别人的计算机和网络，需要配置权限并可能产生费用。**AI 模型** 是能根据输入生成文字的程序，可能答错，所以不能把它当作未经核实的事实来源。

## 这一次访问大致怎么走

1. 浏览器从 CloudFront 取得网页文件；文件保存在不直接公开的 S3 中。CloudFront 像对外开放的窗口，S3 像文件库。
2. 网页用 React（组织页面的工具）和 TypeScript（帮助检查程序写法的语言）编写，Vite 帮开发者在本地启动和打包。访客切换语言、浏览项目等动作先在浏览器发生。
3. 需要公开资料或提交问题时，浏览器调用 API。在线上设计里，API Gateway（请求入口）接收请求，Lambda 运行用 Java（一种编程语言）和 Spring Boot（搭建 Java 服务的框架）写的后端。Lambda 可以理解为“有请求时启动处理工作的服务”。
4. 对问答，Java 先检查输入、语言和范围，再读取批准使用的资料，并通过 Bedrock 的接口向配置的 Qwen 模型发出受限请求；返回结果还会被检查。这里的 Bedrock 是 AWS 提供的模型访问服务，Qwen 是模型名称。[问答实现说明](../ai/README.md)和[架构图](../architecture/overview.md)给出细节。

本项目没有应用数据库；公开三语资料放在 JSON（一种便于程序读写的文本格式）文件中。问答不是可以自主访问任意工具的“智能代理”，也没有已部署的向量知识库。限制输入、输出和调用次数是为了控制答复范围、时间与费用；它不能保证回答永远正确。[实际边界](../architecture/overview.md)以代码和配置为准。

## 建议怎么读

| 顺序 | 读什么 | 读完要能回答 |
|---|---|---|
| 1 | 本页 | 项目做什么，网页、后端、AWS、AI 如何接力？ |
| 2 | [技术导览](technology-guide.md) | React、Java、AWS、AI 和发布工具分别做什么、为何这样分工？ |
| 3 | [当前实现地图](../architecture/overview.md) | 哪些代码负责页面、资料和问答？ |
| 4 | [AI 资料入口](../ai/README.md) | 模型在哪里调用，哪些只是旧方案？ |
| 5 | [文件夹地图](file-map.md)、[逐文件清单](file-map-inventory.md)和[规则与流程维护指南](maintenance-guide.md) | 每个目录及项目手写文件是做什么的，修改约定从哪里开始？ |
| 6 | [操作课程总目录](README.md) | 想从本地运行或学习 AWS 时，选哪一章？ |

只想了解项目，到第 5 步即可。若要动手，[01 本地运行](01-local.md)不要求 AWS 账号；[00 工具和账号](00-start.md)起的云端课程可能涉及费用，先读每章的范围与注意事项。课程中的 00–14 章、[历史记录](../history/README.md)仍可从总目录找到。

## 先找哪个文件夹

这张小地图让你先找到方向。要查每个目录的目的，读[文件夹地图](file-map.md)；要查项目手写文件的用途和修改时机，读[逐文件清单](file-map-inventory.md)。清单注明核对范围与日期；无法核实的用途会标明待核实。

| 路径 | 先把它看作 | 需要继续查时 |
|---|---|---|
| [`frontend/`](../../frontend/) | 网页、三语交互和前端测试 | [页面代码入口](../../frontend/src/App.tsx) |
| [`backend/`](../../backend/) | Java API、公开资料、受限问答和 Lambda 入口 | [后端启动入口](../../backend/src/main/java/dev/kongortfolio/PortfolioApplication.java) |
| [`infra/`](../../infra/) | AWS 基础设施和费用控制的配置 | [部署说明](../deployment/README.md) |
| [`codebuild/`](../../codebuild/) | AWS 构建阶段的指令 | [发布链路](../deployment/README.md) |
| [`scripts/`](../../scripts/) | 本地启动、检查、发布辅助脚本 | [脚本索引](../../scripts/README.md) |
| [`docs/`](../) | 架构、产品、部署、学习、历史资料 | [文档总入口](../README.md) |
| [`aidlc/`](../../aidlc/) | AI-DLC 这次及以后每项工作的决定和成果记录 | [本次工作记录](../../aidlc/spaces/default/intents/261117-docs-learning-restructur/aidlc-state.md) |
| [`.agents/skills/`](../../.agents/skills/) | 可被开发助手调用的项目工作方法和 AI-DLC 入口 | [项目 Story 方法](../../.agents/skills/portfolio-story/SKILL.md) |
| [根目录 `AGENTS.md`](../../AGENTS.md) | 本项目共同遵守的约定 | [原文](../../AGENTS.md) |

同一项目有多种文件，是因为页面、服务端、云配置、自动检查和学习资料承担不同职责。把它们放在相应目录，可以让修改范围容易找到，也便于检查一个改动会影响哪里。`node_modules/`、构建输出等下载或生成内容不应被当作项目手写源码；详细地图会按类别说明它们。

## 以后要改规矩或流程

下面是快速索引；要看每种修改的适用范围、验证方法和影响，读[规则与流程维护指南](maintenance-guide.md)。

先区分“告诉开发助手这项目怎么做”与“改网站功能”：

| 想修改什么 | 从哪里开始 |
|---|---|
| 项目的工作约定、验收和安全边界 | [根目录 `AGENTS.md`](../../AGENTS.md) |
| AI-DLC 针对这个项目长期适用的规则 | [`aidlc/spaces/default/memory/project.md`](../../aidlc/spaces/default/memory/project.md)；按阶段的规则在 [`phases/`](../../aidlc/spaces/default/memory/phases/) |
| 一个项目专用的执行步骤 | [`.agents/skills/portfolio-story/SKILL.md`](../../.agents/skills/portfolio-story/SKILL.md) 等项目自写技能 |
| 学习资料和目录 | [本目录总览](README.md)与[文档入口](../README.md) |
| 一次具体需求、计划和审核结果 | [`aidlc/spaces/default/intents/`](../../aidlc/spaces/default/intents/) 下对应工作的记录；先从本次[状态文件](../../aidlc/spaces/default/intents/261117-docs-learning-restructur/aidlc-state.md)辨认结构 |

AI-DLC 是帮助规划、实施、检查和记录工作的流程；它不替代项目自己的产品说明、代码或部署文档。`.codex/` 中的框架文件和工具生成记录有各自的管理者，看到重复文字也不要直接删改。想新增工作流程，先改项目自写的约定或技能，再核对与 AI-DLC 的关系；[AI-DLC 接入说明](13-aidlc-codex.md)提供现有入口。改文档后运行 `node scripts/check-docs.mjs` 检查本地链接。

## 怎样理解“已经实现”

**仓库里有代码**、**本地检查通过**、**历史上某次生产发布成功**、**此刻线上仍运行同一版本**，是四件不同的事。这里的架构与技术说的是仓库可见实现；[历史发布记录](../history/releases/bedrock-staging-language-fix.md)只证明记录当时的结果。本次整理没有查询实时 AWS 状态，也没有部署、调用付费模型或验证手机真机。看旧文章时，先看日期和对应源码版本，再用[当前实现地图](../architecture/overview.md)核对现行代码。
