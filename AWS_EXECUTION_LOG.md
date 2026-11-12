# 项目操作记录与复习路线（本地、Git、请求与 AWS）

这是人工整理的全项目操作记录，不是完整终端录屏。范围包括文件读取/修改、Git、本地构建和测试、公开文档/API 请求、AWS CLI、Terraform、电脑操作，以及失败、修复和验证结果；不只记录 AWS。前面已完成部分按执行记录重建；后续逐步补记。命令以仓库根目录 `D:\study\kongPortfolio` 为起点，注明不同工作目录。`<...>` 是占位符，不能直接复制执行。含 `apply`、`push`、`start-build` 的命令会产生实际变更或费用，不要为了复习重复运行。

登录码、SSO 缓存、持有人资料、密钥不写入本文件。原始构建日志及结果放在被 Git 忽略的 `.local/`，不提交。`terraform.tfvars`、`backend.hcl`、计划文件和 State 也不提交。

## 0. 工具与认证

本机工具路径（其他机器需修改）：

```powershell
$aws = 'D:\software\AWSCLI\aws.exe'
$tf = 'D:\software\Terraform\terraform.exe'
$env:AWS_PROFILE = 'kong-dev'
```

登录过期时实际执行：

```powershell
& $aws sso login --profile kong-dev --use-device-code --no-browser
```

作用：由你在浏览器完成设备授权，CLI 获取临时凭证；仅登录 AWS 控制台不一定更新 CLI 缓存。此前两次检查仍提示过期，重新授权后本轮检查成功。登录码有时效，不记录或复用。

```powershell
& $aws sts get-caller-identity --profile kong-dev --query Account --output text
```

结果：本轮确认账号 `561798268037`。后续 Terraform provider/backend 也限制目标账号。

## 1. 此前已完成的基础设施（复习索引）

| 顺序 | 实际工作与结果 | 代码 / 详细记录 |
| --- | --- | --- |
| 1 | Terraform S3 State：私有、加密、版本控制、原生锁；6 个资源，真实并发锁测试通过 | `infra/terraform/bootstrap/`、`infra/terraform/EXECUTION.md` |
| 2 | 只读检查账号、预算、现有资源，未重复创建预算 | `scripts/aws-preflight.ps1`、`docs/aws-preflight.md` |
| 3 | Spring Boot Java 21 适配 Lambda ZIP，保留本地 HTTP 模式 | `docs/lambda.md`、`backend/pom.xml` |
| 4 | 准备版本快照、检查实际 Terraform 计划，经批准创建 23 个网站资源并上传 6 个前端文件 | `infra/terraform/portfolio/DEPLOYMENT.md` |
| 5 | 修复 Lambda 健康检查路径 `/var/task` → `/tmp`，live alias 使用版本 2 | `infra/terraform/portfolio/api.tf` |
| 6 | 域名重新注册使用 AWS CLI；持有人资料只保存在 `.local/`。证书、DNS、CloudFront 绑定由 Terraform 管理，原有 testec2 记录保留 | `docs/custom-domain.md`、`infra/terraform/portfolio/domain.tf` |
| 7 | Terraform 创建 GitHub CodeConnection，浏览器由你完成 OAuth，CLI 验证 AVAILABLE，再 refresh-only 更新 State | `infra/terraform/cicd/main.tf`、`scripts/check-source-connection.ps1` |
| 8 | 经批准创建 CodeBuild 8 个资源：2 项目、2 角色、2 内联策略、2 日志组；最终 plan 无差异 | `infra/terraform/cicd/build.tf`、`docs/aws-ci.md` |

上述 Terraform 通用执行顺序（复习模板，不是所有阶段的逐字终端记录）：

```powershell
& $tf '-chdir=infra/terraform/<目录>' init '-backend-config=backend.hcl' -lockfile=readonly
& $tf '-chdir=infra/terraform/<目录>' fmt -check
& $tf '-chdir=infra/terraform/<目录>' validate
& $tf '-chdir=infra/terraform/<目录>' plan -input=false '-out=<名称>.tfplan'
# 审核资源数量、动作、账号、区域，并取得付费创建授权后：
& $tf '-chdir=infra/terraform/<目录>' apply -input=false '<名称>.tfplan'
& $tf '-chdir=infra/terraform/<目录>' plan -input=false -detailed-exitcode
```

`init` 初始化后端/依赖；`fmt` 检查格式；`validate` 检查配置；`plan` 预览；`apply` 执行保存的计划；最后 `plan` 检查漂移。State 分别使用 bootstrap、portfolio/prod、cicd 路径。

## 2. 首次 CodeBuild 执行及故障修复（已完成）

实际执行过的关键命令：

```powershell
git switch -c feat/aws-serverless-ci
node .githooks/check-staged-paths.mjs
git diff --cached --check
gitleaks git --pre-commit --staged --redact --no-banner .
gitleaks git --redact --no-banner .
git commit -m 'feat: manage serverless deployment and bounded AWS CI with Terraform'
git push -u origin feat/aws-serverless-ci
```

作用：将前面已复查的公开源码提交到功能分支；Git hooks 在提交/推送前执行扫描；main 和线上网站未变。首次提交 `8f4f7f3`。

```powershell
& $aws codebuild start-build --project-name 'kongportfolio-ci-<frontend或backend>' --source-version '<完整提交SHA>' --idempotency-token '<本次唯一标识>' --profile kong-dev --region ap-northeast-1 --output json
```

作用：手动启动指定源码版本的构建，不部署网站。首次两次失败，原因为 Linux 拒绝执行 Git 中模式为 100644 的 hook。

```powershell
git update-index --chmod=+x .githooks/pre-commit .githooks/pre-push
node scripts/test-hooks.mjs
git add scripts/test-hooks.mjs
git commit -m 'fix: preserve executable hooks for Linux CodeBuild'
git push
```

结果：hook 模式变为 100755；增加 Git 索引模式校验，Windows 本地也能发现此问题。重跑固定提交 `00b64d9972bb9e6d34b6c1698791026849abd167`：前端 40 项测试、构建、静态打包通过；后端 9 项 HTTP + 3 项 Lambda 测试、ZIP 和独立启动检查通过。

```powershell
& $aws codebuild batch-get-builds --ids '<构建ID列表>' --profile kong-dev --region ap-northeast-1 --output json
& $aws logs get-log-events --log-group-name '/aws/codebuild/kongportfolio-ci-<组件>' --log-stream-name '<构建UUID>' --start-from-head --limit 1000 --profile kong-dev --region ap-northeast-1 --output json
```

作用：检查真实状态、resolvedSourceVersion、耗时和日志。前端成功 ID 后缀 `16ecf0db-bd4d-4abb-9acd-5d34330a9dc5`；后端 `553f9286-9ca9-4cf2-87bc-81c37d331259`。详情及成本估算见 `docs/aws-ci.md`。GitHub 状态 API 当时没有条目，不能认定状态回写已成功。

## 3. 当前 Story：自动触发与状态回写（进行中）

验收：你的账号向允许分支推送时自动运行两个项目；GitHub 对同一提交显示真实构建结果。暂不接生产发布。

本轮已执行：

```powershell
& $aws codebuild batch-get-projects --names kongportfolio-ci-frontend kongportfolio-ci-backend --profile kong-dev --region ap-northeast-1 --query 'projects[].{name:name,source:source}' --output json
git status --short
& $tf '-chdir=infra/terraform/cicd' fmt -recursive
& $tf '-chdir=infra/terraform/cicd' validate
& $tf '-chdir=infra/terraform/cicd' test
& 'D:\software\Git\bin\bash.exe' -n scripts/ci.sh
node scripts/test-hooks.mjs
gitleaks dir --redact --no-banner .
```

结果：认证恢复；两个项目都设置 reportBuildStatus=true，使用同一个项目级 CodeConnection。配置新增 `webhooks.tf`：默认关闭，仅 GitHub 账号 ID 14041257 可以触发；限定 main、feat/feature/fix/hotfix 分支；PR 更新由 PUSH 覆盖，避免重复构建。5 个离线 Terraform 测试、Bash 语法、28 个 hook 检查、扫描通过。修复测试受本机 tfvars 影响的问题；基础设施文件变化也会执行完整应用检查。

后续真实 plan/apply、推送和构建结果会继续追加；上面的本地测试不代表自动触发已经上线。

### 3.1 实际创建尝试与定位

1. 在忽略的 `infra/terraform/cicd/terraform.tfvars` 中保留 `enable_ci=true`，增加 `enable_ci_webhooks=true`。这是本机输入，没有提交。
2. 执行以下命令，将计划输出保存在 `.local/ci-webhook-plan.log`：

```powershell
& $tf '-chdir=infra/terraform/cicd' plan -input=false '-out=webhooks.tfplan' -no-color
& $tf '-chdir=infra/terraform/cicd' show -json webhooks.tfplan
# 脚本核对：仅 2 个 aws_codebuild_webhook create，既有资源没有更新/删除。
& $tf '-chdir=infra/terraform/cicd' apply -input=false webhooks.tfplan -no-color
```

结果：两个触发器都未创建。AWS 返回 `OAuthProviderException: Failed to create webhook. GitHub API limit reached or permission issue encountered when creating the webhook.` 该消息无法单独区分限流和权限。

3. 继续只读排查：

```powershell
& $aws codebuild list-source-credentials --profile kong-dev --region ap-northeast-1 --output json
```

结果：该账号东京区没有默认 GitHub 源码凭证配置。两个项目各自已经引用 CodeConnection、且 reportBuildStatus=true。GitHub 公开 API 对之前成功提交仍返回 0 条 status / check-run。

4. 为排除默认认证缺失，Terraform 增加 `aws_codebuild_source_credential.github`。`token` 的值只是已有 CodeConnection ARN，不是 PAT，也没有获取或保存 GitHub 原始 token。这是账号东京区的默认 GitHub 连接引用，会影响未设置项目级认证的 CodeBuild 项目；执行前确认此处为空，现有两个项目仍保留自己的同一连接配置。IAM 策略没有扩大。

```powershell
& $tf '-chdir=infra/terraform/cicd' fmt -recursive
& $tf '-chdir=infra/terraform/cicd' validate
& $tf '-chdir=infra/terraform/cicd' plan -input=false '-out=webhook-auth.tfplan' -no-color
& $tf '-chdir=infra/terraform/cicd' show -json webhook-auth.tfplan
# 脚本核对：仅 1 个已有连接引用 + 2 个 webhook create。
& $tf '-chdir=infra/terraform/cicd' apply -input=false webhook-auth.tfplan -no-color
```

结果：连接引用成功创建；两个 webhook 仍返回相同错误。故“缺少默认引用”不能解释或解决全部问题，不宣称已修好状态回写。现有网站、IAM 权限和构建项目没有更改，也没有启动新构建。

5. AWS 官方故障排查对类似 webhook 错误建议检查 GitHub App 安装及新增 webhook 权限。已请你到 GitHub → Settings → Applications → Installed GitHub Apps → AWS Connector for GitHub → Configure，确认 kongPortfolio 并检查是否有权限更新请求。不要删除连接或卸载应用。等待这一步后再尝试。

参考：[AWS GitHub App 故障排查](https://docs.aws.amazon.com/codebuild/latest/userguide/connections-github-app.html)、[CodeBuild 多层认证](https://docs.aws.amazon.com/codebuild/latest/userguide/multiple-access-tokens.html)。

### 3.2 权限更新后创建成功

第一次告知“已更新”后，重试仍失败。CloudTrail 只读检查显示两个构建角色的 `GetConnectionToken` 成功，没有 AWS IAM 拒绝；没有扩大角色权限。浏览器检查因电脑操作工具无法可靠识别网址而停止，没有通过 UI 更改权限。随后你提供的截图显示 Review request 仍存在，仓库已正确限制为 kongPortfolio；你进一步完成了新增权限的接受。

```powershell
& $aws codeconnections get-connection --connection-arn '<现有连接ARN>' --profile kong-dev --region ap-northeast-1 --output json
& $aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventSource,AttributeValue=codeconnections.amazonaws.com --max-results 15 --profile kong-dev --region ap-northeast-1 --output json
& $tf '-chdir=infra/terraform/cicd' plan -input=false '-out=webhook-updated-permissions.tfplan' -no-color
& $tf '-chdir=infra/terraform/cicd' show -json webhook-updated-permissions.tfplan
# 核对：只创建两个缺失的 webhook，没有其他资源变化。
& $tf '-chdir=infra/terraform/cicd' apply -input=false webhook-updated-permissions.tfplan -no-color
```

结果：**2 add / 0 change / 0 destroy**，两个触发器成功创建。权限接受后成功这一事实支持 GitHub App 权限是此次创建失败的原因；默认连接引用的独立影响没有做移除实验。接下来将通过真实 git push 验证自动构建和 GitHub 状态，不使用 start-build 冒充自动触发。

### 3.3 真实推送验收通过

执行五个 Terraform 离线测试，通过后提交并推送：

```powershell
& $tf '-chdir=infra/terraform/cicd' fmt -check -recursive
& $tf '-chdir=infra/terraform/cicd' test
git add -- AWS_EXECUTION_LOG.md PROJECT_PLAN.md infra/terraform/cicd/webhooks.tf infra/terraform/cicd/tests/build.tftest.hcl infra/terraform/cicd/tests/webhooks.tftest.hcl scripts/ci.sh
node .githooks/check-staged-paths.mjs
git diff --cached --check
git commit -m 'feat: trigger owner-only AWS CI from GitHub events'
git push
git rev-parse HEAD
```

结果：提交 `e3836738037a411c2f75435dfd065dc69b5ffb55`。提交和推送 hook 的 Gitleaks 扫描均通过。没有调用 start-build，AWS 自动出现两个构建。通过以下只读命令检查：

```powershell
& $aws codebuild list-builds-for-project --project-name 'kongportfolio-ci-frontend' --sort-order DESCENDING --profile kong-dev --region ap-northeast-1 --output json
& $aws codebuild list-builds-for-project --project-name 'kongportfolio-ci-backend' --sort-order DESCENDING --profile kong-dev --region ap-northeast-1 --output json
& $aws codebuild batch-get-builds --ids 'kongportfolio-ci-frontend:2afb920b-f930-451d-9e0f-78e87c025dad' 'kongportfolio-ci-backend:e009d765-916b-475c-8b62-67b424b2dc20' --profile kong-dev --region ap-northeast-1 --output json
& $tf '-chdir=infra/terraform/cicd' plan -input=false -detailed-exitcode -no-color
& $aws codebuild batch-get-projects --names kongportfolio-ci-frontend kongportfolio-ci-backend --profile kong-dev --region ap-northeast-1 --query 'projects[].{name:name,filters:webhook.filterGroups}' --output json
```

两个构建的 initiator 都是 `GitHub-Hookshot/80c5d1c`，resolvedSourceVersion 均匹配上述提交，证明此次是推送触发。计划 No changes；实际 AWS 过滤器与代码一致。

| 项目 | 结果 | 实际验证 | 墙钟耗时 |
| --- | --- | --- | --- |
| frontend | SUCCEEDED | 40 测试、TypeScript/Vite、clean 静态验证包 | 41.6 秒 |
| backend | SUCCEEDED | 9 HTTP + 3 Lambda 测试、ZIP、独立 JVM smoke | 82.6 秒 |

读取完整日志时，Windows AWS CLI 的 GBK 输出无法编码前端的勾选符号；只在当前终端设置 UTF-8 后读取，未改应用设置：

```powershell
$env:PYTHONUTF8 = '1'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
# 再用第 2 节的 get-log-events 读取上述两个 UUID 的日志。
```

用 GitHub 只读 API 检查状态：

```powershell
$headers = @{ Accept='application/vnd.github+json'; 'User-Agent'='kongPortfolio-CI'; 'Cache-Control'='no-cache' }
Invoke-RestMethod 'https://api.github.com/repos/konglingtong44/kongPortfolio/commits/e3836738037a411c2f75435dfd065dc69b5ffb55/status?per_page=100' -Headers $headers
```

最终 combined state 为 `success`，`ci/frontend` 和 `ci/backend` 都是 `success`。状态回写是异步的，早期读取短暂显示 pending。原始结果和日志存于 `.local/ci-auto-build-results.json`、`.local/ci-auto-frontend.log`、`.local/ci-auto-backend.log`、`.local/ci-auto-github-status.json`。

这一对验收构建的墙钟时间分别向上取整约 1+2 分钟，按已核对的 $0.005/分钟估算 $0.015（未扣免费额度，另有日志/税），不是实际账单。没有部署生产网站；PR 创建/重新打开过滤器仅配置/离线检查，未进行真实 PR 事件测试。下一 Story 才接 CodePipeline 与生产两道审批、蓝绿切流。

最后仅更新本文件、PROJECT_PLAN.md、docs/aws-ci.md 并提交推送 `docs: record verified webhook CI and GitHub status reporting`。这次文档推送也会走已有 CI；应用未变时 CI 会保留通用安全检查并跳过应用构建，不需要为此改变触发规则。

## 4. S3-04：候选版本 CodePipeline 准备（尚未创建资源）

目标：GitHub Source → AWS CodeBuild 全部检查 → 前后端候选包 → 私有 S3 artifact。先准备可以审核、运行的增量，再确认付费创建。生产审批 1 放在 STG 验证后、创建 Green 前；审批 2 放在 Green 验证后、正式切流前；本 Story 尚未加入部署和两道审批，不把空审批当作完整发布。

### 4.1 读取与只读请求

实际读取 AGENTS.md、cicd/main.tf、ci.sh、codebuild/ci.yml、现有首次发布脚本、Lambda ZIP smoke 脚本、Gitleaks 配置，检查 git status；用 rg 定位 Terraform IAM 字段，再按 fmt 后的实际内容修改。

```powershell
git status --short
& $aws codepipeline list-pipelines --profile kong-dev --region ap-northeast-1 --query pipelines --output json
Test-Path backend/target/kongPortfolio-lambda.zip
```

结果：工作树初始干净；该区域尚无流水线；已有本地 Lambda ZIP。公开文档 GET / 搜索核对来源：

- https://aws.amazon.com/codepipeline/pricing/ ：V2 每 action-minute $0.002，包含 Source/Build；共享 100 免费分钟。此前没有按“source 免费”的假设定价。
- https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html ：full clone、DetectChanges=false；Source role 需要新旧两个 UseConnection action。
- https://docs.aws.amazon.com/codepipeline/latest/userguide/troubleshooting.html ：CodeBuild full-clone 连接权限及 FullRepositoryId 条件。
- https://docs.aws.amazon.com/codepipeline/latest/userguide/how-to-custom-role.html ：artifact S3 角色权限。
- https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v6.72.0/website/docs/r/codepipeline.html.markdown ：锁定 Provider 版本对应的参数。

所有文档请求都是公开只读请求，没有附带账号令牌。AWS CLI 使用现有 SSO，没有读出或写入新凭证。

### 4.2 文件修改与离线验证

- 新增 `infra/terraform/cicd/candidate-pipeline.tf`：默认关闭的候选流水线，独立最小角色/构建项目，私有、加密、版本化 S3，7 天日志和 30 天候选保留。
- 新增 `codebuild/candidate.yml`：完整 CI 后打包并校验，再由 CodePipeline 收集 artifact。
- 新增 `scripts/package-pipeline-candidate.mjs` / `verify-pipeline-candidate.mjs`：仅干净提交、校验 CodeBuild SHA、版本化路径、逐文件 SHA256、禁止覆盖已有候选、拒绝目录穿越/符号链接/未列文件。
- 新增完整性测试和两个 Terraform mock plan；ci.sh 加入候选完整性测试。没有更改应用 API 或生产资源。

```powershell
& $tf '-chdir=infra/terraform/cicd' fmt -recursive
& $tf '-chdir=infra/terraform/cicd' validate
& $tf '-chdir=infra/terraform/cicd' test
node scripts/test-pipeline-candidate.mjs
```

首次 Terraform 测试文件括号写错，validate 报 Invalid for expression；修正后 7 个 plan 测试通过。候选测试覆盖正常包清单、ZIP 改动、目录穿越、重复路径和未列文件；测试 ZIP 是假数据，不能当作 Lambda 运行验证。

### 4.3 真实账号计划（只预览）

```powershell
& $tf '-chdir=infra/terraform/cicd' plan -input=false '-var=enable_candidate_pipeline=true' '-out=candidate.tfplan' -no-color
& $tf '-chdir=infra/terraform/cicd' show -json candidate.tfplan
# 脚本检查所有动作都是 create，且资源数量正好 14。
& $tf '-chdir=infra/terraform/cicd' plan -input=false -detailed-exitcode -no-color
```

启用预览：14 create / 0 update / 0 delete；默认关闭：No changes。计划和输出保存在忽略的 `.local/candidate-plan.log`、`candidate-default-plan.log` 及 cicd/candidate.tfplan。没有执行 apply，也未在输入文件中启用候选流水线。Source 的 UseConnection 按官方要求包含新旧服务前缀，权限仍只针对现有连接；实际云端鉴权待验证。

费用估算：一次 Source 1 分钟 + Build 5 分钟，Pipeline $0.012 + Build $0.025 = $0.037，20 次约 $0.74（均未扣免费额度；另计 S3、日志、加密请求可能费用和税）。运行时间未经新流水线实测。创建后可能首次执行，批准范围应包含该次及必要的首次验收。详见 docs/candidate-pipeline.md。

### 4.4 干净提交的本地完整检查及真实打包

先通过 Git 路径、格式及 Gitleaks hooks，将代码提交到现有功能分支：

```powershell
& 'D:\software\Git\bin\bash.exe' -n scripts/ci.sh
node scripts/test-pipeline-candidate.mjs
node .githooks/check-staged-paths.mjs
git diff --cached --check
git commit -m 'feat: prepare source-verified CodePipeline candidate artifacts'
```

完整 git add 文件列表：candidate-pipeline.tf、tests/candidate.tftest.hcl、codebuild/candidate.yml、ci.sh、3 个 pipeline-candidate Node 脚本、docs/candidate-pipeline.md、PROJECT_PLAN.md、AWS_EXECUTION_LOG.md。没有加入 .local、计划或 tfvars。提交 `37237d4aaa123b5aaf6a31642dc88a5dd9ee521d` 后工作树干净；真实候选打包要求干净提交，不能跳过。

```powershell
. ./scripts/tools.ps1
$env:DEBUG = 'false'
& 'D:\software\Git\bin\bash.exe' scripts/ci.sh all
$env:CI = 'true'
$env:CODEBUILD_RESOLVED_SOURCE_VERSION = (git rev-parse HEAD).Trim()
node scripts/package-pipeline-candidate.mjs
node scripts/verify-pipeline-candidate.mjs .local/pipeline-candidate
# 完成后清除仅为本地模拟设置的 CI 和 CODEBUILD_RESOLVED_SOURCE_VERSION。
```

实际执行时 stdout/stderr 重定向到 `.local/candidate-local-ci.log` 和 `candidate-local-package.log`；每条命令检查退出码，失败时读取日志尾部再停止。ci.sh 内部顺序：扫描 Git 历史和工作目录、禁止私有路径、hook/routing/候选完整性检查、npm ci/test/build、静态验证包、Maven 常规 verify、Lambda verify、实际 ZIP 的独立 JVM smoke。npm/Maven 按各自缓存和锁定依赖下载所需包；本记录不声称抓取了每条依赖 HTTP 请求，详细工具输出在上述日志中。没有执行 AWS 部署请求。

结果：前端 40 项测试/build；后端 9 HTTP + 3 Lambda 测试；ZIP 24.1 MiB、解压库 26.8 MiB、独立启动通过；全部 CI 检查通过。真实候选 ID 为 `9aa8d398127a78fe06decc4f36b13434cae0d0f758cf0069781cbf9e38af029a`，source=37237d4，生成并逐文件校验通过，输出位于 `.local/pipeline-candidate`。未上传，未部署。

复查官方 Source action 文档后，给新流水线角色同时加入 `codeconnections:UseConnection` 与 `codestar-connections:UseConnection`，都限定为同一已有连接；CodeBuild full-clone 使用官方的 FullRepositoryId 条件。重新执行 fmt/test/plan，并解析 JSON 再核对仍然只有 14 个 create。没有 apply。Terraform 测试括号错误已经修复，无待失败的本地检查。

最后把验证结果写回本记录/项目计划/说明，执行 `git commit -m 'docs: record candidate preparation checks and execution commands'`、`git push`。推送只会触发现有 CI，不会创建新流水线（enable_candidate_pipeline 仍未开启）。新流水线的 AWS 执行等待对具体资源计划的付费创建批准。

### 4.5 推送后的现有 AWS CI 复查

推送提交为 `6a225b59b930d1cefdc63a11710d00f570d8e3dc`，现有 webhook 自动触发两个检查（本 Story 没有手动 start-build）。读取命令仍使用第 3.3 节的 list-builds-for-project / batch-get-builds，结果存于 `.local/candidate-preparation-ci.json`，首次读取为 IN_PROGRESS，随后通过同一构建 ID 复查至成功：

```powershell
& $aws codebuild batch-get-builds --ids 'kongportfolio-ci-frontend:7668eb7a-3026-42f6-8239-802694c2776f' 'kongportfolio-ci-backend:9d687005-8a2d-4e97-90dd-885cfad571c2' --profile kong-dev --region ap-northeast-1 --output json
Invoke-RestMethod 'https://api.github.com/repos/konglingtong44/kongPortfolio/commits/6a225b59b930d1cefdc63a11710d00f570d8e3dc/statuses?per_page=10' -Headers $headers
```

结果：两个 AWS 构建都 SUCCEEDED；GitHub 每个 context 按 id 取最新条目，ci/frontend、ci/backend 都 success。这是现有 CI 对新增源码的检查，不是尚未创建的 CodePipeline 运行。最终这段验证记录以本地文档提交保存，待下一次授权执行时一并推送，避免仅为写验证记录再次触发构建。

## 5. S3-04：获批后创建并验证候选流水线（已完成）

你明确批准创建上述 14 个资源和首次云端验证。本轮先读取 AGENTS.md、git status/log、本地 tfvars，并用 STS 确认账号。`git push` 发布上一轮本地记录提交 72539a8；推送 hook 的 Gitleaks 通过。此推送只触发现有 CI，候选流水线此时还未创建。

在忽略的 cicd/terraform.tfvars 中保留已有两个 true 开关，并增加 `enable_candidate_pipeline=true`，供后续日常 plan 重现真实状态。没有提交此文件。

```powershell
& $aws sts get-caller-identity --profile kong-dev --query Account --output text
git push
& $tf '-chdir=infra/terraform/cicd' plan -input=false '-out=candidate-approved.tfplan' -no-color
& $tf '-chdir=infra/terraform/cicd' show -json candidate-approved.tfplan
# 检查只有批准的 14 个 create、类型匹配，无 update/delete。
& $tf '-chdir=infra/terraform/cicd' apply -input=false candidate-approved.tfplan -no-color
```

实际计划日志在 `.local/candidate-approved-plan.log`。创建结果和流水线执行结果继续记录在下文；不会把“创建成功”当作“云端构建已验证”。

### 5.1 创建与首次失败原因

14 个资源全部创建完成；S3 lifecycle 配置等待约 56 秒后完成。`list-pipeline-executions` 显示 CreatePipeline 自动产生执行 `3ae050d8-f04c-4206-8f75-2e17a77297a1`，Source 阶段失败，尚未进入构建。

```powershell
& $aws codepipeline list-pipeline-executions --pipeline-name kongportfolio-candidate --max-results 3 --profile kong-dev --region ap-northeast-1 --output json
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=3ae050d8-f04c-4206-8f75-2e17a77297a1 --profile kong-dev --region ap-northeast-1 --output json
```

实际错误：Source PutObject 写入 `kongportfolio-candid/SourceRef/z6dr7H1`，IAM 原先只允许 `kongportfolio-candidate/*`。流水线 artifact 前缀被截短，不能用完整流水线名称推断。将两个角色对象范围和 lifecycle 前缀统一为实际 20 字符的 `kongportfolio-candid/`，没有放开整个桶。修复时先误按 19 字符计算，新增断言捕获不一致；改为 20 后 7 个 Terraform 测试通过。另为各测试显式关闭候选开关，避免本机已启用的 tfvars 污染 mock 默认测试。

```powershell
& $tf '-chdir=infra/terraform/cicd' fmt -recursive
& $tf '-chdir=infra/terraform/cicd' test
& $tf '-chdir=infra/terraform/cicd' plan -input=false '-out=candidate-prefix-fix.tfplan' -no-color
& $tf '-chdir=infra/terraform/cicd' show -json candidate-prefix-fix.tfplan
# 核对：仅两个角色策略和一个保留前缀更新，0 新增/删除。
& $tf '-chdir=infra/terraform/cicd' apply -input=false candidate-prefix-fix.tfplan -no-color
```

修复 apply 结果为 0 add / 3 change / 0 destroy；lifecycle 更新同样等待约 56 秒。修复源码、测试和当时记录提交为 39a404f6594b40c26585b68b5d9db54bf44ea168，并通过提交/推送扫描后 git push。

### 5.2 固定提交启动首次验证

```powershell
git commit -m 'fix: scope candidate artifacts to the actual pipeline S3 prefix'
git push
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=39a404f6594b40c26585b68b5d9db54bf44ea168' --client-request-token 'candidate-prefix-fix-39a404f' --profile kong-dev --region ap-northeast-1 --output json
& $tf '-chdir=infra/terraform/cicd' plan -input=false -detailed-exitcode -no-color
```

执行 ID `9a3de5f9-ce36-40a9-816f-ccb397cf51d3`，请求结果存于 `.local/candidate-execution.json`；没有重复启动 CreatePipeline 的失败执行。后续 plan 无差异，日志 `.local/candidate-post-apply-plan.log`。

```powershell
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id 9a3de5f9-ce36-40a9-816f-ccb397cf51d3 --profile kong-dev --region ap-northeast-1 --output json
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=9a3de5f9-ce36-40a9-816f-ccb397cf51d3 --profile kong-dev --region ap-northeast-1 --output json
& $aws codebuild list-builds-for-project --project-name kongportfolio-candidate --sort-order DESCENDING --profile kong-dev --region ap-northeast-1 --output json
```

先确认 Source 已 Succeeded，source revision 正好为上述 SHA，进入 BuildCandidate；action 输出存于 `.local/candidate-actions.json`，构建状态存于 `.local/candidate-build.json`。最终结果在后文记录。

### 5.3 构建通过后，打包环境隔离问题

构建 ID `kongportfolio-candidate:6cacd5e1-78e1-45ec-a159-363d9d2dc0b8` 的 initiator 是 `codepipeline/kongportfolio-candidate`，source SHA 正确。Source/full clone、前端 40 测试、后端 9+3 测试和实际 ZIP smoke 全部通过；后续打包命令失败，未生成 artifact。

```powershell
& $aws codebuild batch-get-builds --ids kongportfolio-candidate:6cacd5e1-78e1-45ec-a159-363d9d2dc0b8 --profile kong-dev --region ap-northeast-1 --output json
& $aws logs get-log-events --log-group-name /aws/codebuild/kongportfolio-candidate --log-stream-name 6cacd5e1-78e1-45ec-a159-363d9d2dc0b8 --start-from-head --limit 1000 --profile kong-dev --region ap-northeast-1 --output json
```

原始日志存于 `.local/candidate-first-build.log`。真实错误为 `Candidate packaging requires explicit CI=true and a clean checkout`，实际 CI 未定义。`bash scripts/ci.sh all` 只在子进程内 export CI，不影响 CodeBuild 后续的独立命令。本地检查明确设置了 CI，因此没暴露这个 buildspec 环境问题。

修改 `codebuild/candidate.yml` 的全局 env.variables.CI 为字符串 true；不移除包脚本的干净来源检查，不改变 IAM、AWS 资源或应用代码。提交/扫描/推送后，以新 SHA 再启动流水线，验证完整链路。

### 5.4 修复环境后执行成功

修复提交 `4d00463b90231efc89c872c32c230e516d158780`，提交信息 `fix: share CI mode across candidate buildspec commands`，git push 扫描通过。

```powershell
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=4d00463b90231efc89c872c32c230e516d158780' --client-request-token 'candidate-ci-env-4d00463' --profile kong-dev --region ap-northeast-1 --output json
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id e7b0712d-6cbb-4046-92a7-ce4a26fb98f9 --profile kong-dev --region ap-northeast-1 --output json
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=e7b0712d-6cbb-4046-92a7-ce4a26fb98f9 --profile kong-dev --region ap-northeast-1 --output json
& $aws codebuild batch-get-builds --ids kongportfolio-candidate:82d6bdee-9a94-41b7-bfd5-ca7690a81ce9 --profile kong-dev --region ap-northeast-1 --output json
```

执行 `e7b0712d-6cbb-4046-92a7-ce4a26fb98f9` 最终 **Succeeded**，Source/BuildCandidate 两个 action 都成功；CodeBuild `82d6bdee-9a94-41b7-bfd5-ca7690a81ce9` 为 SUCCEEDED，resolvedSourceVersion 与指定 SHA 一致。构建约 103 秒。前端 40 项测试/build、后端 9+3 测试、实际 ZIP JVM smoke、真实候选包生成/校验均通过，上传 9 个文件的 artifact 成功。结果保存在 `.local/candidate-final-pipeline.json`、`candidate-final-build.json`、`candidate-final-actions.json`、`candidate-successful-build.log`。

### 5.5 从 S3 按版本下载并复核

从成功 action 的 outputArtifacts 读取实际 bucket/key，没有推测路径。对候选 artifact 执行：

```powershell
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/Candidate/OlNePu1 --profile kong-dev --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/Candidate/OlNePu1 --version-id LRR8Sr9BeVXnbqAMNnvMlqtvESuxeC1Z --profile kong-dev --region ap-northeast-1 '<仓库>/.local/candidate-verification-e7b0712d/artifact.zip' --output json
Get-FileHash -LiteralPath '<下载的 artifact.zip>' -Algorithm SHA256
jar --list --file '<下载的 artifact.zip>'
# 校验所有条目只在 backend.zip、manifest.json、SHA256SUMS、frontend/ 下；
# 拒绝绝对路径、..、反斜杠等，再进入新建的 .local/.../unpacked 目录：
jar --extract --file '<下载的 artifact.zip>'
node scripts/verify-pipeline-candidate.mjs '<解压目录>'
```

下载路径在仓库 .local 下新建且不覆盖已有目录；先验证 ZIP 条目再解压。外层 artifact SHA256 等于 CodeBuild 返回的 checksum；逐文件 manifest/SHA256SUMS、版本前缀、release identity、sourceDirty=false 和 Git SHA 全通过。

| 字段 | 已验证值 |
| --- | --- |
| S3 key | kongportfolio-candid/Candidate/OlNePu1 |
| S3 VersionId | LRR8Sr9BeVXnbqAMNnvMlqtvESuxeC1Z |
| Artifact bytes | 27357380 |
| Artifact SHA256 | bf60b3fcd7bdc283ef701e6b102aa26990634c5a3d5aac28789fed5d5d4880b4 |
| ReleaseId | f6c6341fa32de2315789c757d9b563f5a04d9ec6cd7a3c7b93361a0728337a2e |
| Source commit | 4d00463b90231efc89c872c32c230e516d158780 |
| Backend ZIP SHA256 | 88e27021494b7f63c38af9b11cd332be5c7849bba4e75d81a9162fef9e22a4c8 |

注意加密区别：`s3api get-bucket-encryption` 的桶默认是 AES256，但 CodePipeline 实际 artifact head 显示 `aws:kms`。以 head 的 SSEKMSKeyId 调用 `kms describe-key --query 'KeyMetadata.{Manager:KeyManager,State:KeyState}'`，确认 KeyManager=AWS、Enabled，没有创建客户管理密钥。没有把桶默认配置误当作对象实际加密方式。元数据在 `.local/verified-candidate.json` 和 `candidate-download-metadata.json`。

### 5.6 收尾、费用范围与下一步

再次执行 `terraform -chdir=infra/terraform/cicd plan -input=false -detailed-exitcode -no-color`，结果 No changes，日志 `.local/candidate-final-plan.log`。没有修改生产 Lambda、CloudFront、网站文件或域名，也没有进行 STG/生产部署和审批。

为估算本轮候选流水线的费用，读取三个 execution 的 action startTime/lastUpdateTime，以及两次候选 CodeBuild 的 start/endTime，逐项向上取整。约 9 个 Pipeline action-minutes × $0.002 + 4 个 CodeBuild 墙钟分钟 × $0.005 = **$0.038**，未扣免费额度；不是账单，未包含现有 webhook CI、S3、日志、KMS 请求、传输和税。明细 `.local/candidate-cost-estimate.json`。

最终文档和执行记录提交/推送到现有功能分支；这只触发现有 CI，候选流水线 DetectChanges=false，不会仅因文档推送重复运行。原始 AWS JSON/日志/ZIP 都留在被忽略的 .local。下一 Story 才接 STG 验证与生产审批 1，再接 Green 验证、审批 2 和蓝绿流量切换/回滚。

## 6. S3-05：STG 与第一道生产审批准备（全部操作类型记录）

日志范围已按你的要求扩展：除了 AWS，还记录本地读取/修改、Git、测试、公开请求、失败和修复。仍不保存登录码、凭证、私有原始响应或实际审批 token；不是抓包或逐键录屏。

### 6.1 读取、查阅和方案选择

实际用 Get-Content 读取 AGENTS.md、cicd/candidate-pipeline.tf、portfolio/api.tf、LambdaPackageSmoke.java、codebuild/candidate.yml、现有 candidate 测试、本地 verified-candidate.json 和被忽略的 tfvars；用 git status 确认原始工作树。目的是复用已有候选和运行参数，避免影响生产。

公开只读文档 GET / 搜索核对：

- https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodeBuild.html ：PrimarySource 和 CODEBUILD_SRC_DIR_Candidate；多输入最多五个。
- https://docs.aws.amazon.com/codebuild/latest/userguide/sample-codepipeline.html ：多 artifact 输入示例。
- https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals.html ：人工审批默认七天、无人审批则失败。
- https://docs.aws.amazon.com/codepipeline/latest/userguide/limits.html ：审批超时可配置；本轮沿用默认。
- https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionCode.html ：RevisionId 乐观锁、Publish、代码哈希。
- https://docs.aws.amazon.com/lambda/latest/api/API_PublishVersion.html ：无代码/配置变化时不重复发布版本。
- https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html ：reserved concurrency 本身不另收费；不同于 provisioned concurrency。

为了省钱，本 Story 采用 IAM 直接调用独立 STG Lambda，没有新建 STG CloudFront/域名/API Gateway；前端只做候选包完整性检查，不能当作浏览器/HTTP E2E。选择已在 commentary 说明。未进行任何电脑 UI 操作，也未读取邮件或其他连接服务。

### 6.2 文件修改

用补丁新增 staging.tf、tests/staging.tftest.hcl、明确标注不可部署的 bootstrap 文本测试 fixture、codebuild/staging.yml、staging-contract.mjs、verify-staging.mjs、test-staging-contract.mjs 和 docs/staging-approval.md。修改 candidate-pipeline.tf：启用时追加 STG 验证和第一道人工审批，并只给 pipeline role 新 verifier 的 StartBuild/BatchGetBuilds 权限；关闭时保持原配置。其他 Terraform 测试显式关闭新开关，防止本机 tfvars 污染测试。ci.sh 增加 STG 合约单元检查。没有修改应用业务代码。

验证脚本先核对候选所有文件、SHA、目标固定为 kongportfolio-stg、账号、角色和配置；只更新该函数代码，带 RevisionId，检查不可变版本/CodeSha256。相同代码/配置已有版本则复用。以版本号串行调用七个 API Gateway v2 模拟事件，检查真实 Lambda 运行/HTTP 合约；Invoke 元数据 ExecutedVersion 也必须匹配。只把摘要 report.json 上传为 StagingReport，调用原始数据不上传。没有自动审批代码。

### 6.3 本地测试和真实账号只读计划

```powershell
& $tf '-chdir=infra/terraform/cicd' fmt -recursive
& $tf '-chdir=infra/terraform/cicd' validate
& $tf '-chdir=infra/terraform/cicd' test
node scripts/test-staging-contract.mjs
node --check scripts/verify-staging.mjs
& 'D:\software\Git\bin\bash.exe' -n scripts/ci.sh
git diff --check
git diff --stat
```

结果：10 个 mock plan 通过；STG 合约测试覆盖禁止 production 目标、不可变版本复用、哈希不一致、Lambda FunctionError、HTTP 500 和缓存策略错误；语法/格式通过。这些测试不调用 AWS，不代表 STG 已运行。

从已经下载并验证的候选元数据中读取 backend ZIP 路径和 SHA256，用 Get-FileHash 再核对；未发起新下载。用 ConvertTo-Json 写入被忽略的 `.local/staging-plan.tfvars.json`，包含 enable_staging=true、本地 bootstrap ZIP 及原 manifest SHA256。没有把这些输入提交进 Git，也没有启用当前日常 tfvars 的 STG 开关。

```powershell
Get-FileHash -LiteralPath '<已验证候选目录>/backend.zip' -Algorithm SHA256
& $tf '-chdir=infra/terraform/cicd' plan -input=false '-var-file=../../../.local/staging-plan.tfvars.json' '-out=staging.tfplan' -no-color
& $tf '-chdir=infra/terraform/cicd' show -json staging.tfplan
& $tf '-chdir=infra/terraform/cicd' plan -input=false -detailed-exitcode -no-color
```

脚本解析 JSON 核对：**8 create / 2 update / 0 delete**（两日志组、两角色、两策略、Lambda、CodeBuild；更新已有 pipeline 和对应 StartBuild 权限）。未执行 apply、update-function-code 或 invoke。默认关闭的新配置 plan 无差异。输出 `.local/staging-plan.log`、`staging-disabled-plan.log` 和忽略的 staging.tfplan。Bootstrap 预条件防止本地文件变更后继续部署；后续机器也必须恢复有效的已验证 bootstrap 输入。

估算额外 STG 使用：每月 20 次，每次 verifier 两分钟，CodeBuild $0.20 + CodePipeline $0.08 = $0.28，未扣免费额度；另计少量 Lambda、S3/日志/税。原候选构建费用另算。审批等待不按 action-minute 收费，Lambda 未设 provisioned concurrency。实际新阶段时长待获批后实测；新资源尚未创建。

### 6.4 Git、安全检查和已有 CI

补充查阅公开 variables reference 和 buildspec reference，确认 `#{codepipeline.PipelineExecutionId}`、SourceVars.CommitId 以及 env.exported-variables 的传递方式：

- https://docs.aws.amazon.com/codepipeline/latest/userguide/reference-variables.html
- https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html

```powershell
node scripts/test-staging-contract.mjs
node --check scripts/verify-staging.mjs
git add -- AWS_EXECUTION_LOG.md PROJECT_PLAN.md docs/staging-approval.md codebuild/staging.yml infra/terraform/cicd/staging.tf infra/terraform/cicd/candidate-pipeline.tf infra/terraform/cicd/tests/build.tftest.hcl infra/terraform/cicd/tests/candidate.tftest.hcl infra/terraform/cicd/tests/webhooks.tftest.hcl infra/terraform/cicd/tests/staging.tftest.hcl infra/terraform/cicd/tests/fixtures/staging-bootstrap.txt scripts/ci.sh scripts/staging-contract.mjs scripts/verify-staging.mjs scripts/test-staging-contract.mjs
node .githooks/check-staged-paths.mjs
git diff --cached --check
git commit -m 'feat: prepare isolated STG verification and first human approval'
git push
git rev-parse HEAD
git status --porcelain
```

结果：提交 `17f55f9e7ee60d92bf57d25e829b027ede919198`，Gitleaks 提交/推送 hooks 通过，功能分支已推送。没有合并 main、没有启动候选流水线、没有写入生产。现有 webhook CI 自动执行，用前文相同的 list-builds-for-project / batch-get-builds 查询；这不是新 STG 阶段运行。

```powershell
& $aws codebuild batch-get-builds --ids kongportfolio-ci-frontend:9e212b16-d362-4ae3-9c9b-307724b94642 kongportfolio-ci-backend:dcca2b09-166e-4c77-914d-224a214691ed --profile kong-dev --region ap-northeast-1 --output json
Invoke-RestMethod 'https://api.github.com/repos/konglingtong44/kongPortfolio/commits/17f55f9e7ee60d92bf57d25e829b027ede919198/statuses?per_page=10' -Headers $headers
```

首次查询时前端成功、后端仍在 BUILD；等待最终状态后再记录结论。原始 JSON 位于 `.local/staging-preparation-ci.json`，没有将 CodeBuild 临时凭证或 payload 上传到日志。

最终两个构建均 SUCCEEDED，source 都为 17f55f9；GitHub ci/frontend、ci/backend 最新状态均 success。再用 get-log-events 读取上述两个构建 UUID 的日志，分别存为 `.local/staging-preparation-frontend.log` / `staging-preparation-backend.log`，确认 STG 合约检查实际在 Linux CI 中执行，且 applicationChecksRan=true：前端 40 项测试/build，后端 9 HTTP + 3 Lambda 测试及 ZIP smoke 全通过。

本轮最终记录提交 `docs: record STG preparation verification and full operation audit` 仅本地保存，等获批创建前一起推送，避免只为补验证记录再触发两次 CI。新资源/阶段尚未创建；批准范围是 8 个新增资源、2 项配置更新和一次首次验证，验收到人工审批 1 等待，不自动批准。

补充执行约束：Terraform precondition 在生成计划时核对 bootstrap 文件；执行保存的 plan 前还要重新 Get-FileHash 比对原 manifest SHA（不能只相信旧 plan 中已计算的文件哈希），并检查资源动作仍在批准范围内。新流水线的真实 Lambda 更新、七次 Invoke、报告导出和待审批状态仍需获批后逐项验证。

## 7. S3-05：获批后创建 STG 并验证到人工审批（已完成，审批保留等待）

你明确批准“创建并验证到人工审批 1 等待”，不等于批准后续生产 Green 或切流。本轮先 Get-Content 读取 AGENTS.md、忽略的 staging-plan.tfvars.json；git status/log 检查工作树和提交；STS 确认账号；Get-FileHash 重核 bootstrap ZIP；git push 发布本地最终记录 d1f1e26。提交/推送扫描通过。

```powershell
git status --short
git log -2 --oneline
& $aws sts get-caller-identity --profile kong-dev --query Account --output text
Get-FileHash -LiteralPath '<已核验 bootstrap ZIP>' -Algorithm SHA256
git push
```

将已审核的 enable_staging=true、bootstrap 路径、manifest SHA 写入忽略的日常 cicd/terraform.tfvars，保留原有开关。先检查没有重复的 enable_staging 字段，不覆盖未知配置。路径用 JSON 字符串转义后写入 HCL 文件，没有把 JSON 当 shell 转义使用。

```powershell
& $tf '-chdir=infra/terraform/cicd' fmt
& $tf '-chdir=infra/terraform/cicd' plan -input=false '-out=staging-approved.tfplan' -no-color
& $tf '-chdir=infra/terraform/cicd' show -json staging-approved.tfplan
# 用精确资源地址 allowlist 核对：8 create + 2 update，禁止其余动作。
# 紧接 apply 前再次 Get-FileHash 与 manifest 的 SHA 比较。
& $tf '-chdir=infra/terraform/cicd' apply -input=false staging-approved.tfplan -no-color
```

实际计划 `.local/staging-approved-plan.log`；bootstrap 校验和匹配。资源创建与验证结果在后文续记，不自动执行 put-approval-result。

### 7.1 创建完成并启动固定提交验证

Apply 完成：8 added / 2 changed / 0 destroyed；Lambda 约 14 秒创建至 Active。新的 CodeBuild/verifier、日志、角色均已创建。用 list-pipeline-executions 查询，确认 UpdatePipeline 未自动产生新执行，没有重复启动。

```powershell
& $aws codepipeline list-pipeline-executions --pipeline-name kongportfolio-candidate --max-results 3 --profile kong-dev --region ap-northeast-1 --output json
git rev-parse origin/feat/aws-serverless-ci
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=d1f1e26189db843e64a8c1e9e82aee5725741569' --client-request-token 'stg-first-d1f1e26' --profile kong-dev --region ap-northeast-1 --output json
& $aws lambda get-function-configuration --function-name kongportfolio-stg --profile kong-dev --region ap-northeast-1 --query '{name:FunctionName,runtime:Runtime,version:Version,state:State,code:CodeSha256}' --output json
```

执行 `02bbc2cd-88c1-4f19-beb0-5a44cfb2de0d`，指定 source d1f1e26，写入 `.local/staging-execution.json`。Lambda Runtime=java21、State=Active，初始代码哈希与 bootstrap 匹配；这个检查不代表新候选已经通过 STG。

### 7.2 首次 STG 等待器权限问题

Source、BuildCandidate 成功，构建 `kongportfolio-candidate:df701507-5eba-40d9-b3ca-6480595c351a` 生成候选。STG 构建 `kongportfolio-stg:cc55d60a-37b2-4713-b616-92da3396c0d3` 已通过 source/manifest 校验并更新函数代码，随后等待器失败，未生成 report，也未进入审批。

读取 list-action-executions、batch-get-builds 和 get-log-events 定位，完整日志 `.local/staging-first-build.log`。真正错误是 function-updated-v2 调用了 lambda:GetFunction，而当前角色只授予 GetFunctionConfiguration。原先对 v2 waiter 底层 API 的假设不准确。

公开读取 AWS CLI 的 function-updated / function-updated-v2 文档，确认前者轮询 GetFunctionConfiguration，后者使用 GetFunction。将脚本改为 function-updated，不增加 GetFunction（避免额外获取代码下载元数据），保留原有 IAM 范围。重新做 Node 语法和合约测试，再发布修复并验证。

### 7.3 修复发布及第二次验证

```powershell
node --check scripts/verify-staging.mjs
node scripts/test-staging-contract.mjs
git add -- scripts/verify-staging.mjs AWS_EXECUTION_LOG.md
git diff --cached --check
git commit -m 'fix: wait for STG code updates with configuration-only access'
git push
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=4d12091dd8ce6899949c1653d0855c781129abf5' --client-request-token 'stg-waiter-4d12091' --profile kong-dev --region ap-northeast-1 --output json
```

修复 source=4d12091，执行 `1222a3dd-3302-4943-b992-8f9f2d2c087e`，记录 `.local/staging-final-execution.json`。需要新执行是因为旧 SourceRef 固定在旧脚本；没有用临时改包跳过源码一致性检查。Terraform 随后 plan No changes，确认 CI 更新 STG 代码后，Terraform 没有把代码回滚到 bootstrap（`.local/staging-code-ownership-plan.log`）。

用同样的 list-action-executions、list-builds-for-project、batch-get-builds 和 get-log-events 观察阶段，避免把旧失败构建误当新执行结果：必须匹配 resolvedSourceVersion。最终候选构建 `kongportfolio-candidate:60bbf9fb-ed89-41b1-b35a-a9833a260bf1` 成功；STG 构建 `kongportfolio-stg:4a224ab2-0e7f-4ef6-9191-dc28ba24e49c` 成功，源码 SHA 均为新修复提交。

STG 脚本在该构建中实际执行的 CLI/API 顺序（使用 CodeBuild IAM role，不使用本机 SSO profile）：

1. 验证 Candidate 的文件、清单、SHA 和 Source/CodeBuild revision；无网络修改。
2. `aws sts get-caller-identity` 确认账号。
3. `aws lambda get-function-configuration --function-name kongportfolio-stg` 验证配置/角色。
4. `aws lambda list-versions-by-function --function-name kongportfolio-stg` 查找可复用的同代码/配置版本。
5. 需要更新时 `aws lambda update-function-code --function-name kongportfolio-stg --revision-id <读取的RevisionId> --zip-file fileb://<Candidate/backend.zip> --publish`，再 `aws lambda wait function-updated --function-name kongportfolio-stg`。不调用 GetFunction，不更新配置。
6. `aws lambda get-function-configuration --function-name kongportfolio-stg --qualifier 3`，匹配不可变版本与后端 CodeSha256。
7. 串行七次 `aws lambda invoke --function-name kongportfolio-stg --qualifier 3 --invocation-type RequestResponse --cli-binary-format raw-in-base64-out --payload file://<模拟事件JSON> --cli-read-timeout 60 <响应文件>`，每次 metadata.ExecutedVersion 必须为 3。
8. 写 report.json，buildspec 读取并 export VERIFIED_RELEASE / VERIFIED_VERSION，CodeBuild 自动上传 StagingReport artifact；未上传响应原文。

实际通过 health、profile-ja、profile-zh、profile-en、bedrock-placeholder、api-not-found、method-not-allowed 七项；包含 no-store、404/405 和真实 Java Lambda 运行验证。函数版本 **3**；releaseId **f784feab86d0ef506f6d6678e58c8cff43210343bf882c22e29d7182dc11c10a**。原始摘要日志 `.local/staging-successful-build.log`，action/构建元数据 `.local/staging-final-actions.json`、`staging-final-build.json`。

### 7.4 下载报告并独立核对

从该 execution 的 outputArtifacts 读取实际报告 key，不猜测路径：

```powershell
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/BUkArwL --profile kong-dev --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/BUkArwL --version-id p2GoM_W7jym78rVia6lH0MkRoOIb0_Hd --profile kong-dev --region ap-northeast-1 '<仓库>/.local/staging-review-1222a3dd/report.zip' --output json
Get-FileHash -LiteralPath '<report.zip>' -Algorithm SHA256
jar --list --file '<report.zip>'
# 外层 SHA 与 CodeBuild artifacts.sha256sum 匹配，且条目只能为 report.json，才在新建 .local 目录中解压。
jar --extract --file '<report.zip>'
& $aws lambda get-function-configuration --function-name kongportfolio-stg --qualifier 3 --profile kong-dev --region ap-northeast-1 --output json
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/Candidate/uccgIXZ --profile kong-dev --region ap-northeast-1 --output json
```

验证报告 passed=true、七项都 passed、execution/source/function/version 符合预期。Lambda 实际 CodeSha256 解 Base64 为 hex 后等于报告 backendSha256 `8ffd1daa51a71c788d690260e9775e97a2c8256249ce8b863f6bcc44930d7a8a`。报告的 Release/Version 也与 CodeBuild 导出变量及人工审批 CustomData 一致。

候选 key `kongportfolio-candid/Candidate/uccgIXZ`，VersionId `t4QJWmoV5iIHkxLykfR..r1hy8n2lPF4`。报告 key `kongportfolio-candid/StagingRep/BUkArwL`，VersionId `p2GoM_W7jym78rVia6lH0MkRoOIb0_Hd`。本地报告 `.local/staging-review-1222a3dd/report.json`，复核身份 `.local/staging-verified-review.json`。没有读取或写入审批 token。

### 7.5 审批等待、生产与 Terraform 收尾

```powershell
& $aws codepipeline get-pipeline-state --name kongportfolio-candidate --profile kong-dev --region ap-northeast-1 --query 'stageStates[].{stage:stageName,actions:actionStates[].{action:actionName,status:latestExecution.status}}' --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --profile kong-dev --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
& $tf '-chdir=infra/terraform/cicd' plan -input=false -detailed-exitcode -no-color
```

Source、BuildCandidate、VerifyStaging 全为 Succeeded；ApproveProduction / ApproveGreenCreation 为 **InProgress（等待人工）**。整体执行仍在进行中，这是停在审批的预期状态，不称整条流水线 Succeeded。只查询状态字段，排除 token；没有调用 put-approval-result。现有代码没有生产 Green 阶段，所以即便以后人工批准此旧版本执行，也不会创建生产 Green。

生产 live alias 仍为版本 2，未配置权重；公开 HTTPS GET /api/health 返回 UP。最终 Terraform plan No changes（`.local/staging-final-plan.log`）。本 Story 验收到待审批已完成；生产 Green、第二道审批、CodeDeploy 蓝绿/回滚仍待下一 Story。日志、报告均保留，不包含认证码或私有响应原文。

### 7.6 Git 收尾

最终修改本记录、PROJECT_PLAN.md、docs/staging-approval.md，写清“阶段成功、整体执行等待审批”的区别；文档检查、扫描后提交推送：

```powershell
git add -- AWS_EXECUTION_LOG.md PROJECT_PLAN.md docs/staging-approval.md
git diff --cached --check
git commit -m 'docs: record verified STG and pending human approval'
git push
git rev-parse HEAD
git status --porcelain
```

原始成功元数据、状态摘要和本地下载报告都留在忽略的 .local，没有加入 Git。文档推送仅触发现有 CI，不启动新候选执行、不操作审批。最终 CI 查询沿用 list-builds-for-project / batch-get-builds 和 GitHub statuses GET，记录到 `.local/staging-final-doc-ci.json`；不为等待审批而反复运行新的发布流程。

## 8. S3-06：Green 与第二道审批准备（2026-11-12，尚未 apply）

### 8.1 用户审批与本次验收

用户说“批准ok 继续吧”后，用 `aws codepipeline get-pipeline-execution` 和 `list-action-executions --filter pipelineExecutionId=1222a3dd-3302-4943-b992-8f9f2d2c087e` 只读核对：旧执行 Succeeded，ApproveGreenCreation 已由用户在 UI 完成，摘要 Reviewed STG report: 7 checks passed, Lambda version 3。旧定义没有 Green 步骤，因此没有发布生产 Green。新源码/执行需重新通过本次 STG 和人工审批 1，不复用旧审批。

本次验收：准备可审阅的 Terraform、版本验证脚本、第二道审批和实际计划；创建前暂停请用户批准费用与管理边界。尚未调用 apply、update-function-code、update-alias 或 put-approval-result。

### 8.2 本地读取、编辑与资料请求

通过 PowerShell `Get-Content`、`rg`、`git diff/status` 查看 AGENTS.md、现有 candidate/STG/生产 Terraform、buildspec、脚本、测试、PROJECT_PLAN.md、根日志及忽略目录中的既有报告/计划日志。后续恢复上下文再次读取相关文件尾部和计划摘要；未把本机私有输入加入 Git。一次尝试读取不存在的 `codebuild/frontend.yml` 返回路径不存在，未创建该文件。

使用 apply_patch 编辑：

- `infra/terraform/cicd/green.tf`：默认关闭 Green，创建受限 CodeBuild/角色/policy/日志组。
- `candidate-pipeline.tf`：增加 Green 构建启动权限、三输入制品验证阶段、第二道 Manual gate；审批文字明确本 Story 不切流。
- `infra/terraform/portfolio/api.tf`：明确交接代码和别名发布字段，ignore_changes 防止后续 plan/apply 覆盖流水线代码或误切流；配置继续由 Terraform 管理。
- `codebuild/green.yml`、`scripts/green-contract.mjs`、`verify-green.mjs`、`test-green-contract.mjs`，以及 ci.sh：核对同次 Source/STG/审批、候选 SHA、生产角色/配置；发布/复用不可变版本；七项直接调用；前后 live 版本/RevisionId/权重一致才写 GreenReport。
- `tests/green.tftest.hcl` 加三项计划测试；四个既有测试文件显式关闭 Green，避免本地 opt-in 污染测试。
- 新建 `docs/green-approval.md`、更新 PROJECT_PLAN.md 和本日志，区分准备完成与真实云验证。

只读浏览 AWS 主文档：Lambda API_GetAlias、CodePipeline API_ListActionExecutions、Lambda 权限参考与细粒度访问示例，以及 CodeBuild/CodePipeline pricing。错误的 Service Authorization URL `list_awslambda.html` 重定向到目录；搜索后用 [AWS 官方权限示例](https://repost.aws/knowledge-center/granular-access-lambda) 和 [权限参考](https://docs.amazonaws.cn/en_us/service-authorization/latest/reference/list_lambda.html) 确认 GetAlias 对函数资源授权，将最初的 alias ARN 改为唯一生产函数 ARN（只读，不增加路由权限）。费用参考：https://aws.amazon.com/codebuild/pricing/ 、https://aws.amazon.com/codepipeline/pricing/ 。GET 请求未修改外部服务。

### 8.3 校验与真实账号计划

命令在仓库根目录运行；`$tf='D:\software\Terraform\terraform.exe'`、`$aws='D:\software\AWSCLI\aws.exe'`、`$env:AWS_PROFILE='kong-dev'`。环境加载使用 `scripts/tools.ps1`。关键命令：

```powershell
node scripts/test-green-contract.mjs
node --check scripts/verify-green.mjs
node --check scripts/green-contract.mjs
& D:\software\Git\bin\bash.exe -n scripts/ci.sh
& $tf '-chdir=infra/terraform/cicd' fmt -recursive
& $tf '-chdir=infra/terraform/cicd' validate
& $tf '-chdir=infra/terraform/cicd' test -no-color
& $tf '-chdir=infra/terraform/portfolio' fmt -check
& $tf '-chdir=infra/terraform/portfolio' validate
& $tf '-chdir=infra/terraform/portfolio' test -no-color
& $tf '-chdir=infra/terraform/cicd' plan -input=false -var=enable_green=true -out=green.tfplan -no-color
& $tf '-chdir=infra/terraform/cicd' show -json green.tfplan
& $tf '-chdir=infra/terraform/cicd' plan -input=false -detailed-exitcode -no-color
& $tf '-chdir=infra/terraform/portfolio' plan -input=false -detailed-exitcode -no-color
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
git diff --check
git status --short
```

初次 Green HCL 测试 condition 的跨行 `&&` 语法失败，合为单行后重跑通过；CICD 13 个 mocked plan、生产域名 3 个测试通过，Node 拒绝错误目标、已有权重、live 变化、缺审批、跨执行/跨候选报告等检查通过。mock 不等于真实 Green 运行。

实际 CICD plan 为 **4 add / 2 change / 0 destroy**；默认关闭 Green 与生产交接 plan 均 No changes。私有计划在 `infra/terraform/cicd/green.tfplan`，日志 `.local/green-plan.log`、`green-disabled-plan.log`、`green-production-handoff-plan.log`。GetAlias 读取再次确认 live 版本 2、无权重；旧 pipeline execution Succeeded。修正 GetAlias 权限后会重新生成实际计划。没有执行创建。

新增阶段费用示例：20 次/月 × 2 分钟 ×（CodeBuild small $0.005 + V2 action $0.002）≈ $0.28/月，未扣账号共享免费额度，未含 Lambda/存储/日志/税和已有 CI/STG；这不是全站总费或封顶。构建最多十分钟、并发一、不重试。后续创建需明确批准。

最终再次 fmt/validate/test，CICD 13/13 通过；Node/shell 语法和 Green guards 通过。PowerShell 的未加引号 `-out=green.tfplan` 被错误传参，Terraform 报 Too many command line arguments，未创建资源；将 native 参数逐个加单引号后重跑成功，最终仍 4 create / 2 update / 0 delete。show-json 逐项确认新增 Green log group/project/role/policy，更新 candidate pipeline 与其 inline policy。另一次读取猜测路径 `scripts/check-private-paths.mjs` 失败，实际私有路径检查入口是 `.githooks/check-staged-paths.mjs`，以 ci.sh 中路径为准。Git 提示 LF→CRLF 规范化，不是检查失败。

### 8.4 源码扫描、提交与现有 CI

准备以以下命令扫描、提交推送（不启动候选发布；推送只触发现有两个 CI 项目），随后按源码 SHA 读取构建/状态以确认实际结果：

```powershell
node .githooks/check-staged-paths.mjs --all
gitleaks dir --redact --no-banner .
git add -- AWS_EXECUTION_LOG.md PROJECT_PLAN.md docs/green-approval.md infra/terraform/cicd infra/terraform/portfolio/api.tf scripts/ci.sh scripts/green-contract.mjs scripts/test-green-contract.mjs scripts/verify-green.mjs codebuild/green.yml
git diff --cached --check
git commit -m 'feat: prepare approval-gated production Green verification'
git push
git rev-parse HEAD
git status --short
```

所有 Terraform tfvars、state、plan、.local 内容保持忽略；两条 fail-closed Gitleaks hooks 保留。真实 Green 运行权限、多制品、报告和第二道审批尚未验证；本次不把本地 guard/mock 测试称为蓝绿切流验证。

已实际完成上述扫描/提交/推送：源码 `18cf8625a8bf767cb85731aee75057f918246422`；Gitleaks dir、commit 暂存区与 push 全历史均无泄露，提交后工作区干净。最终 plan 正确的 PowerShell 写法：`& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-var=enable_green=true' '-out=green.tfplan' '-no-color'`。

推送后只读验证命令：

```powershell
& $aws codebuild list-builds-for-project --project-name kongportfolio-ci-frontend --sort-order DESCENDING --region ap-northeast-1 --max-items 2 --query ids --output json
# backend 项目同样查询，按 resolvedSourceVersion 匹配新提交。
& $aws codebuild batch-get-builds --ids kongportfolio-ci-frontend:0f4abb7b-3238-4194-9f54-e2b094430db4 kongportfolio-ci-backend:427e8b05-56b0-4752-a6e6-6dd0cc7c4489 --region ap-northeast-1 --query 'builds[].{id:id,status:buildStatus,sha:resolvedSourceVersion,phase:currentPhase}' --output json
& $aws logs get-log-events --log-group-name /aws/codebuild/kongportfolio-ci-frontend --log-stream-name 0f4abb7b-3238-4194-9f54-e2b094430db4 --region ap-northeast-1 --query 'events[].message' --output json
# backend 日志组及 stream 换为对应构建。
Invoke-RestMethod -Uri 'https://api.github.com/repos/konglingtong44/kongPortfolio/commits/18cf8625a8bf767cb85731aee75057f918246422/status' -Headers @{Accept='application/vnd.github+json';'User-Agent'='kongPortfolio-verification'}
```

查询中间状态 frontend SUCCEEDED/backend BUILD 时继续等待，没有新 start-build；两次短等待约 45/30 秒。最终两个构建均 SUCCEEDED，resolvedSourceVersion 都等于 18cf862；GitHub combined、ci/frontend、ci/backend 全 success。云端日志确认 Green guard 运行、frontend 40 tests/build、backend 9 HTTP + 3 Lambda tests/ZIP smoke，二者 applicationChecksRan=true。本地结果 `.local/green-source-ci.json`、`green-frontend-ci.log`、`green-backend-ci.log`，只存忽略目录。未执行真实 Green 项目或启动新候选流水线。

最后将本验证结果补入 PROJECT_PLAN.md、docs/green-approval.md 和本日志，执行 `git diff --check`、路径检查、Gitleaks，再仅本地提交 `docs: record Green preparation CI evidence`；不为文档再次推送触发一对 CI。下一次授权执行时一起推送。等待 4 新增/2 更新、生产代码与别名发布字段管理交接的明确批准；批准后仍保留新执行两道人工 gate。

## 9. 已批准 Green 基础设施与新执行（2026-11-12）

用户对 4 新增/2 更新、代码/别名发布字段管理交接回复 ok，并确认两道发布审批由用户手动执行，随后说“行 继续”。本次执行已批准的创建与首次流水线验证，到新执行的人工审批 1 停止，不代替用户审批。

### 9.1 执行前核对与发布准备

读取 AGENTS.md、根日志尾部、docs/green-approval.md、本机忽略的 CICD 输入；运行 `git status --short`、`git log -2 --oneline`、`git rev-parse HEAD`，工作区原本干净，文档提交为 `776e24f566bfff160fcc27b7d5b17ea48cd33f53`，应用/脚本仍为已经 CI 验证的 18cf862 内容。`Select-String` 只读确认候选流水线 DetectChanges=false、两道 Manual gate。

```powershell
$env:AWS_PROFILE='kong-dev'
& D:\software\AWSCLI\aws.exe sts get-caller-identity --query Account --output text
Get-FileHash -LiteralPath .local/candidate-verification-e7b0712d/unpacked/backend.zip -Algorithm SHA256
& D:\software\Terraform\terraform.exe '-chdir=infra/terraform/portfolio' plan '-input=false' '-detailed-exitcode' '-no-color'
# 本机 ignored terraform.tfvars 追加 enable_green = true；没有提交该输入文件。
git check-ignore infra/terraform/cicd/terraform.tfvars infra/terraform/cicd/green.tfplan
. ./scripts/tools.ps1
git push
& D:\software\Terraform\terraform.exe '-chdir=infra/terraform/cicd' plan '-input=false' '-out=green.tfplan' '-no-color'
& D:\software\Terraform\terraform.exe '-chdir=infra/terraform/cicd' show '-json' green.tfplan
```

STS 账号 561798268037 正确；bootstrap ZIP SHA 88e27021494b7f63c38af9b11cd332be5c7849bba4e75d81a9162fef9e22a4c8 与既有输入一致。生产管理交接 plan No changes，日志 `.local/green-approved-production-plan.log`。776e24f 已通过 push hook 全历史 Gitleaks 扫描并推送；没有合并 main。CICD 新计划 `.local/green-approved-plan.log`，解析 JSON 拒绝删除或偏离 4 create/2 update 的计划。后续仅 apply 这个已核对计划。

### 9.2 已执行创建与新流水线启动

```powershell
& D:\software\Terraform\terraform.exe '-chdir=infra/terraform/cicd' apply '-input=false' '-no-color' green.tfplan
& D:\software\Terraform\terraform.exe '-chdir=infra/terraform/cicd' plan '-input=false' '-detailed-exitcode' '-no-color'
$aws='D:\software\AWSCLI\aws.exe'
& $aws codepipeline get-pipeline --name kongportfolio-candidate --region ap-northeast-1 --query 'pipeline.{version:version,type:pipelineType,mode:executionMode,stages:stages[].{name:name,actions:actions[].{name:name,provider:actionTypeId.provider}}}' --output json
& $aws codepipeline list-pipeline-executions --pipeline-name kongportfolio-candidate --max-results 3 --region ap-northeast-1 --query 'pipelineExecutionSummaries[].{id:pipelineExecutionId,status:status}' --output json
& $aws codebuild batch-get-projects --names kongportfolio-green --region ap-northeast-1 --query 'projects[].{name:name,role:serviceRole,timeout:timeoutInMinutes,concurrency:concurrentBuildLimit,buildspec:source.buildspec}' --output json
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=776e24f566bfff160fcc27b7d5b17ea48cd33f53' --region ap-northeast-1 --output json
```

Apply 成功：**4 added / 2 changed / 0 destroyed**，日志 `.local/green-apply.log`；后续 plan No changes（`.local/green-post-apply-plan.log`）。实际 pipeline version=3、V2 QUEUED，六阶段且两个人工 gate 顺序正确；实际 Green 项目角色/十分钟超时/并发一/buildspec 匹配。列执行确认更新配置没有自动启动新流水线，随后仅一次手动启动固定 SHA，返回 ID 保存 `.local/green-pipeline-execution.json`。SourceRef 仍是完整 clone reference，之后 Candidate/STG/Green 使用同次执行制品；不在审批后重新打包。

新 execution `c02bc4e6-079b-4a53-835b-84c6877bb2d6`，Source 已 Succeeded 且 revision 是 776e24f；候选构建 `kongportfolio-candidate:115e7a7c-6553-4528-b17a-20515d1a0e2a`。运行期间只读 `list-action-executions --filter pipelineExecutionId=<本次ID>`，保存 `.local/green-run-actions.json`，没有请求审批 token。用 `list-builds-for-project --project-name kongportfolio-candidate --sort-order DESCENDING --max-items 1` 和 `batch-get-builds --ids <构建ID>` 对照实际阶段及 resolvedSourceVersion。一次约 40 秒短等待没有启动额外构建。

`aws iam get-role-policy --role-name kongportfolio-green-build --policy-name publish-and-verify-green-without-routing --query PolicyDocument --output json` 只读保存 `.local/green-deployed-role-policy.json`；解析确认没有 UpdateAlias/CreateAlias/UpdateFunctionConfiguration/PutApprovalResult。`aws lambda get-alias --function-name kongportfolio-prod --name live --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}'` 确认为 2/无权重；`Invoke-RestMethod https://konglingtong44.com/api/health` 返回 UP。更新本日志、PROJECT_PLAN.md、docs/green-approval.md 记录已 apply 与云验证缺口。

### 9.3 Candidate/STG 真实结果与独立报告检查

继续用同次 execution 的 list-action-executions 查询，每次保存忽略的 `.local/green-run-actions.json`；约 35 秒、25 秒短等待后 Candidate 与 VerifyStaging 均 Succeeded，ApproveProduction / ApproveGreenCreation 为 InProgress。没有自动或 CLI 审批。

`aws codebuild batch-get-builds --ids kongportfolio-candidate:115e7a7c-6553-4528-b17a-20515d1a0e2a` 返回 SUCCEEDED，匹配源码 776e24f；元数据 `.local/green-candidate-build.json`。`logs get-log-events --log-group-name /aws/codebuild/kongportfolio-candidate --log-stream-name 115e7a7c-6553-4528-b17a-20515d1a0e2a --query 'events[].message' --output json` 保存 `.local/green-candidate-build.log`，过滤摘要确认 ci.sh all、9+3 后端测试和候选完整验证，applicationChecksRan=true/sourceDirty=false。构建包含前端测试/打包及 ZIP-only JVM smoke；没有构建 Docker 镜像。

STG 构建 `kongportfolio-stg:e092253b-dac7-4163-95d6-4fb793b1be3d`，batch-get-builds 返回 SUCCEEDED，源码同为 776e24f，保存 `.local/green-staging-build.json`。CodeBuild 内部运行既有 `scripts/verify-staging.mjs`：STS → get-function-configuration → list-versions-by-function → update-function-code（RevisionId、原 Candidate/backend.zip、publish）→ configuration-only function-updated waiter → get-function-configuration --qualifier 4 → 七次 lambda invoke --qualifier 4 → 校验并写 StagingReport。具体通用 CLI 参数见 7.3 节，本次不是旧版本 3。七项 health、ja/zh/en、Bedrock placeholder、404、405 全通过；没有真实模型调用。

本次 releaseId **07ad6c1f23a3abdeb6332719ba846aa81f101db71a786a8681827b797eaa3d5b**，backend SHA **ece55eafae91e22c4a92c3e57355151752063dc34e1bc87e939b0ff81fd5634f**，STG version **4**。候选 key `kongportfolio-candid/Candidate/5Wy5cVH`，报告 key `kongportfolio-candid/StagingRep/5uGIvGp`。审批导出 VERIFIED_RELEASE/VERIFIED_VERSION 与独立报告相符。

独立报告操作（本机仅只读 AWS）：

```powershell
New-Item -ItemType Directory -Path .local/green-staging-review-c02bc4e6 -Force
# 从本次 action outputArtifacts 读取 bucket/key，不猜测路径。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/5uGIvGp --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/5uGIvGp --version-id cSoQs7djby6lU00NOI5z2oMyA1m_8MIk --region ap-northeast-1 .local/green-staging-review-c02bc4e6/report.zip --output json
Get-FileHash -LiteralPath .local/green-staging-review-c02bc4e6/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead 只接受唯一 report.json，读取内容后立即释放 stream/zip。
& $aws lambda get-function-configuration --function-name kongportfolio-stg --qualifier 4 --region ap-northeast-1 --output json
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id c02bc4e6-079b-4a53-835b-84c6877bb2d6 --region ap-northeast-1 --query 'pipelineExecution.{id:pipelineExecutionId,status:status,version:pipelineVersion}' --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
& D:\software\Terraform\terraform.exe '-chdir=infra/terraform/cicd' plan '-input=false' '-detailed-exitcode' '-no-color'
```

报告外层 SHA `a748b8366c3ae7157e97c28e9d7c40ad19af4228107c0bae418c72a39a90b91c` 匹配 CodeBuild artifacts.sha256sum，报告 execution/source/release/七项结果正确，Lambda 实际 CodeSha256 解码后匹配 backend SHA。本地保留 report.zip/report.json/review.json/object.json，仅在 `.local/green-staging-review-c02bc4e6/`。STG 更新后 Terraform plan 仍 No changes，证明未回滚到 bootstrap（`.local/green-staging-ownership-plan.log`）。

整体 execution **InProgress**、version 3，停在人工 gate 1；生产 live 仍 **2 / 无权重**。Green 项目已创建但没有运行，没有发布生产新版本、没有调用 put-approval-result 或任何 update-alias。提供控制台链接：https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/kongportfolio-candidate/view?region=ap-northeast-1 ，用户核对新执行/STG4 后点击 ApproveGreenCreation 的“审阅 → 批准 → 提交”。批准后才运行 Green，之后停第二道审批。

### 9.4 文档和 Git 收尾

用 apply_patch 更新本日志、PROJECT_PLAN.md、docs/green-approval.md，随后运行 `git diff --check`、`node .githooks/check-staged-paths.mjs --all`、`gitleaks dir --redact --no-banner .`，仅提交这三个文档：`git commit -m 'docs: record Green infrastructure and fresh STG approval gate'`。文档留本地，不为本次等待审批再触发额外 CI；下次获授权继续时推送。既有已固定候选源码和制品不变。日志覆盖本地读取/输入修改/文档编辑、Git/扫描、AWS 写入/读取、公开 HTTP 和等待，不保存凭证、审批 token 或私有响应原文。

## 10. 人工审批 1 后的真实 Green 验证（2026-11-12）

用户回复 ok 后，先只读检查 AWS，没有把聊天回复当成 CLI 代批授权。`git status --short` 工作区干净；`Get-Content AWS_EXECUTION_LOG.md -Tail 12` 读取前次结论。以下所有 AWS 命令使用 `$env:AWS_PROFILE='kong-dev'`、`$aws='D:\software\AWSCLI\aws.exe'`、Tokyo region。

```powershell
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=c02bc4e6-079b-4a53-835b-84c6877bb2d6 --region ap-northeast-1 --query 'actionExecutionDetails[].{stage:stageName,action:actionName,status:status,external:output.executionResult.externalExecutionId,error:output.executionResult.errorDetails.message}' --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
& $aws codebuild list-builds-for-project --project-name kongportfolio-green --sort-order DESCENDING --max-items 1 --region ap-northeast-1 --query ids --output json
& $aws codebuild batch-get-builds --ids kongportfolio-green:f3a7e052-2215-41cc-a42e-2199d293335d --region ap-northeast-1 --output json
```

AWS 显示 ApproveGreenCreation 已 Succeeded（外部审阅 ID 6cec887f-19c2-4191-ae29-22eb380190e9），VerifyGreen InProgress；生产 live 仍 2/无权重。Green 构建 f3a7e052-2215-41cc-a42e-2199d293335d 的 resolvedSourceVersion 为固定的 776e24f，元数据保存忽略目录 `.local/green-production-build.json`。没有新 start-build/start-pipeline-execution 或 put-approval-result；当前流程沿用同一已批准候选。

### 10.1 Green 构建与同次审批证据

`aws logs get-log-events --log-group-name /aws/codebuild/kongportfolio-green --log-stream-name f3a7e052-2215-41cc-a42e-2199d293335d --region ap-northeast-1 --query 'events[].message' --output json` 保存 `.local/green-production-build.log`；设置 PYTHONUTF8=1 和控制台 UTF8，使用 Select-String 摘要 health/ja/zh/en/Bedrock placeholder/404/405 七项 Green passed，全部在生产不可变版本 **3** 上执行。再次 batch-get-builds 确认 SUCCEEDED、源码 776e24f，导出 GREEN_VERSION=3、BLUE_VERSION=2、GREEN_RELEASE=07ad6c1f…。

CodeBuild 中实际运行 `node scripts/verify-green.mjs`，其 CLI/API 顺序：

1. 本地严格验证同次 Candidate 完整性、SourceRef revision、STG report。
2. `aws sts get-caller-identity` → `codepipeline get-pipeline-execution` → `list-action-executions --filter pipelineExecutionId=<本次ID>`，验证第一道人工审批确实成功且属于同次执行。
3. `lambda get-function-configuration --function-name kongportfolio-stg --qualifier 4`，确认候选后端哈希就是实际已测 STG 版本。
4. `lambda get-alias --function-name kongportfolio-prod --name live` 保存版本 2/RevisionId/空权重，读取生产 get-function-configuration 与 list-versions-by-function。
5. `lambda update-function-code --function-name kongportfolio-prod --revision-id <读取值> --zip-file fileb://<本次Candidate/backend.zip> --publish`，再 `lambda wait function-updated --function-name kongportfolio-prod`；生成生产版本 3，没有重新打包后端。
6. `lambda get-function-configuration --function-name kongportfolio-prod --qualifier 3`，检查代码 SHA、角色、运行时、内存、超时和环境。
7. 七次 `lambda invoke --function-name kongportfolio-prod --qualifier 3 --invocation-type RequestResponse --cli-binary-format raw-in-base64-out --payload file://<事件文件> --cli-read-timeout 60 <响应文件>`；每次核对 ExecutedVersion=3、响应内容/HTTP status/no-store。
8. 再读 live alias，版本/RevisionId/权重必须与第 4 步相同；写 GreenReport，buildspec 导出三项变量，仅上传 report.json。

再次 list-action-executions 保存 `.local/green-production-actions.json`：VerifyGreen Succeeded，**ApproveTrafficShift / ApproveBlueGreenDeployment InProgress**，没有执行第二道审批。真实多输入制品、同次审批读取、GetAlias 函数 ARN 授权、发布/调用版本及报告导出本次均成功；没有遇到 IAM 扩权或构建修复。

### 10.2 独立下载 GreenReport、核对生产与 Terraform

从本次 VerifyGreen outputArtifacts 读取实际 key，不猜路径。PowerShell New-Item 创建 `.local/green-production-review-c02bc4e6/`；命令：

```powershell
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/JP6FoMr --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/JP6FoMr --version-id g_Dz1smCkglPg26ZTpI1ZAxOhduLtoqL --region ap-northeast-1 .local/green-production-review-c02bc4e6/report.zip --output json
Get-FileHash -LiteralPath .local/green-production-review-c02bc4e6/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead 限定唯一 report.json，读取并释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-prod --qualifier 3 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
& D:\software\Terraform\terraform.exe '-chdir=infra/terraform/portfolio' plan '-input=false' '-detailed-exitcode' '-no-color'
```

报告外层 SHA **ce69d5b3f0b183bf08025d1a9d35a0ebaf3fe3d46737c2b6473867ed0838ebec** 与 CodeBuild artifacts.sha256sum 一致。解析后逐项断言：report kind/passed/liveTrafficUnchanged、同次 execution/source/release/backend SHA 与已审 STG 一致、STG4/Blue2/Green3、七项全通过、approval1ActionId 与 AWS 成功审阅 actionExecutionId 一致。生产实际 version3 CodeSha256 解码后匹配后端 SHA ece55eafae91e22c4a92c3e57355151752063dc34e1bc87e939b0ff81fd5634f；live 仍2、RevisionId 845346d0-c1f5-4731-929a-9600ae9bfe9b、无权重，等于报告记录，第二道审批导出变量也相符。

下载原件、报告、复核摘要仅在忽略目录 `.local/green-production-review-c02bc4e6/`；公开 HTTPS health UP。Green 发布后生产 Terraform **No changes**（`.local/green-after-publication-production-plan.log`），实际验证代码/别名管理边界不会导致 bootstrap 回滚或误切到 Green。没有更新网站前端、没有 API Gateway/CloudFront Green 端到端验证、没有 CodeDeploy/自动回滚/切流操作。直接调用 Green API 合约不等于真实 Bedrock 模型调用。

### 10.3 文档与本地提交

用 apply_patch 更新本日志、PROJECT_PLAN.md、docs/green-approval.md，标明 Green 验证已通过、整体仍等待第二道人工审批。运行 `git diff --check`、`node .githooks/check-staged-paths.mjs --all`、`gitleaks dir --redact --no-banner .`，暂存上述三份文档并 `git commit -m 'docs: record verified production Green and second approval gate'`，最后 `git status --short`。文档提交留本地，避免为等待审批触发额外构建；本次没有推送/合并、没有修改已批准制品。后续 CodeDeploy 和前端推广仍单独增量。
