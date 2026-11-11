# S2-03 — Spring Boot Lambda 适配

验收：保留默认本地 HTTP/JAR/Docker；新增独立 Lambda ZIP 构建；使用 HTTP API payload 2.0 校验 health、三语 profile、POST placeholder、404/405、脱敏日志和多次 warm 请求；从 ZIP 独立加载验证运行依赖。此 Story 不调用 AWS，不接入真实 Bedrock。

## 构建与校验

仓库根目录，Java 21 + Maven + Node 24；`java`、`jar` 必须在 PATH：

```powershell
mvn -B -ntp -f backend/pom.xml clean verify
mvn -B -ntp -f backend/pom.xml -Plambda clean verify
node scripts/test-lambda-package.mjs
```

默认构建验证本地 HTTP 测试，生成可执行 `kongPortfolio.jar`。`-Plambda` 只加入 `src/lambda/java` 和适配库 3.0.5，运行 Lambda 契约测试，生成普通 JAR + runtime 依赖组成的 `backend/target/kongPortfolio-lambda.zip`（`lib/*.jar`）。两者共用 target，切换构建必须 clean；Lambda 构建后的普通 JAR 不能用 `java -jar` 启动，回本地时重新执行默认构建。

ZIP 冒烟在忽略的 `.local/lambda-package-*` 解包，仅用 ZIP 内的 JAR 加载入口，无 Maven 测试依赖；检查三个接口、三语、无文件日志和 Lambda 包大小限制。`scripts/check.ps1` 和 AWS `scripts/ci.sh` 已纳入两个模式及 ZIP 冒烟；云端 CI 项目还未创建。

## 后续 Terraform 必需参数

- runtime：`java21`；handler：`dev.kongortfolio.lambda.PortfolioLambdaHandler::handleRequest`；ZIP 发布为数字版本，HTTP API integration payload format `2.0`。
- Lambda handler 固定激活 Spring `lambda` profile，复用静态 Spring context；不需要监听端口。Lambda 模式只写控制台，不尝试写只读工作目录。
- 云端不要开启 Spring debug/trace；显式设 `DEBUG=false`。本机全局 `DEBUG=release` 会被 Spring 视为开启 debug，测试用 system property `debug=false` 隔离该环境影响。
- 云端必须将 `MANAGEMENT_HEALTH_DISKSPACE_PATH=/tmp` 传入函数：默认 `/var/task` 为只读，实际部署曾因此 health=DOWN；Terraform 已包含此配置，真实 health=UP。Windows 本地不照搬 `/tmp`。
- 初步试验 1 GB 内存 / 30 秒 timeout，真实云端测试后调整；不启用预置并发，冷启动时间不能由本地测试推断。Bedrock 后续需配合 HTTP API timeout 设计。
- 设置 CloudWatch 日志保留期、指定函数别名的 API 调用权限及最小执行角色；本轮未创建角色、API、函数或云日志。

实现依据：[AWS Spring Boot 4 适配说明](https://github.com/aws/serverless-java-container/wiki/Quick-start---Spring-Boot4)。依赖锁定正式版，不使用 SNAPSHOT；对仓库 Spring Boot 4.1.2 的兼容性以本次测试为准。

限制：ZIP 本地验证不是 AWS Java runtime、真实 API Gateway、CloudFront 或冷启动验证。未重新构建 Docker 镜像。真实 Bedrock、CI/CD 两道审批、CodeDeploy 蓝绿/告警回滚都在后续 Story。

后续 S2-04 已完成真实 AWS 首次部署与 HTTPS 验收，见 [上线记录](../infra/terraform/portfolio/DEPLOYMENT.md)；上面说明的是本地适配 Story 自身的验证边界。

## 本次验证（2026-11-11）

前端 40 tests + production build；默认后端 9 tests + 可执行 JAR 构建；Lambda profile 3 tests + ZIP 构建；ZIP 独立 JVM 冒烟全部通过。ZIP 24.1 MiB、解包依赖 26.8 MiB。27 项 hook 测试、Gitleaks、diff 检查通过。没有 AWS 写操作，没有 commit/push。暂停供用户审核。
