# 项目逐文件清单

核对日期：2026-11-24。范围：本机 Git 可见的项目自写文件（已跟踪文件和当前尚未提交的项目自写文件），不含 AI-DLC 安装/运行内部文件、`outputs/` 日期证据及依赖锁文件。后面三类由[文件夹地图](file-map.md#哪些文件由人写哪些由工具管理)按类别解释。此清单是导航与维护索引，不是实时 AWS 资源清单；用途由现有文件标题、代码入口与仓库说明核对，标为“待核实”的行尚无足够证据。新增/移动文件后更新对应行，并运行文档链接检查。

每行的“何时修改”是查找入口，不代替实际影响分析。路径保持真实大小写和扩展名。

## 费用控制程序

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `infra/cost-control/controller.py` | 费用控制程序 | 费用控制 Lambda 实现 | 费用控制行为或回归要求变化时 |
| `infra/cost-control/test_aws_contract.py` | 费用控制程序 | 对 test_aws_contract 的 Python 回归测试 | 对应行为变化或补回归时 |
| `infra/cost-control/test_controller.py` | 费用控制程序 | 对 test_controller 的 Python 回归测试 | 对应行为变化或补回归时 |

## 根目录与 Git

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `.gitattributes` | 根目录与 Git | Git 文本属性与换行处理规则 | 协作、安全或 Git 规则变化时 |
| `.githooks/check-staged-paths.mjs` | 根目录与 Git | 提交路径与私有文件检查 | 协作、安全或 Git 规则变化时 |
| `.githooks/pre-commit` | 根目录与 Git | 提交前秘密/路径检查入口 | 协作、安全或 Git 规则变化时 |
| `.githooks/pre-push` | 根目录与 Git | 推送前秘密/路径检查入口 | 协作、安全或 Git 规则变化时 |
| `.gitignore` | 根目录与 Git | Git 不跟踪的私有输入、依赖和构建路径规则 | 协作、安全或 Git 规则变化时 |
| `.gitleaks.toml` | 根目录与 Git | Gitleaks 秘密扫描配置 | 协作、安全或 Git 规则变化时 |
| `AGENTS.md` | 根目录与 Git | 项目协作、产品边界和安全约定 | 协作、安全或 Git 规则变化时 |
| `compose.yaml` | 根目录与 Git | 本地前后端容器组合定义 | 项目入口或本地组合变化时 |
| `README.md` | 根目录与 Git | 仓库项目介绍与本地运行入口 | 项目入口或本地组合变化时 |

## 后端

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `backend/.dockerignore` | 后端 | 后端容器构建时排除的文件 | 相应 API、模型调用、打包或配置变化时 |
| `backend/Dockerfile` | 后端 | 后端本地容器构建配方 | 相应 API、模型调用、打包或配置变化时 |
| `backend/pom.xml` | 后端 | Java 依赖、测试、构建与 Lambda 打包配置 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/assembly/lambda.xml` | 后端 | Lambda ZIP 打包内容定义 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/lambda-test/java/dev/kongortfolio/lambda/PortfolioLambdaHandlerTest.java` | 后端 | 对 PortfolioLambdaHandler 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/lambda/java/dev/kongortfolio/lambda/PortfolioLambdaHandler.java` | 后端 | API Gateway 请求到 Spring 的 Lambda 适配入口 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/bedrock/ApprovedFacts.java` | 后端 | 读取并校验批准的私有问答资料 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/bedrock/BedrockController.java` | 后端 | 问答 HTTP 接口与输入边界 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/bedrock/BedrockSettings.java` | 后端 | 问答配置和限制参数 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/bedrock/MantleGateway.java` | 后端 | 带签名的模型调用与超时处理 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/bedrock/ModelGateway.java` | 后端 | 模型调用抽象接口 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/bedrock/QuestionFacts.java` | 后端 | 问答事实资料结构 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/bedrock/QuestionScope.java` | 后端 | 可回答问题范围判断 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/bedrock/QuestionService.java` | 后端 | 问题校验、模型调用和答复检查 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/logging/ApiAccessLogFilter.java` | 后端 | API 访问日志过滤器 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/PortfolioApplication.java` | 后端 | Spring Boot 后端启动入口 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/profile/Profile.java` | 后端 | 公开资料数据模型 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/profile/ProfileController.java` | 后端 | 公开资料 HTTP 接口 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/java/dev/kongortfolio/profile/ProfileService.java` | 后端 | 从本地公开资料文件读取三语内容 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/resources/application-lambda.properties` | 后端 | Lambda 环境配置 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/resources/application.properties` | 后端 | 后端本地默认配置 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/main/resources/content/bedrock-facts.md` | 后端 | 问答可用事实内容的项目模板/资料 | 经核实公开资料或审核事实变化时 |
| `backend/src/main/resources/content/profile-en.json` | 后端 | 英语公开资料 | 经核实公开资料或审核事实变化时 |
| `backend/src/main/resources/content/profile-ja.json` | 后端 | 日语公开资料 | 经核实公开资料或审核事实变化时 |
| `backend/src/main/resources/content/profile-zh.json` | 后端 | 中文公开资料 | 经核实公开资料或审核事实变化时 |
| `backend/src/main/resources/logback-spring.xml` | 后端 | Java 日志输出配置 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/test/java/dev/kongortfolio/bedrock/ApprovedFactsTest.java` | 后端 | 对 ApprovedFacts 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/java/dev/kongortfolio/bedrock/MantleGatewayTest.java` | 后端 | 对 MantleGateway 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/java/dev/kongortfolio/bedrock/OfflineQaEvaluationTest.java` | 后端 | 对 OfflineQaEvaluation 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/java/dev/kongortfolio/bedrock/QuestionFactsTest.java` | 后端 | 对 QuestionFacts 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/java/dev/kongortfolio/bedrock/QuestionScopeTest.java` | 后端 | 对 QuestionScope 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/java/dev/kongortfolio/bedrock/QuestionServiceTest.java` | 后端 | 对 QuestionService 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/java/dev/kongortfolio/BedrockApiTest.java` | 后端 | 对 BedrockApi 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/java/dev/kongortfolio/BedrockEnabledApiTest.java` | 后端 | 对 BedrockEnabledApi 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/java/dev/kongortfolio/BedrockScopeApiTest.java` | 后端 | 对 BedrockScopeApi 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/java/dev/kongortfolio/LocalProfileReloadTest.java` | 后端 | 对 LocalProfileReload 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/java/dev/kongortfolio/ProfileApiTest.java` | 后端 | 对 ProfileApi 的 Java 回归测试 | 对应行为变化或补回归时 |
| `backend/src/test/resources/qa-eval/cases.json` | 后端 | 离线问答评估用例 | 相应 API、模型调用、打包或配置变化时 |
| `backend/src/test/resources/qa-eval/README.md` | 后端 | 离线问答评估夹具说明 | 相应 API、模型调用、打包或配置变化时 |

## 脚本

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `scripts/ai/codex.ps1` | 脚本 | 项目自写 Codex 命令包装 | 对应命令行为或调用方变化时 |
| `scripts/ai/test-codex-report.ps1` | 脚本 | Codex 诊断报告回归测试 | 对应行为变化或补回归时 |
| `scripts/ai/tools.ps1` | 脚本 | Codex 辅助诊断函数 | 对应命令行为或调用方变化时 |
| `scripts/apply-first-release.ps1` | 脚本 | 审核后应用第一次部署计划 | 对应命令行为或调用方变化时 |
| `scripts/aws-preflight.ps1` | 脚本 | AWS 账号、区域和权限预检查 | 对应命令行为或调用方变化时 |
| `scripts/check-bedrock-access.ps1` | 脚本 | 核对 Bedrock 模型访问 | 对应命令行为或调用方变化时 |
| `scripts/check-docs.mjs` | 脚本 | 文档检查的兼容命令入口 | 对应命令行为或调用方变化时 |
| `scripts/check-source-connection.ps1` | 脚本 | 核对 AWS 源码连接 | 对应命令行为或调用方变化时 |
| `scripts/check.ps1` | 脚本 | 本地综合检查入口 | 对应命令行为或调用方变化时 |
| `scripts/checks/check-docs.mjs` | 脚本 | 文档本地链接检查实现 | 对应命令行为或调用方变化时 |
| `scripts/checks/plan-staging-sampling.mjs` | 脚本 | STG 模型采样与预算草案 | 对应命令行为或调用方变化时 |
| `scripts/checks/review-staging.mjs` | 脚本 | STG 报告只读审阅 | 对应命令行为或调用方变化时 |
| `scripts/checks/staging-pricing.json` | 脚本 | STG 采样计划使用的价格输入快照 | 对应命令行为或调用方变化时 |
| `scripts/checks/test-docs.mjs` | 脚本 | 文档检查器回归测试 | 对应行为变化或补回归时 |
| `scripts/checks/test-file-map.mjs` | 脚本 | 逐文件清单范围与导航回归测试 | 对应行为变化或补回归时 |
| `scripts/checks/test-approved-cleanup.mjs` | 脚本 | AI-DLC 接入历史状态修订与首批边界回归测试 | 两份 AI 入口或整理记录变化时 |
| `scripts/checks/test-cleanup-proposal.mjs` | 脚本 | 文件级整理建议的完整性、路径和首批边界回归测试 | 整理候选或审核范围变化时 |
| `scripts/checks/test-learning-entry.mjs` | 脚本 | 零基础入口导航回归测试 | 对应行为变化或补回归时 |
| `scripts/checks/test-maintenance-guide.mjs` | 脚本 | 规则与流程维护指南的入口、边界与路径回归测试 | 维护指南的路径或规则入口变化时 |
| `scripts/checks/test-review-staging.mjs` | 脚本 | STG 报告审阅回归测试 | 对应行为变化或补回归时 |
| `scripts/checks/test-staging-sampling-plan.mjs` | 脚本 | STG 采样计划回归测试 | 对应行为变化或补回归时 |
| `scripts/checks/test-technology-guide.mjs` | 脚本 | 技术导览的导航、源码依据和表述边界回归测试 | 技术导览的路径或技术依据变化时 |
| `scripts/ci.sh` | 脚本 | AWS CodeBuild 的 CI 执行入口 | 对应命令行为或调用方变化时 |
| `scripts/cost-control.ps1` | 脚本 | 费用关停及恢复操作辅助 | 对应命令行为或调用方变化时 |
| `scripts/deploy-production.mjs` | 脚本 | 生产发布候选交接逻辑 | 对应命令行为或调用方变化时 |
| `scripts/deployment-contract.mjs` | 脚本 | 发布候选与报告的契约校验 | 对应命令行为或调用方变化时 |
| `scripts/dev.ps1` | 脚本 | 本地开发兼容入口 | 对应命令行为或调用方变化时 |
| `scripts/dev/dev.ps1` | 脚本 | 本地前后端启动实现 | 对应命令行为或调用方变化时 |
| `scripts/enable-custom-domain.ps1` | 脚本 | 自定义域名启用辅助 | 对应命令行为或调用方变化时 |
| `scripts/frontend-release.mjs` | 脚本 | 前端发布和 release 指向逻辑 | 对应命令行为或调用方变化时 |
| `scripts/get-aws-costs.ps1` | 脚本 | 查询项目 AWS 费用 | 对应命令行为或调用方变化时 |
| `scripts/green-contract.mjs` | 脚本 | 生产 Green 验证报告契约 | 对应命令行为或调用方变化时 |
| `scripts/install-hooks.ps1` | 脚本 | 安装提交/推送前安全钩子 | 对应命令行为或调用方变化时 |
| `scripts/LambdaPackageSmoke.java` | 脚本 | Lambda ZIP 内容与处理入口冒烟检查 | 对应命令行为或调用方变化时 |
| `scripts/package-frontend.mjs` | 脚本 | 打包前端发布文件 | 对应命令行为或调用方变化时 |
| `scripts/package-pipeline-candidate.mjs` | 脚本 | 打包流水线候选制品 | 对应命令行为或调用方变化时 |
| `scripts/prepare-first-release.mjs` | 脚本 | 第一次发布候选准备逻辑 | 对应命令行为或调用方变化时 |
| `scripts/prepare-first-release.ps1` | 脚本 | 第一次发布候选 PowerShell 入口 | 对应命令行为或调用方变化时 |
| `scripts/publish-first-release.ps1` | 脚本 | 发布首版网站与 API 候选 | 对应命令行为或调用方变化时 |
| `scripts/publish-frontend.mjs` | 脚本 | 发布前端静态文件 | 对应命令行为或调用方变化时 |
| `scripts/README.md` | 脚本 | 本地、检查、AWS 构建脚本的入口与兼容关系 | 对应命令行为或调用方变化时 |
| `scripts/review-first-plan.mjs` | 脚本 | 首次部署计划审阅辅助 | 对应命令行为或调用方变化时 |
| `scripts/smoke-first-deployment.mjs` | 脚本 | 首版部署结果冒烟检查 | 对应命令行为或调用方变化时 |
| `scripts/staging-contract.mjs` | 脚本 | STG 验证报告契约 | 对应命令行为或调用方变化时 |
| `scripts/start-aws-services.ps1` | 脚本 | 启动项目 AWS 服务辅助 | 对应命令行为或调用方变化时 |
| `scripts/stop-aws-services.ps1` | 脚本 | 停止项目 AWS 服务辅助 | 对应命令行为或调用方变化时 |
| `scripts/test-cloudfront-routing.mjs` | 脚本 | CloudFront 路由回归测试 | 对应行为变化或补回归时 |
| `scripts/test-deployment.mjs` | 脚本 | 部署契约回归测试 | 对应行为变化或补回归时 |
| `scripts/test-docs.mjs` | 脚本 | 文档检查兼容测试入口 | 对应行为变化或补回归时 |
| `scripts/test-frontend-release.mjs` | 脚本 | 前端发布回归测试 | 对应行为变化或补回归时 |
| `scripts/test-green-contract.mjs` | 脚本 | Green 验证契约回归测试 | 对应行为变化或补回归时 |
| `scripts/test-hooks.mjs` | 脚本 | 安全钩子回归测试 | 对应行为变化或补回归时 |
| `scripts/test-lambda-package.mjs` | 脚本 | Lambda ZIP 打包回归测试 | 对应行为变化或补回归时 |
| `scripts/test-pipeline-candidate.mjs` | 脚本 | 候选制品打包回归测试 | 对应行为变化或补回归时 |
| `scripts/test-staging-contract.mjs` | 脚本 | STG 验证契约回归测试 | 对应行为变化或补回归时 |
| `scripts/tools.ps1` | 脚本 | 多个 PowerShell 脚本共用的辅助函数 | 对应命令行为或调用方变化时 |
| `scripts/verify-green.mjs` | 脚本 | 执行/核对 Green 验证 | 对应命令行为或调用方变化时 |
| `scripts/verify-pipeline-candidate.mjs` | 脚本 | 核对候选制品身份与内容 | 对应命令行为或调用方变化时 |
| `scripts/verify-staging.mjs` | 脚本 | 执行/核对 STG 验证 | 对应命令行为或调用方变化时 |

## 前端

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `frontend/.dockerignore` | 前端 | 前端容器构建时排除的文件 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/Dockerfile` | 前端 | 前端本地容器构建配方 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/index.html` | 前端 | 浏览器页面的 HTML 外壳 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/nginx.conf` | 前端 | 本地前端容器的 Nginx 服务配置 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/package.json` | 前端 | 前端依赖与 npm 脚本 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/public/favicon.svg` | 前端 | 浏览器标签图标 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/public/images/discovery-garden.png` | 前端 | 发现花园视觉素材 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/AiArchitecture.tsx` | 前端 | AiArchitecture 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/aiArchitectureData.ts` | 前端 | AI 架构展示数据 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/App.test.tsx` | 前端 | 对 App 的前端回归测试 | 对应行为变化或补回归时 |
| `frontend/src/App.tsx` | 前端 | 三语页面与章节的主组合 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/architecture.css` | 前端 | architecture 相关样式 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/architectureData.ts` | 前端 | 整体架构展示数据 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/ArchitectureExplorer.test.tsx` | 前端 | 对 ArchitectureExplorer 的前端回归测试 | 对应行为变化或补回归时 |
| `frontend/src/ArchitectureExplorer.tsx` | 前端 | ArchitectureExplorer 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/ConnectionMap.tsx` | 前端 | ConnectionMap 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/editorialCopy.ts` | 前端 | 页面说明文字 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/features/profile/intro.css` | 前端 | intro 相关样式 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/features/profile/IntroTimeline.test.tsx` | 前端 | 对 IntroTimeline 的前端回归测试 | 对应行为变化或补回归时 |
| `frontend/src/features/profile/IntroTimeline.tsx` | 前端 | IntroTimeline 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/features/profile/skills.css` | 前端 | skills 相关样式 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/features/profile/SkillsBento.tsx` | 前端 | SkillsBento 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/features/qa/bedrock-api.ts` | 前端 | bedrock-api 的前端数据或交互逻辑 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/features/qa/bedrock-copy.ts` | 前端 | bedrock-copy 的前端数据或交互逻辑 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/features/qa/bedrock.css` | 前端 | bedrock 相关样式 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/features/qa/BedrockEntry.test.tsx` | 前端 | 对 BedrockEntry 的前端回归测试 | 对应行为变化或补回归时 |
| `frontend/src/features/qa/BedrockEntry.tsx` | 前端 | BedrockEntry 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/features/regex/RegexLab.test.tsx` | 前端 | 对 RegexLab 的前端回归测试 | 对应行为变化或补回归时 |
| `frontend/src/features/regex/RegexLab.tsx` | 前端 | RegexLab 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/i18n.test.ts` | 前端 | 对 i18n 的前端回归测试 | 对应行为变化或补回归时 |
| `frontend/src/i18n.ts` | 前端 | 浏览器语言检测、手动语言选择与持久化 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/main.tsx` | 前端 | React 页面挂载入口 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/mobile.css` | 前端 | mobile 相关样式 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/MobileChapterNav.test.tsx` | 前端 | 对 MobileChapterNav 的前端回归测试 | 对应行为变化或补回归时 |
| `frontend/src/MobileChapterNav.tsx` | 前端 | MobileChapterNav 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/Modal.tsx` | 前端 | Modal 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/modules.ts` | 前端 | 页面模块数据/分组定义 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/PixelGarden.tsx` | 前端 | PixelGarden 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/profile-pending.css` | 前端 | profile-pending 相关样式 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/profile.ts` | 前端 | 公开个人资料的前端类型和校验 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/ProfilePending.tsx` | 前端 | ProfilePending 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/ProjectGallery.test.tsx` | 前端 | 对 ProjectGallery 的前端回归测试 | 对应行为变化或补回归时 |
| `frontend/src/ProjectGallery.tsx` | 前端 | ProjectGallery 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/RagCosts.tsx` | 前端 | RagCosts 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/recoveryGuide.ts` | 前端 | 恢复流程展示文字 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/recoveryMapData.ts` | 前端 | 恢复图展示数据 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/rollbackData.ts` | 前端 | 回滚演示数据 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/RollbackLab.test.tsx` | 前端 | 对 RollbackLab 的前端回归测试 | 对应行为变化或补回归时 |
| `frontend/src/RollbackLab.tsx` | 前端 | RollbackLab 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/styles.css` | 前端 | styles 相关样式 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/test-setup.ts` | 前端 | 前端测试环境初始化 | 对应行为变化或补回归时 |
| `frontend/src/TouchNodeTooltip.tsx` | 前端 | TouchNodeTooltip 页面组件或交互展示 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/ui.ts` | 前端 | 共用 UI 类型或辅助定义 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/useChapterWheel.test.tsx` | 前端 | 对 useChapterWheel 的前端回归测试 | 对应行为变化或补回归时 |
| `frontend/src/useChapterWheel.ts` | 前端 | 章节滚轮交互 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/useMobileLayout.ts` | 前端 | 手机章节布局状态与行为 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/src/useTimelineDrag.ts` | 前端 | 时间线拖动交互 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/tsconfig.json` | 前端 | TypeScript 编译和类型检查配置 | 对应页面、交互、样式或构建方式变化时 |
| `frontend/vite.config.ts` | 前端 | Vite 开发、构建与测试配置 | 对应页面、交互、样式或构建方式变化时 |

## 文档/ai

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `docs/ai/aidlc-codex.md` | 文档/ai | 解释 AI-DLC、Codex 适配层与项目自写方法的边界和启动入口 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/bedrock-access.md` | 文档/ai | 记录模型选择、访问权限和当次 Bedrock 配置核对 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/bedrock-content.md` | 文档/ai | 比较问答资料存储费用，记录采用私有 S3 与审核内容的方案 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/bedrock-current-quotas.md` | 文档/ai | 保存 2026-11-14 东京账号配额查询结果，供历史比对 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/bedrock-frontend.md` | 文档/ai | 记录问答面板的前端交互、验收与当时发布证据 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/bedrock-java.md` | 文档/ai | 说明 Java 问答边界、调用流程与对应版本的验收 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/bedrock-natural-questions.md` | 文档/ai | 记录从受限示例转向自然提问时的范围判断和 STG 证据 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/bedrock-production-config.md` | 文档/ai | 列出生产问答配置、发布前核对项和后续处理 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/bedrock-public-readiness.md` | 文档/ai | 保存公开问答入口在 2026-11-14 的可用性检查 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/bedrock-quota-support-draft.md` | 文档/ai | 保存未提交的配额支持请求草案及所需证据 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/bedrock-scope.md` | 文档/ai | 记录问答范围规则与一次语义判断的设计演变 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/engineering-concepts.md` | 文档/ai | 解释本项目用到的 AI 工程术语并标出已核实依据 | 该主题的事实、步骤或导航变化时 |
| `docs/ai/README.md` | 文档/ai | 导航网站问答实现、开发流程资料和历史证据 | 该主题的事实、步骤或导航变化时 |

## 文档/architecture

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `docs/architecture/ai-architecture.md` | 文档/architecture | 解释问答输入、Java 边界、模型调用和输出的关系 | 该主题的事实、步骤或导航变化时 |
| `docs/architecture/lambda.md` | 文档/architecture | 记录 Spring Boot 适配 Lambda 请求的设计与验收 | 该主题的事实、步骤或导航变化时 |
| `docs/architecture/overview.md` | 文档/architecture | 集中说明浏览器到 AWS、API、模型的当前代码链路 | 该主题的事实、步骤或导航变化时 |
| `docs/architecture/recovery-map.md` | 文档/architecture | 展示故障恢复与回滚路径及其使用条件 | 该主题的事实、步骤或导航变化时 |

## 文档/deployment

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `docs/deployment/aws-ci.md` | 文档/deployment | 说明 CodeBuild 在提交后运行哪些 CI 检查 | 该主题的事实、步骤或导航变化时 |
| `docs/deployment/candidate-pipeline.md` | 文档/deployment | 记录候选制品流水线的身份固定与验证结果 | 该主题的事实、步骤或导航变化时 |
| `docs/deployment/cicd.md` | 文档/deployment | 解释 AWS 内的检查、候选构建、审批和生产发布链路 | 该主题的事实、步骤或导航变化时 |
| `docs/deployment/codedeploy-next-story.md` | 文档/deployment | 记录 CodeDeploy 灰度与受控自动回滚的验收证据 | 该主题的事实、步骤或导航变化时 |
| `docs/deployment/deployment-plan.md` | 文档/deployment | 说明分阶段部署、蓝绿切换和回滚的设计选择 | 该主题的事实、步骤或导航变化时 |
| `docs/deployment/frontend-publication.md` | 文档/deployment | 记录前端 release 与后端版本配套发布的验收 | 该主题的事实、步骤或导航变化时 |
| `docs/deployment/green-approval.md` | 文档/deployment | 说明第二道生产审批前 Green 环境要核查的证据 | 该主题的事实、步骤或导航变化时 |
| `docs/deployment/manual-cicd-exercises.md` | 文档/deployment | 提供人工执行 CI/CD 故障场景与核对步骤 | 该主题的事实、步骤或导航变化时 |
| `docs/deployment/README.md` | 文档/deployment | 导航首次部署、日常交付、审批、回滚与故障演练 | 该主题的事实、步骤或导航变化时 |
| `docs/deployment/rollback-drill.md` | 文档/deployment | 保存受控停止和自动回滚演练的步骤与结果 | 该主题的事实、步骤或导航变化时 |
| `docs/deployment/staging-approval.md` | 文档/deployment | 说明 STG 验证结果如何进入第一道生产审批 | 该主题的事实、步骤或导航变化时 |

## 文档/history

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `docs/history/architecture.md` | 文档/history | 保留早期架构设想，供与当前实现比较 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/history/aws-commands-20261114.md` | 文档/history | 补录 11 月 13–14 日实际 AWS 命令、输出与判断 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/history/aws-commands-20261115.md` | 文档/history | 保存 VerifyGreen 失败诊断、修复命令和当日结果 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/history/aws-commands-20261116.md` | 文档/history | 保存 11 月 16 日问答面板发布过程的时间线 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/history/aws-execution-log.md` | 文档/history | 汇集本地、Git、请求与 AWS 操作的历史执行证据 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/history/readme-20261116.md` | 文档/history | 保存 2026-11-16 的旧仓库首页版本 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/history/README.md` | 文档/history | 索引带日期的旧设计、命令补录和发布记录 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/history/releases/bedrock-candidate-approval.md` | 文档/history | 保存特定问答候选通过两道人审的发布证据 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/history/releases/bedrock-qa-panel-release.md` | 文档/history | 保存问答面板生产25发布时的核对结果 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/history/releases/bedrock-staging-language-fix.md` | 文档/history | 保存中文回答语言回归及相应 STG/生产证据 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/history/releases/bedrock-typed-release.md` | 文档/history | 保存手动输入问答修复发布到生产23的证据 | 核对或补充该日期的历史证据时；不改写成当前状态 |

## 文档/learning

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `docs/learning/00-start.md` | 文档/learning | 带初学者准备 AWS 身份、临时登录方式和本机工具 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/01-local.md` | 文档/learning | 指导在本机运行页面与后端并检查 Lambda 包 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/02-first-site.md` | 文档/learning | 按顺序讲 State、首个网站/API 部署和域名准备 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/03-delivery.md` | 文档/learning | 教学如何把检查、两道审批与发布接入 AWS | 该主题的事实、步骤或导航变化时 |
| `docs/learning/04-cost-control.md` | 文档/learning | 在接入 AI 前练习费用观察、关停与恢复 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/05-ai.md` | 文档/learning | 教学有边界的问答资料、Java 调用和 Bedrock 接入 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/06-operations.md` | 文档/learning | 提供日常发布、控制台查找与常见故障处理步骤 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/07-ai-workflow.md` | 文档/learning | 比较 Codex 工作方式与项目 AI 开发流程，保存当时练习 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/08-offline-qa-eval.md` | 文档/learning | 指导用假模型和合成问题离线检验问答契约 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/09-staging-evidence.md` | 文档/learning | 教学在本地审阅 STG 问答报告的身份和覆盖 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/10-sampling-plan.md` | 文档/learning | 把真实模型采样调用数、预算与审批边界写成草案 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/11-script-relocation.md` | 文档/learning | 讲解移动 Node 脚本时如何守住兼容入口和检查范围 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/12-browser-regression.md` | 文档/learning | 保存三语、手机模拟与真实 Worker 的浏览器回归结果 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/13-aidlc-codex.md` | 文档/learning | 记录 AI-DLC 安装、Codex 发现及信任核对步骤 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/14-local-codex-diagnostics.md` | 文档/learning | 保存本机 Codex 版本和离线 doctor 的诊断范围 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/cleanup-proposal.md` | 文档/learning | 逐文件记录保留、修正与待核实候选及首批边界 | 项目负责人审核候选或 U6 记录实施结果时 |
| `docs/learning/file-map-inventory.md` | 文档/learning | 项目手写文件的逐项用途与修改时机索引 | 新增、移动、删除项目文件时 |
| `docs/learning/file-map.md` | 文档/learning | 说明目录职责、生成内容类别和逐文件清单的使用方法 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/history-20261114.md` | 文档/learning | 保存 2026-11-14 版旧 AWS 学习路线供历史复盘 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `docs/learning/maintenance-guide.md` | 文档/learning | 用零基础语言说明修改项目规矩、AI-DLC 规则和工作流程的入口与检查 | 项目或 AI-DLC 规则入口变化时 |
| `docs/learning/README.md` | 文档/learning | 索引零基础入口及 00–14 动手和专项学习资料 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/start-here.md` | 文档/learning | 用日常语言串起项目、前后端、AWS、AI 与维护入口 | 该主题的事实、步骤或导航变化时 |
| `docs/learning/technology-guide.md` | 文档/learning | 解释项目实际技术、分工、收益及与教学比较的边界 | 技术栈、构建或 AWS 配置变化时 |

## 文档/operations

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `docs/operations/aws-cost-control.md` | 文档/operations | 说明费用告警、关停阈值和恢复操作的实现与证据 | 该主题的事实、步骤或导航变化时 |
| `docs/operations/aws-cost.md` | 文档/operations | 汇集当前费用查看入口和早期 ECS 估算的区别 | 该主题的事实、步骤或导航变化时 |
| `docs/operations/aws-resource-cleanup.md` | 文档/operations | 保存 2026-11-14 资源清理的对象与结果 | 该主题的事实、步骤或导航变化时 |
| `docs/operations/README.md` | 文档/operations | 导航费用、停站、恢复和资源清理说明 | 该主题的事实、步骤或导航变化时 |

## 文档/product

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `docs/product/content-review.md` | 文档/product | 保存当日网站文案与页面流转的审阅意见 | 该主题的事实、步骤或导航变化时 |
| `docs/product/design-notes.md` | 文档/product | 记录 S1-01H 阶段的视觉与交互决定 | 该主题的事实、步骤或导航变化时 |
| `docs/product/mobile-layout.md` | 文档/product | 写明手机 01/02 收展、03 滚动和独立手势约定 | 该主题的事实、步骤或导航变化时 |
| `docs/product/original-scene.md` | 文档/product | 保存发现花园场景的原始视觉构想 | 该主题的事实、步骤或导航变化时 |
| `docs/product/README.md` | 文档/product | 索引产品文案、桌面与手机设计资料 | 该主题的事实、步骤或导航变化时 |

## 文档/README.md

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `docs/README.md` | 文档/README.md | 从主题目录进入当前架构、学习、交付和历史资料 | 该主题的事实、步骤或导航变化时 |

## 文档/stories

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `docs/stories/001-project-harness.md` | 文档/stories | 记录项目约定与 AI 工作入口这一增量的验收 | 该 Story 的验收或证据更正时 |
| `docs/stories/002-qa-feature.md` | 文档/stories | 记录问答前端按功能归类和旧技能接入的改动 | 该 Story 的验收或证据更正时 |
| `docs/stories/003-dev-launcher.md` | 文档/stories | 记录本地启动脚本分类及兼容性验证 | 该 Story 的验收或证据更正时 |
| `docs/stories/004-offline-qa-eval.md` | 文档/stories | 记录离线问答评估脚本、样本和验收结果 | 该 Story 的验收或证据更正时 |
| `docs/stories/005a-staging-review.md` | 文档/stories | 记录 STG 报告本地审阅工具及验收 | 该 Story 的验收或证据更正时 |
| `docs/stories/005b-sampling-plan.md` | 文档/stories | 记录采样预算草案生成与边界验收 | 该 Story 的验收或证据更正时 |
| `docs/stories/006-doc-checks-layout.md` | 文档/stories | 记录文档检查脚本目录调整和旧入口兼容 | 该 Story 的验收或证据更正时 |
| `docs/stories/007-regex-feature.md` | 文档/stories | 记录正则练习组件按功能归类的变更 | 该 Story 的验收或证据更正时 |
| `docs/stories/008-profile-presentation.md` | 文档/stories | 记录个人介绍和技能展示组件的整理 | 该 Story 的验收或证据更正时 |
| `docs/stories/009-local-checkpoint.md` | 文档/stories | 保存累计改动本地核验结果及未测范围 | 该 Story 的验收或证据更正时 |
| `docs/stories/010-browser-regression.md` | 文档/stories | 记录浏览器三语与手机模拟回归证据 | 该 Story 的验收或证据更正时 |
| `docs/stories/011-aidlc-codex-probe.md` | 文档/stories | 保存 AI-DLC 接入 Codex 前的隔离预演结果 | 该 Story 的验收或证据更正时 |
| `docs/stories/012-aidlc-codex-main.md` | 文档/stories | 记录主仓库接入 AI-DLC 的范围和验收 | 该 Story 的验收或证据更正时 |
| `docs/stories/013-codex-cli-discovery.md` | 文档/stories | 记录普通 PowerShell 找不到 Codex CLI 的修复 | 该 Story 的验收或证据更正时 |
| `docs/stories/014-java-runtime-cve-2026-114938.md` | 文档/stories | 记录 Java 运行时安全更新及本地回归 | 该 Story 的验收或证据更正时 |
| `docs/stories/015-aws-java-runtime-mitigation.md` | 文档/stories | 记录 AWS Java 运行时漏洞缓解计划与证据 | 该 Story 的验收或证据更正时 |
| `docs/stories/local-codex-diagnostics.md` | 文档/stories | 保存本机 Codex 诊断对应的 Story 验收材料 | 该 Story 的验收或证据更正时 |
| `docs/stories/README.md` | 文档/stories | 按序列出可审核的小改动及当前工作入口 | 该 Story 的验收或证据更正时 |
| `docs/stories/template.md` | 文档/stories | 供后续 Story 填写目标、验收、检查与未覆盖项 | 该 Story 的验收或证据更正时 |

## 项目技能

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `.agents/skills/portfolio-release-review/SKILL.md` | 项目技能 | AWS 发布证据审阅方法 | 项目入口或本地组合变化时 |
| `.agents/skills/portfolio-story/SKILL.md` | 项目技能 | 项目单个 Story 的执行与检查方法 | 项目入口或本地组合变化时 |

## AWS 构建

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `codebuild/candidate.yml` | AWS 构建 | 候选制品构建步骤 | AWS 构建/验证/发布阶段变化时 |
| `codebuild/ci.yml` | AWS 构建 | 提交后的自动检查步骤 | AWS 构建/验证/发布阶段变化时 |
| `codebuild/deployment.yml` | AWS 构建 | 生产发布阶段步骤 | AWS 构建/验证/发布阶段变化时 |
| `codebuild/frontend-release.yml` | AWS 构建 | 前端 release 发布步骤 | AWS 构建/验证/发布阶段变化时 |
| `codebuild/green.yml` | AWS 构建 | Green 环境验证步骤 | AWS 构建/验证/发布阶段变化时 |
| `codebuild/staging.yml` | AWS 构建 | STG 环境验证步骤 | AWS 构建/验证/发布阶段变化时 |

## Terraform/bedrock-content

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `infra/terraform/bedrock-content/backend.hcl.example` | Terraform/bedrock-content | Terraform 后端参数示例 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/bedrock-content/main.tf` | Terraform/bedrock-content | 该根栈的主要资源与变量输出 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/bedrock-content/README.md` | Terraform/bedrock-content | 私有审核资料存储根栈的使用说明 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/bedrock-content/tests/content.tftest.hcl` | Terraform/bedrock-content | content Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/bedrock-content/tests/fixtures/approved.txt` | Terraform/bedrock-content | Terraform 离线测试夹具 | AWS 资源/权限需变更且计划获批后 |

## Terraform/bootstrap

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `infra/terraform/bootstrap/backend.hcl.example` | Terraform/bootstrap | Terraform 后端参数示例 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/bootstrap/backend.s3.tf.example` | Terraform/bootstrap | 迁移到 S3 State 的后端示例 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/bootstrap/backend.tf` | Terraform/bootstrap | Terraform 远程 State 后端配置 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/bootstrap/main.tf` | Terraform/bootstrap | 该根栈的主要资源与变量输出 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/bootstrap/terraform.tfvars.example` | Terraform/bootstrap | Terraform 输入变量示例（不含私密真实值） | AWS 资源/权限需变更且计划获批后 |

## Terraform/cicd

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `infra/terraform/cicd/backend.hcl.example` | Terraform/cicd | Terraform 后端参数示例 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/bedrock.tf` | Terraform/cicd | Bedrock 问答权限与配置资源 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/build.tf` | Terraform/cicd | CodeBuild 项目和构建角色 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/candidate-pipeline.tf` | Terraform/cicd | 候选制品流水线 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/deployment.tf` | Terraform/cicd | 生产发布与审批流程资源 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/frontend-release.tf` | Terraform/cicd | 前端发布流水线资源 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/green.tf` | Terraform/cicd | Green 验证与 CodeDeploy 资源 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/main.tf` | Terraform/cicd | 该根栈的主要资源与变量输出 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/README.md` | Terraform/cicd | CodeConnections 源码连接及流水线根栈说明 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/staging.tf` | Terraform/cicd | STG 环境与验证资源 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/terraform.tfvars.example` | Terraform/cicd | Terraform 输入变量示例（不含私密真实值） | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/tests/bedrock.tftest.hcl` | Terraform/cicd | bedrock Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/cicd/tests/build.tftest.hcl` | Terraform/cicd | build Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/cicd/tests/candidate.tftest.hcl` | Terraform/cicd | candidate Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/cicd/tests/deployment.tftest.hcl` | Terraform/cicd | deployment Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/cicd/tests/fixtures/staging-bootstrap.txt` | Terraform/cicd | Terraform 离线测试夹具 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cicd/tests/frontend-release.tftest.hcl` | Terraform/cicd | frontend-release Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/cicd/tests/green.tftest.hcl` | Terraform/cicd | green Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/cicd/tests/staging.tftest.hcl` | Terraform/cicd | staging Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/cicd/tests/webhooks.tftest.hcl` | Terraform/cicd | webhooks Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/cicd/webhooks.tf` | Terraform/cicd | GitHub 到 CodeBuild 的连接事件配置 | AWS 资源/权限需变更且计划获批后 |

## Terraform/cost-control

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `infra/terraform/cost-control/console-events.tf` | Terraform/cost-control | 费用控制的控制台测试事件资源 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cost-control/main.tf` | Terraform/cost-control | 该根栈的主要资源与变量输出 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cost-control/README.md` | Terraform/cost-control | 费用通知与关停根栈说明 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/cost-control/tests/safety.tftest.hcl` | Terraform/cost-control | safety Terraform 离线验证场景 | 对应行为变化或补回归时 |

## Terraform/总览与历史

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `infra/terraform/EXECUTION.md` | Terraform/总览与历史 | 2026-11-11 Terraform State 准备执行记录 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `infra/terraform/README.md` | Terraform/总览与历史 | Terraform State 安全准备与后端迁移说明 | AWS State 流程变更且计划获批后 |

## Terraform/portfolio

| 路径 | 所属功能 | 用途 | 何时修改 |
|---|---|---|---|
| `infra/terraform/portfolio/api.tf` | Terraform/portfolio | HTTP API 和 Lambda 相关资源 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/portfolio/backend.hcl.example` | Terraform/portfolio | Terraform 后端参数示例 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/portfolio/bedrock.tf` | Terraform/portfolio | Bedrock 问答权限与配置资源 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/portfolio/DEPLOYMENT.md` | Terraform/portfolio | 2026-11-11 首次 Serverless 上线记录 | 核对或补充该日期的历史证据时；不改写成当前状态 |
| `infra/terraform/portfolio/domain.tf` | Terraform/portfolio | 域名、证书和 DNS 配置 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/portfolio/main.tf` | Terraform/portfolio | 该根栈的主要资源与变量输出 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/portfolio/README.md` | Terraform/portfolio | 网站、API 与首次部署根栈说明 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/portfolio/site.tf` | Terraform/portfolio | S3/CloudFront 网站资源 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/portfolio/spa.js.tftpl` | Terraform/portfolio | 单页应用路由的边缘代码模板 | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/portfolio/terraform.tfvars.example` | Terraform/portfolio | Terraform 输入变量示例（不含私密真实值） | AWS 资源/权限需变更且计划获批后 |
| `infra/terraform/portfolio/tests/bedrock.tftest.hcl` | Terraform/portfolio | bedrock Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/portfolio/tests/domain.tftest.hcl` | Terraform/portfolio | domain Terraform 离线验证场景 | 对应行为变化或补回归时 |
| `infra/terraform/portfolio/tests/public-qa.tftest.hcl` | Terraform/portfolio | public-qa Terraform 离线验证场景 | 对应行为变化或补回归时 |


## 类别排除与核对

- Git 可见项目路径按本页规则共 318 项，逐行列在上方；含正在实施的本清单及其定向测试文件。`frontend/package-lock.json` 与五个 Terraform `.terraform.lock.hcl` 是工具维护的依赖锁，见[文件夹地图](file-map.md)。
- `outputs/` 的日期截图、表格、核对文本属于历史证据，按目录及类别保留；`aidlc/`、`.codex/` 与 `.agents/skills/aidlc*` 的安装件和运行记录由框架管理，不在项目手写逐文件清单中。
- 未读取、未列出的忽略/私有文件（`.env`、证书、State、`.local/` 等）不进入清单；不据此推断其内容。
