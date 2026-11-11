# kongPortfolio

温かみのあるピクセルデザインの、日・中・英対応ポートフォリオ。React / TypeScript / Vite + Java 21 / Spring Boot。データベースなし。

## 当前实现

S1-01：首页简介、教育与任职时间线、横向项目经历、分类技术栈、资格、正则可视化和工具弹窗。浏览器语言识别，手动语言选择持久化。

页面通过 `GET /api/profile?lang=ja|zh|en` 读取 Java 资料；`GET /api/health` 提供健康状态。关于我弹窗的 `test` 按钮调用 `POST /api/bedrock`，返回 `PREPARING` 并显示像素风提示。**真实 Bedrock 问答仍为 Planned**，不调用 AWS。

所有 `/api` 请求统一记录 INFO：方法、路径、状态码、耗时；不记录查询参数、请求体、Headers 或凭据。控制台和滚动 `info.log` 同时输出，单个归档分片 10 MB、保留 7 天、归档总上限 100 MB（另有当前活动文件）。

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
- 后端：GitHub → CI → AWS 发布构建 → ECR 不可变镜像 → ECS Fargate + ALB。
- 浏览器同域 `/api` 经 CloudFront 到 ALB，动态 API 不缓存。Route 53 使用现有域名；本阶段未查看或修改 DNS。
- 前后端独立发布，STG 冒烟 → AWS 人工审批① → PROD Green → 验证 → AWS 人工审批② → 切流。CloudFront/ECS 蓝绿及自动/人工回滚尚未实现。

ECS / ALB 并非最低成本方案，东京低流量单任务初估约 **USD 55–80/月**，不含税与域名续费；HA 约 **USD 85–110/月**。这些是预算而非报价，假设和额外费用见 [费用计划](docs/aws-cost.md)。创建任何付费资源前必须由你明确批准。

## Git 与 CI/CD

GitHub Flow：`feature/*`、`fix/*`、`hotfix/*` → PR → `main`，无长期 develop/release/staging/production 分支。已准备 [CodeBuild buildspec](codebuild/ci.yml) 和 [CI 脚本](scripts/ci.sh)，执行测试、构建、安全扫描和验证包。计划前后端独立 CodeBuild 项目回写 `ci/frontend`、`ci/backend`；无关变更可跳过应用构建，共同配置触发两边。AWS 项目、Webhook 和远程状态检查尚未创建。

CI/CD 全部在 AWS：CodeBuild 做 CI，CodePipeline / CodeBuild 负责发布和两次审批，**不使用 GitHub Actions**。固定同一 SHA/manifest/digest，Build Once, Deploy Many。当前没有 AWS 发布脚本、角色、Pipeline、蓝绿或自动回滚。私有仓库强制 Branch Protection 取决于 GitHub 套餐，尚未配置；个人项目不默认强制独立 Reviewer。

详见 [架构](docs/architecture.md)、[分期部署和回滚](docs/deployment-plan.md)、[CI/CD 与双重审批](docs/cicd.md)。

## 安全

禁止提交 `.env`（含示例）、AWS/API 密钥、密码、私钥、证书、源简历及 `.local/`。Git hooks 缺少扫描器会阻止提交，强制添加私密路径也会拦截；CI 继续扫描历史和源码。新克隆必须安装 hooks，服务端分支保护另行配置。

Docker 构建不传入秘密，浏览器 `VITE_*` 全是公开信息，不能放 Bedrock 凭据。未来使用 IAM Role、GitHub OIDC（如有必要）、SSM/Secrets Manager；本阶段无需 AWS Access Key。CloudWatch 未来收集容器标准输出，文件日志不自动上传。
