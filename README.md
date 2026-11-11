# kongPortfolio

温かみのあるピクセルデザインの、日・中・英対応ポートフォリオ。React / TypeScript / Vite + Java 21 / Spring Boot。データベースなし。

在线访问：[konglingtong44.com](https://konglingtong44.com)。域名、免费 HTTPS 证书及前后端验收已完成，见 [域名接入记录](docs/custom-domain.md)。

## 当前实现

S1-01：首页简介、教育与任职时间线、横向项目经历、分类技术栈、资格、正则可视化和工具弹窗。浏览器语言识别，手动语言选择持久化。

页面通过 `GET /api/profile?lang=ja|zh|en` 读取 Java 资料；`GET /api/health` 提供健康状态。关于我弹窗的 `test` 按钮调用 `POST /api/bedrock`，返回 `PREPARING` 并显示像素风提示。**真实 Bedrock 问答仍为 Planned**，不调用 AWS。

所有 `/api` 请求统一记录 INFO：方法、路径、状态码、耗时；不记录查询参数、请求体、Headers 或凭据。本地模式输出控制台和滚动 `info.log`，单个归档分片 10 MB、保留 7 天、归档总上限 100 MB（另有当前活动文件）；Lambda profile 只写控制台，由 AWS 日志服务接收。

## Windows 本地开发

需要 Node.js 24、JDK 21、Maven 3.9.11+、Git、Gitleaks。根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-hooks.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1
```

访问 http://localhost:5173，API 为 8080。Ctrl+C 停止两个开发服务。公开 JSON 本地按请求重读；打包版本使用 classpath 内容。日志文件默认在后端工作目录下的 `.local/logs/info.log`；启动脚本的标准输出日志在根目录 `.local/`。不需要 Docker 即可开发。

## WSL 本地 Docker 集成

在 WSL 2 / Ubuntu 24.04 内使用 Docker Engine 和 Compose：

```bash
cd /mnt/d/study/kongPortfolio
sudo docker compose up --build -d --wait
# 打开 http://localhost:3000
sudo docker compose ps
sudo docker compose logs -f backend
# Ctrl+C 只退出日志跟踪
sudo docker compose exec backend sh -c 'tail -n 30 /app/logs/info.log'
sudo docker compose stop
sudo docker compose start --wait
# 停止并移除容器和网络，保留镜像和日志卷
sudo docker compose down
```

**Compose 从来就是两个独立容器**：前端 Nginx + 静态文件，后端 Java；不是一个容器装两套程序。仅开放本机 3000，后端不映射宿主端口；非 root 运行并有健康检查。INFO 文件在命名卷 `backend-logs` 中，`down` 后保留；不要用 `down -v` 删除需要的日志。

前端 Dockerfile 保留作本地集成验证，**不是未来 AWS 前端生产方式**。本次验证见 [验证记录](docs/verification.md)。

## 验证

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
```

执行依赖安装、前端测试/构建、后端 `mvn verify`、Gitleaks、Compose 配置检查；不等于验证镜像运行。Vite 占用 Windows 的依赖文件时，先停止开发服务再执行 `npm ci`。

```powershell
node scripts/test-hooks.mjs
node scripts/package-frontend.mjs
```

打包脚本要求已有 `frontend/dist`，检查哈希资源，生成版本标识、SHA256 manifest 和 tar 包到忽略的 `.local/artifacts/<commit>/`。未提交内容标记 `sourceDirty=true`，不能当成已批准发布。CI 仅产出验证包；生产 Release Artifact、不可变 S3/ECR 发布和 Rollback 仍为 Planned。

## 未来 AWS 生产架构 — Planned

- 前端：GitHub → CI → AWS 发布构建 → 不可变静态发布包 → 私有 S3 + CloudFront OAC / HTTPS。
- 后端：GitHub → AWS CI/发布构建 → Java 21 Lambda ZIP → API Gateway HTTP API + Lambda。
- 浏览器同域 `/api` 经 CloudFront 到 HTTP API，动态 API 不缓存。Route 53 沿用现有 zone；尚未修改 DNS。
- STG 冒烟 → AWS 人工审批① → PROD Green 版本 → 验证 → AWS 人工审批② → CodeDeploy 切换 Lambda `live` 别名。前端 CloudFront 蓝绿另作增量。
- Bedrock 真实问答后续通过 Lambda 执行角色接入；目前接口仍返回 PREPARING。ECS/ALB 留作以后的专项练习。

按每月约 1,000 次访问、少量短问答及构建练习，Serverless 整套预算目标约 **USD 2–5/月**；不含税和域名续费，不保证上限。具体创建前核对资源、免费额度及用量，见 [费用计划](docs/aws-cost.md)。付费资源创建仍需明确批准。

## Lambda 本地适配（S2-03）

```powershell
mvn -B -ntp -f backend/pom.xml clean verify
mvn -B -ntp -f backend/pom.xml -Plambda clean verify
node scripts/test-lambda-package.mjs
```

第一条验证本地 HTTP 模式；第二条用独立 Maven profile 验证 HTTP API v2 事件并生成 `backend/target/kongPortfolio-lambda.zip`；第三条仅从 ZIP 解出的 JAR 加载应用并校验三个接口。测试不调用 AWS。普通本地开发和 Docker 继续使用默认构建；切换模式时使用 `clean`，避免共用 target 中的旧类。Handler、云端参数与验证边界见 [Lambda 适配说明](docs/lambda.md)。

## Git 与 CI/CD

GitHub Flow：`feature/*`、`fix/*`、`hotfix/*` → PR → `main`，无长期 develop/release/staging/production 分支。已准备 [CodeBuild buildspec](codebuild/ci.yml) 和 [CI 脚本](scripts/ci.sh)，执行测试、构建、安全扫描和验证包。计划前后端独立 CodeBuild 项目回写 `ci/frontend`、`ci/backend`；无关变更可跳过应用构建，共同配置触发两边。AWS 项目、Webhook 和远程状态检查尚未创建。

CI/CD 全部在 AWS：CodeBuild 做 CI，CodePipeline / CodeBuild / CodeDeploy 负责发布和两次审批，**不使用 GitHub Actions**。固定同一 SHA/manifest/ZIP hash，Build Once, Deploy Many。CodeBuild 配置已加入本地和 Lambda 两种校验，但云端 CI 项目、发布角色、Pipeline、蓝绿和自动回滚尚未创建。私有仓库强制 Branch Protection 取决于 GitHub 套餐，尚未配置；个人项目不默认强制独立 Reviewer。

当前架构、分期部署与两道审批以 [Serverless 路线](docs/serverless-plan.md) 为准；旧 ECS 架构/部署/CI 文档保留作历史参考。

首次部署的 CloudFront 原地址 https://d4htln25bw5g5.cloudfront.net 仍可用；当前主地址为 https://konglingtong44.com 。[首次上线记录](infra/terraform/portfolio/DEPLOYMENT.md)：创建 23 项资源，health 修复后 live=2；后续 [域名 Story](docs/custom-domain.md) 追加证书/DNS 并复验。HTTPS 冒烟和 Terraform No changes 通过；浏览器视觉检查未完成。State 与 bootstrap 分离。Bedrock 仍为占位，CI/CD 和蓝绿尚未创建。

## 安全

禁止提交 `.env`（含示例）、AWS/API 密钥、密码、私钥、证书、源简历及 `.local/`。Git hooks 缺少扫描器会阻止提交，强制添加私密路径也会拦截；CI 继续扫描历史和源码。新克隆必须安装 hooks，服务端分支保护另行配置。

Docker 构建不传入秘密，浏览器 `VITE_*` 全是公开信息，不能放 Bedrock 凭据。AWS 服务使用 IAM Role，按需使用 SSM Parameter Store；本地使用 SSO。Lambda 只写标准输出，CloudWatch 日志保留期和执行角色将在部署 Story 配置。
