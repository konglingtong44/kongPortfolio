# kongPortfolio 技术导览：从零认识网页、AWS 与 AI

如果你完全不懂编程、AI 或 AWS，先记住：**访客打开的是网页；网页向 Java 服务要资料；AWS 是配置中用于存放网页、接收请求和运行服务的平台；AI 只处理受限制的问答。** 本篇解释仓库里实际写了什么、为什么要这样分工，以及每种工具带来的好处。想先看项目全貌，读[零基础入口](start-here.md)；想查每个手写文件，读[逐文件清单](file-map-inventory.md)。

> **证据边界（2026-11-23）**：下面的“项目使用”依据仓库里的代码、依赖和 Terraform 配置，说明可见实现和预期部署方式；本篇没有查询实时 AWS，不能证明此刻线上运行的版本。[带日期的发布记录](../history/README.md)只说明记录当时发生的事。“教学比较”是帮助理解的例子，不代表项目曾经采用、部署或正式否决那些方案。

## 先分清四件事

| 事情 | 用日常话说 | 本项目的对应位置 |
|---|---|---|
| 写网页 | 制作访客看到的画面与按钮 | [`frontend/src/`](../../frontend/src/) |
| 写服务 | 决定能返回哪些资料，检查问答 | [`backend/src/main/`](../../backend/src/main/) |
| 在本机试运行 | 让自己的电脑临时扮演网页和服务所在的机器 | [`compose.yaml`](../../compose.yaml) |
| 准备线上设施和发布 | 用配置描述 AWS 资源及从提交到上线的步骤 | [`infra/terraform/`](../../infra/terraform/)、[`codebuild/`](../../codebuild/) |

**一次访问怎样走？** 浏览器取得网页后，前端会请求 `/api/profile` 获取公开资料；问答页面通过 `/api/bedrock` 提交问题。按仓库的线上配置，CloudFront 把私有 S3 中的网页交给访客，API Gateway 把 API 请求送到运行 Java 服务的 Lambda。后端只在满足规则时读取批准资料并调用模型。入口可分别核对[前端请求](../../frontend/src/App.tsx)、[问答请求](../../frontend/src/features/qa/bedrock-api.ts)、[网站配置](../../infra/terraform/portfolio/site.tf)、[API 配置](../../infra/terraform/portfolio/api.tf)和[问答控制器](../../backend/src/main/java/dev/kongortfolio/bedrock/BedrockController.java)。

## 1. 网页：访客直接看到的部分

| 项目实际使用 | 是什么、为何放在这里 | 给项目带来的好处 | 证据 |
|---|---|---|---|
| HTML / CSS | HTML 表示页面内容，CSS 管布局与外观；网页仍由浏览器呈现。 | 内容与外观可分别修改。 | [页面入口](../../frontend/index.html)、[页面样式](../../frontend/src/styles.css) |
| React | 帮忙把页面拆成可组合的界面组件；它是界面库。 | 语言切换、问答、项目展示可以各管自己的状态和画面。 | [依赖](../../frontend/package.json)、[应用入口](../../frontend/src/App.tsx) |
| TypeScript | 在 JavaScript 上增加类型检查，开发时更早发现数据形状不一致。 | 前后端交换资料时，字段错误较容易在构建阶段暴露。 | [依赖及 `tsc -b` 构建命令](../../frontend/package.json)、[前端源码](../../frontend/src/) |
| Vite | 本地开发服务器和网页打包工具。 | 开发时能快速预览，发布前把网页资源整理成可分发文件。 | [开发及构建命令](../../frontend/package.json)、[Vite 配置](../../frontend/vite.config.ts) |
| Vitest / Testing Library | 运行前端测试、模拟用户看到和操作的界面。 | 修改交互时可检查旧行为是否还成立。 | [测试依赖及命令](../../frontend/package.json)、[测试文件](../../frontend/src/App.test.tsx) |
| 三语选择 | 默认参考浏览器语言；用户手动选择后尝试存入本机浏览器。 | 日语、中文、英语访客可以阅读同一网站，回访时尽量保留选择。 | [语言选择逻辑](../../frontend/src/i18n.ts) |

这里的 **Node.js / npm** 是开发者运行前端工具与安装依赖的环境，不是访客浏览器里运行的后端。[`frontend/package.json`](../../frontend/package.json)要求 Node 24 系列，并列出 React、TypeScript、Vite、Vitest 的版本与命令。

## 2. Java 服务：公开资料与问答的守门员

| 项目实际使用 | 是什么、为何放在这里 | 给项目带来的好处 | 证据 |
|---|---|---|---|
| Java 21 | 编写服务端程序的语言及运行环境。 | 使用明确的语言版本构建和测试同一套服务。 | [Maven 配置](../../backend/pom.xml) |
| Spring Boot / Web MVC | 接收 HTTP 请求并把它交给对应 Java 方法的框架。 | 网页请求公开资料和问答时，有清楚的 API 入口。 | [依赖](../../backend/pom.xml)、[资料接口](../../backend/src/main/java/dev/kongortfolio/profile/ProfileController.java)、[问答接口](../../backend/src/main/java/dev/kongortfolio/bedrock/BedrockController.java) |
| Maven | 下载 Java 依赖、编译、测试和打包的工具。 | 本地与构建阶段可以重复执行相同的构建步骤。 | [`pom.xml`](../../backend/pom.xml) |
| JSON 公开资料 | 一种程序容易读取的文本格式；三语资料随应用放在文件中。 | 这个小型项目无需先维护数据库；修改公开内容也有清楚的文件入口。 | [资料读取](../../backend/src/main/java/dev/kongortfolio/profile/ProfileService.java)、[资料文件夹](../../backend/src/main/resources/content/) |
| Lambda 适配与 ZIP | 把 Spring Boot 服务包装成 AWS Lambda 能接收的形式。 | 网站 API 可按请求运行，不要求为当前目标维持常驻 ECS 容器。 | [Lambda 构建配置](../../backend/pom.xml)、[Lambda 入口](../../backend/src/lambda/java/dev/kongortfolio/lambda/PortfolioLambdaHandler.java) |

**API** 可以理解成网页和服务约好的“点单格式”。`GET /api/profile?lang=ja` 是读公开资料的入口；问答的 `POST /api/bedrock` 接收问题。浏览器不直接取得模型权限，限制问题、读取资料与调用模型的逻辑留在后端。[资料控制器](../../backend/src/main/java/dev/kongortfolio/profile/ProfileController.java)和[问答控制器](../../backend/src/main/java/dev/kongortfolio/bedrock/BedrockController.java)展示了这些入口。

## 3. 本机运行与线上设施

**Docker** 把程序与运行环境装进“容器”；**Compose** 用一个文件协调本机两个容器。本项目的 [`compose.yaml`](../../compose.yaml)定义前端和后端，前端只在本机 `127.0.0.1:3000` 开放。它方便本机复现运行方式，**并不表示生产采用 ECS 或 ALB**；当前 AWS 目标在 Terraform 中是 S3/CloudFront 与 API Gateway/Lambda。容器是否真的构建成功，要以实际构建检查为准。

**Terraform** 是“用文件描述云资源”的工具。它让资源关系和改动可以阅读、检查及重复执行；真正创建、修改或删除 AWS 资源需要另行运行计划和应用，可能产生费用。[基础设施目录](../../infra/terraform/)分成五组独立的配置根目录：

| 配置根目录 | 负责什么 | 从哪里核对 |
|---|---|---|
| [`bootstrap/`](../../infra/terraform/bootstrap/) | 为后续 Terraform 状态保存准备基础资源。状态记录实际受管理的资源。 | [配置](../../infra/terraform/bootstrap/main.tf) |
| [`portfolio/`](../../infra/terraform/portfolio/) | 网站、私有 S3、CloudFront、HTTP API、Lambda 与执行权限。 | [网站](../../infra/terraform/portfolio/site.tf)、[API](../../infra/terraform/portfolio/api.tf) |
| [`cicd/`](../../infra/terraform/cicd/) | 自动检查、候选发布、测试环境、审批与部署资源。 | [流水线](../../infra/terraform/cicd/candidate-pipeline.tf) |
| [`cost-control/`](../../infra/terraform/cost-control/) | 费用观察与控制相关资源。 | [配置](../../infra/terraform/cost-control/main.tf) |
| [`bedrock-content/`](../../infra/terraform/bedrock-content/) | 问答所用的受控资料资源。 | [配置](../../infra/terraform/bedrock-content/main.tf) |

这里 **S3** 像文件库，保存网页和批准资料；网站 S3 设置为私有，**CloudFront** 是访客取得网页的公开分发入口。**API Gateway HTTP API** 是 API 的前台，**Lambda** 按请求运行 Java；**IAM 角色**决定服务被允许访问什么。对应关系可在[网站资源](../../infra/terraform/portfolio/site.tf)、[API 与角色](../../infra/terraform/portfolio/api.tf)中查到。

## 4. 从代码到发布

**CI** 指每次改代码后的自动检查，**CD** 指把经过检查的候选版本送到环境中。本项目把这些流程配置在 AWS：**CodeConnections** 接通代码来源，**CodeBuild** 执行 [`codebuild/`](../../codebuild/)里的构建指令，**CodePipeline** 安排候选版本和阶段，**CodeDeploy** 管理 Lambda 的逐步流量切换。[连接配置](../../infra/terraform/cicd/main.tf)、[构建配置](../../infra/terraform/cicd/build.tf)、[候选流水线](../../infra/terraform/cicd/candidate-pipeline.tf)和[部署配置](../../infra/terraform/cicd/deployment.tf)是证据。

**为什么要分阶段？** 测试环境先检查候选版本；第一道人为审批后才能检查生产 Green；第二道审批后才允许切换访客流量。这样每次发布有可追溯的候选文件和检查点。[流水线中的两处 `Approval`](../../infra/terraform/cicd/candidate-pipeline.tf)与[CodeDeploy 部署组](../../infra/terraform/cicd/deployment.tf)写明了预期流程。配置存在不等于本轮已执行发布；当前操作与历史证据分别从[部署入口](../deployment/README.md)和[历史记录](../history/README.md)核对。

## 5. AI 问答：模型只在边界内协助回答

**模型**是根据输入生成文字的程序；**Bedrock Mantle** 是这里调用模型的 AWS 接口；代码指定的模型是 **Qwen `qwen.qwen3-235b-a22b-2507`**。[模型网关](../../backend/src/main/java/dev/kongortfolio/bedrock/MantleGateway.java)写有接口地址、模型 ID、AWS SigV4 签名、输出上限和超时。**SigV4** 可以先理解为 AWS 请求的身份签名，由后端使用自己的执行身份完成；浏览器不保有模型密钥。

问答不是“把所有文件扔给 AI”。后端先用[问题范围规则](../../backend/src/main/java/dev/kongortfolio/bedrock/QuestionScope.java)和[问答服务](../../backend/src/main/java/dev/kongortfolio/bedrock/QuestionService.java)检查输入；[批准资料读取器](../../backend/src/main/java/dev/kongortfolio/bedrock/ApprovedFacts.java)在配置了 S3 时要求固定版本号与 SHA-256 校验；[问答设置](../../backend/src/main/java/dev/kongortfolio/bedrock/BedrockSettings.java)限制输出长度和等待时间。API 层还有[请求路由与限流配置](../../infra/terraform/portfolio/api.tf)。这些限制有助于控制范围、延迟和费用，不能保证每句模型回答都正确。

这里没有供网站自主调用任意工具的 **AI Agent**，也没有向量数据库或已部署的 RAG 知识库。[现行架构说明](../architecture/overview.md)进一步区分了实际实现与备选方案。**AI-DLC** 是开发过程中组织需求、计划、验收和记录的工作方法；**Codex** 是参与开发的助手。它们与访客问答所用的 Bedrock/Qwen 不是同一层。想修改 AI-DLC 规则，从[工作规则入口](start-here.md#以后要改规矩或流程)开始，而不是改模型调用文件。

## 教学比较：帮助理解，不是项目决策历史

| 如果用另一种常见做法 | 与本项目做法的区别 | 本项目做法在此规模的好处 |
|---|---|---|
| 不用 React，直接用浏览器原生 JavaScript 拼页面 | React 让三语内容、问答和多个交互区以组件组织；原生方式依赖开发者自行协调这些状态。 | 功能分区更清楚，已有组件测试也更容易围绕访客操作编写。 |
| 只写 JavaScript，不用 TypeScript | TypeScript 在构建前检查资料字段与函数用法；纯 JavaScript 更少工具步骤，但错误通常留到运行时发现。 | 接口资料结构的改动较容易提前被发现。 |
| 手工配置网页打包流程，不用 Vite | Vite 统一开发预览与生产构建命令；手工流程要自己维护资源转换和打包步骤。 | 新人能按 `package.json` 中固定命令复现本地开发与打包。 |
| 直接用另一种服务框架或手写 HTTP 处理，不用 Spring Boot | Spring Boot 给 Java API 提供路由、配置和测试约定；较轻的框架可能少些依赖，但需要重新组织现有控制器与 Lambda 适配。 | 公开资料和问答已有清楚的 Java 接口与测试边界。 |
| 手工下载 Java 依赖和执行编译，不用 Maven | Maven 用 `pom.xml` 固定依赖及构建命令；手工方式需要分别维护版本、测试与打包步骤。 | 本机和 AWS 构建可以执行同一组可复现命令。 |
| 分别在电脑上启动前后端，不用 Docker/Compose | 项目支持按工具各自启动；Compose 则用一个文件声明两个本地服务如何组合。 | 练习前后端一起运行时，更容易看清端口与依赖关系；容器构建仍须实际测试。 |
| 手工在 AWS 控制台逐项建资源 | Terraform 把目标资源和依赖写成可检查的文件。 | 复查和重建时有统一依据。 |
| 用一台常驻网页服务器交付静态页面 | 当前配置把构建出的网页放在私有 S3，由 CloudFront 对外分发；常驻服务器还要维护运行进程。 | 页面文件和 API 分开交付，网页不需要常驻应用容器。 |
| 为少量公开资料先引入数据库 | 当前三语 JSON 随后端提供。 | 少一个长期运行和维护的组件；资料规模扩大时需要重新评估。 |
| 始终运行一组服务容器 | 当前线上配置采用 API Gateway + Lambda，容器主要用于本机。 | 小型、请求型 API 无需维护常驻 ECS/ALB 作为当前目标。 |
| 用外部 CI/CD 平台或人工上传制品 | 当前流程在 AWS CodeBuild 检查和构建，再由 CodePipeline、CodeDeploy 保持候选身份、两道审批和分批流量。 | 检查、审批和生产切换在同一套已配置的 AWS 交付链中留证；也增加了需要维护的云端流程。 |
| 浏览器直接请求模型 | 目前由 Java 后端检查范围、读取批准资料，再请求 Bedrock。 | 模型权限与资料选择留在服务端。 |
| 为每次问答另建向量检索库或直接调用模型提供商 | 当前资料范围较小，由后端读取经批准的资料并调用 Bedrock；向量库和直接连接提供商都需另建资料与权限流程。 | 先保持资料版本、权限和请求边界简单；资料规模或质量要求变化时可重新评估。 |

以上只是**教学比较**。仓库的旧笔记或备选设计不等于已部署事实；不要据此推断团队当时为何选择某技术。

## 下一步去哪里

| 想做什么 | 入口 |
|---|---|
| 看每个目录和每个手写文件的用途 | [文件夹地图](file-map.md) → [逐文件清单](file-map-inventory.md) |
| 在自己电脑上运行 | [01 本地运行](01-local.md) |
| 读当前架构与 AI 边界 | [架构](../architecture/overview.md) → [AI 说明](../ai/README.md) |
| 改团队规矩或新增工作流程 | [规则与流程入口](start-here.md#以后要改规矩或流程) |
| 按章节学习 AWS 发布 | [操作课程总目录](README.md) |
