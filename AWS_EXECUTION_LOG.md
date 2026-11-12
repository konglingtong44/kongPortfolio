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

## 11. 第二道审批确认与 S3-06 收尾（2026-11-12）

用户回复 ok 后仍先检查 AWS 实际状态，没有代替手动审批。读取 AGENTS.md、根日志尾部、PROJECT_PLAN.md、docs/green-approval.md、docs/serverless-plan.md、green.tf 和已审本地 report.json；`rg --files infra/terraform/cicd scripts codebuild` 只读查看现有路径；`git status --short` 原本干净，`git log -2 --oneline` 确认前次两份文档提交。

```powershell
$env:AWS_PROFILE='kong-dev'
$aws='D:\software\AWSCLI\aws.exe'
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=c02bc4e6-079b-4a53-835b-84c6877bb2d6 --region ap-northeast-1 --query 'actionExecutionDetails[].{stage:stageName,status:status,external:output.executionResult.externalExecutionId}' --output json
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id c02bc4e6-079b-4a53-835b-84c6877bb2d6 --region ap-northeast-1 --query 'pipelineExecution.{status:status,version:pipelineVersion}' --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
```

结果：第二道 ApproveTrafficShift **Succeeded**，人工审阅 ID b9f9288a-dbc4-4019-85ea-9cb95c304d20；整个 execution **Succeeded**、pipeline version3。生产 live 仍版本2/无权重，health UP。复读本地 GreenReport 确认同一 release 07ad6c1f…、Blue2/Green3/liveTrafficUnchanged=true。没有 publish、UpdateAlias、创建部署或审批 API 调用。

本 Story 完成，下一 Story 的实现验收范围写入新文档 `docs/codedeploy-next-story.md`，不把方案描述称为实现。浏览器工具只读搜索并打开 AWS 官方 CodeDeploy deployment-configurations、deployment-groups-configure-advanced-options、reference-appspec-file-example 页面，并阅读搜索返回的 hooks 文档摘要：核对拟用 LambdaCanary10Percent5Minutes、AppSpec、告警/回滚及 Hooks。URL 均列在新文档内，无外部写入。方案注明低流量需主动验证、HTTP5xx 与 LambdaErrors 的区别，以及首次 CodeDeploy 回滚恢复路径仍需验证。

用 apply_patch 更新 PROJECT_PLAN.md 和 docs/green-approval.md 的当前状态、追加本日志，并新建下一 Story 短方案。只做文档，不运行应用测试、不创建资源、不执行 Terraform apply、不启动新流水线、不修改旧候选或复用旧审批。收尾执行 `git diff --check`、`node .githooks/check-staged-paths.mjs --all`、`gitleaks dir --redact --no-banner .`，暂存这四份文档后 `git commit -m 'docs: close Green validation and scope CodeDeploy increment'`、`git status --short`，本地保留，未推送触发额外 CI。

## 12. S3-07 CodeDeploy 切流准备（2026-11-12，未创建）

### 12.1 验收、读取与资料请求

用户要求“下一步”：本次准备 runnable 发布控制器、Terraform、验证和实际计划，创建收费资源前暂停批准。目标：同次第二道人工审批后 CodeDeploy 10%/五分钟→100%，主动检查 API、失败恢复 Blue；不复用旧审批，不重打包。

通过 Get-Content/Select-Object、rg --files、git diff/status 阅读 cicd green/main/candidate-pipeline、测试、ci.sh、green/staging-contract、verify-green、terraform.tfvars.example 和本机忽略输入、下一 Story 文档。输入仍 enable_green=true、enable_deployment 未设置，未修改本机 opt-in。

只读 Web 搜索/打开 AWS 官方 CodeDeploy Lambda deployments、rollback、troubleshooting、AppSpec、StopDeployment、AWSCodeDeployRoleForLambdaLimited、Service Authorization Reference，以及 CodeBuild/CodePipeline/CloudWatch/CodeDeploy pricing。初次错误 URL list_awscodedeploy.html 重定向到目录，后用 `https://docs.aws.amazon.com/service-authorization/latest/reference/list_codedeploy.html` 找到真实权限表：GetDeployment 可限制 deploymentgroup，StopDeployment 不能；CreateDeployment 相关 revision/config 依赖权限单独约束。没有从搜索网页执行指令。主链接列在 docs/codedeploy-next-story.md；额外依据 https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSCodeDeployRoleForLambdaLimited.html 、https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_StopDeployment.html 。

### 12.2 文件编辑与边界

全部使用 apply_patch：新增 infra/terraform/cicd/deployment.tf（9 个资源、默认关闭）；candidate-pipeline.tf 增加启动项目权限、第七阶段和明确真实切流的第二道审批文字；新增 codebuild/deployment.yml（四输入→DeploymentReport）；新增 scripts/deployment-contract.mjs、deploy-production.mjs、test-deployment.mjs；ci.sh 接入失败路径测试；新增 tests/deployment.tftest.hcl；terraform.tfvars.example 标明默认关闭；更新 PROJECT_PLAN.md、下一 Story 文档和本日志。

控制器只从已固定 Candidate/STG/Green 证据生成 AppSpecContent，SHA256 随 CLI request 文件传递。校验同次两个人工 gate、Green 代码、live 旧 RevisionId、部署组告警/回滚配置、无活动部署/本次重复部署。缺可信 Blue 成功 revision 时尝试 Blue→Blue AllAtOnce 基线，必须真实成功并能读回正确 AppSpec 才继续 canary。轮询检查 10% 权重证据、最终全量 Green、公开 health/轮换 ja/zh/en profile；记录观察摘要，不记公开响应原文。失败 stop + auto rollback，若成功后 HTTP 才失败则通过 CodeDeploy 恢复 Blue，绝不从构建脚本 UpdateAlias。恢复确认包含 Blue 版本/无权重/health；失败报告不会变成成功。

SIGTERM/SIGINT 尝试核对和停止自身部署；十五分钟构建超时不等于 CodeDeploy 自动终止，独立服务/失联的边界写入文档。该代码是待云验证实现，不保证首次同版本基线已被 AWS 接受，不把模拟恢复称为真实回滚成功。

### 12.3 测试、错误修复和实际计划

```powershell
node scripts/test-deployment.mjs
node scripts/test-green-contract.mjs
node --check scripts/deploy-production.mjs
node --check scripts/deployment-contract.mjs
& D:\software\Git\bin\bash.exe -n scripts/ci.sh
$tf='D:\software\Terraform\terraform.exe'
& $tf '-chdir=infra/terraform/cicd' fmt '-recursive'
& $tf '-chdir=infra/terraform/cicd' fmt '-check' '-recursive'
& $tf '-chdir=infra/terraform/cicd' validate
& $tf '-chdir=infra/terraform/cicd' test '-no-color'
$env:AWS_PROFILE='kong-dev'
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-var=enable_deployment=true' '-out=deployment.tfplan' '-no-color'
& $tf '-chdir=infra/terraform/cicd' show '-json' deployment.tfplan
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-detailed-exitcode' '-no-color'
git diff --stat
git status --short
```

初次注入失败测试发现“API 失败时部署刚成功”不会触发 stop，补上通过 CodeDeploy 恢复 Blue 的分支及专门用例；随后模拟器的 get 读取推进状态/stop 不恢复 alias 的模型导致断言失败，修正为由 sleep 推进状态并模拟停止后的 Blue 恢复，再重跑全部通过。测试不调用 AWS。fmt -check 曾提示 deployment.tf 需格式化，后实际 fmt 并再检查，不将外层 shell 的最后退出码误当先前命令全成功。Terraform validate 与 **16 个 mocked plans** 通过；Node guards/基线成功/基线失败阻断/HTTP失败停止/成功后恢复/超时路径通过。

真实账号 plan **9 add / 2 change / 0 destroy**，保存 infra/terraform/cicd/deployment.tfplan、`.local/deployment-plan.log`；show-json 确认九新增资源和 pipeline/role policy 两更新。收紧 IAM 后已重新 plan，仍同数量。默认关闭 plan No changes（`.local/deployment-disabled-plan.log`）。没有 apply、创建资源、创建部署、审批或切流。本次新增阶段 20 次×8分钟估算 $1.22/月（含一个标准告警的近似 $0.10，未扣共享免费额度、未含日志/存储/税/已有阶段，非全站总费或上限），来源见文档，按东京实际费率结算。

### 12.4 源码发布与 AWS CI 证据

在第三个 mocked plan 加入明确的 IAM 边界断言（构建无别名/代码更新/审批权、GetDeployment 仅生产组），再次 fmt 与 16 个计划测试通过。扫描、提交与推送命令：

```powershell
. ./scripts/tools.ps1
node .githooks/check-staged-paths.mjs --all
gitleaks dir --redact --no-banner .
git diff --check
git add -- AWS_EXECUTION_LOG.md PROJECT_PLAN.md docs/codedeploy-next-story.md infra/terraform/cicd/candidate-pipeline.tf infra/terraform/cicd/deployment.tf infra/terraform/cicd/tests/deployment.tftest.hcl infra/terraform/cicd/terraform.tfvars.example codebuild/deployment.yml scripts/ci.sh scripts/deployment-contract.mjs scripts/deploy-production.mjs scripts/test-deployment.mjs
git diff --cached --check
git commit -m 'feat: prepare twice-approved CodeDeploy canary and recovery'
git push
git rev-parse HEAD
git status --short
```

dir、commit 暂存区、push 全历史 Gitleaks 无泄露。源码提交 **0add5d0732acdb0d658961a7c4c10a0f97f73d83**，推送同时包含先前三个本地文档记录提交，不改变已完成旧流水线的源码。未合并 main。推送仅触发现有 CI，没有 start-pipeline-execution。

用 `aws codebuild list-builds-for-project --project-name kongportfolio-ci-frontend --sort-order DESCENDING --max-items 1 --region ap-northeast-1 --query ids --output json` 及 backend 项目同命令取 ID；随后 batch-get-builds 按 resolvedSourceVersion 核对，不把旧结果当本次。初始 queued，中间前端通过/后端构建，约 45 秒与 30 秒短等待后两项均 SUCCEEDED：

```powershell
& $aws codebuild batch-get-builds --ids kongportfolio-ci-frontend:5cd586bd-20c7-4ee5-b25a-d1ed127de2c5 kongportfolio-ci-backend:6fd38b19-334a-43e4-9c75-e94ae6bff8b1 --region ap-northeast-1 --query 'builds[].{id:id,status:buildStatus,phase:currentPhase,sha:resolvedSourceVersion}' --output json
& $aws logs get-log-events --log-group-name /aws/codebuild/kongportfolio-ci-frontend --log-stream-name 5cd586bd-20c7-4ee5-b25a-d1ed127de2c5 --region ap-northeast-1 --query 'events[].message' --output json
& $aws logs get-log-events --log-group-name /aws/codebuild/kongportfolio-ci-backend --log-stream-name 6fd38b19-334a-43e4-9c75-e94ae6bff8b1 --region ap-northeast-1 --query 'events[].message' --output json
Invoke-RestMethod -Uri 'https://api.github.com/repos/konglingtong44/kongPortfolio/commits/0add5d0732acdb0d658961a7c4c10a0f97f73d83/status' -Headers @{Accept='application/vnd.github+json';'User-Agent'='kongPortfolio-verification'}
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
git check-ignore infra/terraform/cicd/deployment.tfplan infra/terraform/cicd/terraform.tfvars .local/deployment-source-ci.json
```

两个 CI 的 SHA 同为 0add5d0，均 applicationChecksRan=true，部署纯逻辑测试在 AWS Linux 上通过；前端 40 tests/build、后端 9 HTTP + 3 Lambda tests/ZIP smoke 成功；GitHub combined/ci/frontend/ci/backend 都 success。云日志和元数据保存 `.local/deployment-source-ci.json`、`deployment-frontend-ci.log`、`deployment-backend-ci.log`，没有加入 Git。公开状态 API 为只读 GET。生产 live 仍2/无权重，私有 plan/tfvars/.local 均被忽略。

最终补入本日志、PROJECT_PLAN.md 和下一 Story 文档；再做 diff/path/Gitleaks 检查，仅本地提交 `docs: record CodeDeploy preparation CI and approval scope`，不为文档再推送触发重复 CI。等待用户明确批准 **9 新增/2 更新及首次新执行验证**；之后两道流水线人工审批仍必须重新由用户完成，第二道批准才授权实际生产切流和必要恢复。真实基线/切流/告警/回滚演练未验证。

## 13. 已批准 CodeDeploy 资源创建与新执行（2026-11-12）

用户对具体 9 新增/2 更新、首次新执行验证回复“开始”，确认资源创建已授权。验收本次到新执行第一道人工 gate：不代用户审批，不使用旧执行两道审批切流。

### 13.1 本地、认证与计划重核

读取 AGENTS.md、本日志尾部及本机忽略输入；`git status --short` 干净、`git log -2 --oneline` 确认 HEAD=ff77d62（仅文档，运行代码仍已验证的 0add5d0 内容）。设置 `$env:AWS_PROFILE='kong-dev'` 后 `aws sts get-caller-identity --query Account --output text` 返回 561798268037；Get-FileHash 再核对 STG bootstrap ZIP SHA 88e27021494b7f63c38af9b11cd332be5c7849bba4e75d81a9162fef9e22a4c8。GetAlias 的 version/weights 查询确认生产仍2/无权重。

PowerShell Get-Content/正则检查后，Add-Content 仅在本机 ignored `infra/terraform/cicd/terraform.tfvars` 增加 `enable_deployment=true`。随后：

```powershell
git check-ignore infra/terraform/cicd/terraform.tfvars infra/terraform/cicd/deployment.tfplan
. ./scripts/tools.ps1
git push
git rev-parse HEAD
$tf='D:\software\Terraform\terraform.exe'
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-out=deployment.tfplan' '-no-color'
& $tf '-chdir=infra/terraform/cicd' show '-json' deployment.tfplan
```

ff77d627f3a5182bac6872375dcd828199e1e57a 已经 push hook 全历史 Gitleaks 扫描无泄露后推送。无 main 合并；推送触发现有 CI，但候选流水线 DetectChanges=false。新计划保存 `.local/deployment-approved-plan.log`、ignored deployment.tfplan，解析 JSON 必须恰为9 create/2 update/无 delete，否则停止，不沿用旧计划猜测执行。

### 13.2 已 apply、核对真实配置并启动新执行

```powershell
& $tf '-chdir=infra/terraform/cicd' apply '-input=false' '-no-color' deployment.tfplan
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-detailed-exitcode' '-no-color'
$aws='D:\software\AWSCLI\aws.exe'
& $aws deploy get-deployment-group --application-name kongportfolio --deployment-group-name production --region ap-northeast-1 --query 'deploymentGroupInfo.{app:applicationName,group:deploymentGroupName,config:deploymentConfigName,platform:computePlatform,style:deploymentStyle,alarms:alarmConfiguration,rollback:autoRollbackConfiguration}' --output json
& $aws codepipeline get-pipeline --name kongportfolio-candidate --region ap-northeast-1 --query 'pipeline.{version:version,mode:executionMode,stages:stages[].name}' --output json
& $aws codepipeline list-pipeline-executions --pipeline-name kongportfolio-candidate --max-results 2 --region ap-northeast-1 --query 'pipelineExecutionSummaries[].{id:pipelineExecutionId,status:status}' --output json
& $aws cloudwatch describe-alarms --alarm-names kongportfolio-prod-live-errors --region ap-northeast-1 --query 'MetricAlarms[].{name:AlarmName,state:StateValue,metric:MetricName,dimensions:Dimensions,missing:TreatMissingData}' --output json
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=ff77d627f3a5182bac6872375dcd828199e1e57a' --region ap-northeast-1 --output json
```

Apply **9 added/2 changed/0 destroyed**，`.local/deployment-apply.log`。后续 plan **No changes**，`.local/deployment-post-apply-plan.log`。真实 CodeDeploy 平台 Lambda、BLUE_GREEN/WITH_TRAFFIC_CONTROL、10%/5min 配置、告警启用/不忽略轮询失败、三种自动回滚事件符合代码。告警初始 INSUFFICIENT_DATA（新建未满一个周期），Errors 精确维度 production:live，missing=notBreaching；不把配置成功称为告警触发已验证。Pipeline version4/QUEUED，七阶段，两个 Manual gate 均在 DeployProduction 前。列执行确认 update 没有自动运行，随后只启动一次固定 SHA。

新执行 **f2ed11c5-c7bc-49ca-a44f-1f9fb5a10466**，返回信息保存 `.local/deployment-pipeline-execution.json`。此次有真实切流阶段，但只有新的两道用户审批成功后才会运行；旧 c02bc4e6 审批不会复用。当前尚未 create-deployment，也未更新 live alias。

### 13.3 执行观察、STG 报告下载与复核

观察使用 `aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=f2ed11c5-c7bc-49ca-a44f-1f9fb5a10466 --region ap-northeast-1 --output json`，保存 `.local/deployment-run-actions.json`；摘要只打印阶段/状态/外部ID/错误，不请求审批 token。两次约40秒短等待，先看到候选构建，后 Candidate/VerifyStaging 均 Succeeded，ApproveProduction InProgress。用 list-builds-for-project --sort-order DESCENDING --max-items 1 分别查询 Candidate/STG，batch-get-builds 对照实际 source SHA。

`aws iam get-role-policy --role-name kongportfolio-deploy-build --policy-name approved-codedeploy-and-observation --query PolicyDocument --output json` 保存 `.local/deployment-controller-role-policy.json`，解析确认无直接 UpdateAlias/UpdateFunctionCode/PutApprovalResult。`deploy list-deployments --application-name kongportfolio --deployment-group-name production --query deployments` 返回空，证明尚未部署而非已切流。

Candidate build **kongportfolio-candidate:4bffc0d9-f63c-4744-a8ff-43de4f0c8154**、STG build **kongportfolio-stg:e82ea489-03aa-493b-b220-b741cf265a99**，batch-get-builds 都 SUCCEEDED 且 resolvedSourceVersion=ff77d627f3a5182bac6872375dcd828199e1e57a；完整元数据 `.local/deployment-candidate-stg-builds.json`。Candidate 执行固定源码全套 ci.sh all/构建/候选校验；STG 沿用已验证脚本顺序（见7.3、9.3），用原候选 ZIP 更新/发布 **STG 版本5** 并直接调用七项合约，不是生产新版本。

本机复核命令：

```powershell
& $aws codebuild batch-get-builds --ids kongportfolio-candidate:4bffc0d9-f63c-4744-a8ff-43de4f0c8154 kongportfolio-stg:e82ea489-03aa-493b-b220-b741cf265a99 --region ap-northeast-1 --output json
New-Item -ItemType Directory -Path .local/deployment-staging-review-f2ed11c5 -Force
# 从本次 action outputArtifacts 获取实际 bucket/key。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/yal5Nc6 --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/yal5Nc6 --version-id BdYYJTPDDSiyMnyt.HIj0sC178aGDM78 --region ap-northeast-1 .local/deployment-staging-review-f2ed11c5/report.zip --output json
Get-FileHash -LiteralPath .local/deployment-staging-review-f2ed11c5/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead 限唯一 report.json，读取后释放 stream/zip，不解压任意路径。
& $aws lambda get-function-configuration --function-name kongportfolio-stg --qualifier 5 --region ap-northeast-1 --output json
```

下载外层 SHA **e55ffc473231429b1aa08785dfe7e0298daf38a9840017e9cfc176258a74afe3** 等于 CodeBuild artifacts.sha256sum；JSON schema/kind/function/execution/source/passed/七项结果正确。Release **6af4a796faf697721d69148c95d9e81cd96abc2a0bf15e29b09de1eddc3d5910**；backend SHA **09a30e2ad79cf7a0ca85054fc43d378da860f64063b0486461239de6a9d7aa6e** 与实际数字版本 Lambda CodeSha256 解码后相同；审批导出 VERIFIED_RELEASE/VERIFIED_VERSION 与报告一致。report.zip/report.json/object.json/review.json 仅存 `.local/deployment-staging-review-f2ed11c5/`。

### 13.4 停在新第一道人工审批

```powershell
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id f2ed11c5-c7bc-49ca-a44f-1f9fb5a10466 --region ap-northeast-1 --query 'pipelineExecution.{status:status,version:pipelineVersion}' --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
& $aws deploy list-deployments --application-name kongportfolio --deployment-group-name production --region ap-northeast-1 --query deployments --output json
& $aws cloudwatch describe-alarms --alarm-names kongportfolio-prod-live-errors --region ap-northeast-1 --query 'MetricAlarms[].{name:AlarmName,state:StateValue}' --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-detailed-exitcode' '-no-color'
```

整体 **InProgress**/pipeline version4、第一道 ApproveProduction / ApproveGreenCreation **InProgress**；生产仍2/无权重，list-deployments 仍空，health UP；新告警经过评估后现在 OK（不是已验证触发）。STG 更新后 CICD plan No changes，日志 `.local/deployment-staging-final-plan.log`。没有代理审批或调用 create-deployment。用户需在控制台核对 f2ed11c5/STG5 后“审阅→批准→提交”；第一道只发布/验证 Green，第二道才授权真实切流与必要恢复。

用 apply_patch 更新本日志、PROJECT_PLAN.md、docs/codedeploy-next-story.md；运行 diff/path/Gitleaks 检查，仅本地提交 `docs: record CodeDeploy infrastructure and fresh approval gate`，最后 git status --short。没有为文档反复推送/启动新候选；下次获授权继续时推送，当前固定源码与制品不变。日志记录了本地输入修改、文件读取/编辑、Git、扫描、Terraform、AWS CLI、HTTP、等待和报告请求全部操作类型；不含凭证/审批 token 或私有响应原文。

## 14. 本次人工审批 1 后的 Green 验证（2026-11-12）

### 14.1 审批状态、构建与版本

用户说“ok 批准了”。先 `git status --short`（干净）与 `Get-Content AWS_EXECUTION_LOG.md -Tail 5` 读前次结论，再检查真实 AWS；没有从聊天代为审批。全部 CLI 使用 `$env:AWS_PROFILE='kong-dev'`、`$aws='D:\software\AWSCLI\aws.exe'`、`--region ap-northeast-1`。命令：

```powershell
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=f2ed11c5-c7bc-49ca-a44f-1f9fb5a10466 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
& $aws codebuild list-builds-for-project --project-name kongportfolio-green --sort-order DESCENDING --max-items 1 --region ap-northeast-1 --query ids --output json
& $aws codebuild batch-get-builds --ids kongportfolio-green:1010d2da-6bf2-4f78-a9f5-adae4df8829c --region ap-northeast-1 --output json
& $aws logs get-log-events --log-group-name /aws/codebuild/kongportfolio-green --log-stream-name 1010d2da-6bf2-4f78-a9f5-adae4df8829c --region ap-northeast-1 --query 'events[].message' --output json
```

第一道 ApproveGreenCreation **Succeeded**，审阅 action ID **f45a34ea-c336-45e6-8597-968798a58699**。初始 Green BUILD/导出值为空属运行中状态，约20秒短等待后再次查询，Green **SUCCEEDED**，固定源码 ff77d627f3a5182bac6872375dcd828199e1e57a。日志确认七项 health、profile-ja/zh/en、Bedrock placeholder、404、405 全在生产不可变 **版本4** 通过。CodeBuild 执行 verify-green.mjs 的 CLI 序列同10.1（本次 STG qualifier5/生产 qualifier4）；原 Candidate ZIP 发布，没有重新打包。没有创建新构建/新流水线。

元数据 `.local/deployment-green-build.json`、阶段详情 `.local/deployment-green-actions.json`、UTF8 云日志 `.local/deployment-green-build.log`，只在忽略目录；日志读取使用 PYTHONUTF8=1、控制台 UTF8，Select-String 只展示检查摘要。

### 14.2 版本化 GreenReport 与生产独立复核

```powershell
New-Item -ItemType Directory -Path .local/deployment-green-review-f2ed11c5 -Force
# key 来自本次 VerifyGreen action outputArtifacts。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/2eAgyv2 --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/2eAgyv2 --version-id RyT.1S9TNge69H0qxQDOeTJShpNfyIC3 --region ap-northeast-1 .local/deployment-green-review-f2ed11c5/report.zip --output json
Get-FileHash -LiteralPath .local/deployment-green-review-f2ed11c5/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead 只允许唯一 report.json，读取后释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-prod --qualifier 4 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --output json
& $aws deploy list-deployments --application-name kongportfolio --deployment-group-name production --region ap-northeast-1 --query deployments --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
& D:\software\Terraform\terraform.exe '-chdir=infra/terraform/portfolio' plan '-input=false' '-detailed-exitcode' '-no-color'
```

报告外层 SHA **5a486ffd4a71151827e99ce6efd6e819fba86a55090aa6d5d2522f2749385b7a** 匹配 CodeBuild artifacts.sha256sum。逐项校验 schema/kind/passed/liveTrafficUnchanged、functionName、Blue2/Green4/STG5、七项全部通过、与已审 STG 的 execution/source/release/backend SHA 相同；approval1ActionId 与 AWS 成功 action ID 相同。Release **6af4a796faf697721d69148c95d9e81cd96abc2a0bf15e29b09de1eddc3d5910**，backend SHA **09a30e2ad79cf7a0ca85054fc43d378da860f64063b0486461239de6a9d7aa6e** 等于真实 qualifier4 CodeSha256 解码值。Green/Blue/Release 导出变量与报告相同；live 版本和 RevisionId 与报告快照相同、无权重。

本地 ZIP/report/object/review JSON 仅在 `.local/deployment-green-review-f2ed11c5/`，没有上传响应原文。当前 deploy list-deployments 空、公开 health UP。生产代码发布后 Terraform **No changes**（`.local/deployment-green-production-plan.log`），管理交接未引入回滚代码或误切流。没有运行应用/容器测试，没有改应用源码；这里实际验证的是 AWS Green 运行与证据。

### 14.3 第二道人工审批待执行

再次 `get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id f2ed11c5-c7bc-49ca-a44f-1f9fb5a10466 --query 'pipelineExecution.{status:status,version:pipelineVersion}'` 显示整体 **InProgress**/version4；最新 actions 为 **ApproveTrafficShift InProgress**。`get-pipeline --query 'pipeline.stages[?name==`ApproveTrafficShift`].actions[].{name:name,approvalText:configuration.CustomData}'` 只读核对审批文字明确授权 production traffic shift and rollback、10%/5min→100%、首次 Blue baseline。未请求 token、未 put-approval-result、未 create-deployment/UpdateAlias。

向用户说明本次不同于旧六阶段验证：第二道批准会实际执行 CodeDeploy，不再只是结束流水线；应核对执行 f2ed11c5、Blue2/Green4、release6af4a796… 后“ApproveTrafficShift → ApproveBlueGreenDeployment → 审阅 → 批准 → 提交”。基线接受、真实权重、告警触发和回滚演练仍未验收，不因配置/模拟测试通过而宣称成功。

apply_patch 更新本日志、PROJECT_PLAN.md、docs/codedeploy-next-story.md；运行 `git diff --check`、`node .githooks/check-staged-paths.mjs --all`、`gitleaks dir --redact --no-banner .`，仅提交三份文档 `git commit -m 'docs: record fresh Green verification before real traffic approval'` 并 git status --short。本地保留文档提交，不推送触发额外 CI，等待用户第二道手动审批；已固定源码/制品没有改变。

### 14.4 用户询问额度并要求继续后的状态检查

用户问“额度够了吗 继续吧”。说明无法从当前工具读取 Codex 剩余额度，也未核实 AWS 账号共享免费额度，不能承诺免费；未读取账单或推测额度足够。继续只读核对同次执行，不将“继续”变成代理人工审批：

```powershell
git status --short
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=f2ed11c5-c7bc-49ca-a44f-1f9fb5a10466 --region ap-northeast-1 --query 'actionExecutionDetails[].{stage:stageName,status:status,external:output.executionResult.externalExecutionId,error:output.executionResult.errorDetails.message}' --output json
& $aws deploy list-deployments --application-name kongportfolio --deployment-group-name production --region ap-northeast-1 --query deployments --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
& $aws codebuild list-builds-for-project --project-name kongportfolio-deploy --sort-order DESCENDING --max-items 1 --region ap-northeast-1 --query ids --output json
```

结果：第二道 ApproveTrafficShift 仍 **InProgress**，第一道/Green 及之前阶段均 Succeeded，CodeDeploy deployments 与 deploy CodeBuild builds 均空，live仍2/无权重。这是等待用户第二道手动审批，并非构建失败或已切流。将控制台链接、f2ed11c5、Blue2/Green4 和真实10%/五分钟→100%后果明确告知用户。

只编辑本日志；执行 `git diff --check`、路径检查、Gitleaks，暂存日志并本地 `git commit -m 'docs: record pending manual traffic approval status'`、`git status --short`。没有云端写入/构建/推送/审批，也未改候选或部署代码。

## 15. 第二道人工审批后的 CodeDeploy 实际执行（2026-11-12）

用户回复“审批完了”，首先核对 AWS 而非代理审批。git status --short 干净。所有 CLI 使用 kong-dev profile / ap-northeast-1；当前执行 f2ed11c5-c7bc-49ca-a44f-1f9fb5a10466。

```powershell
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=f2ed11c5-c7bc-49ca-a44f-1f9fb5a10466 --region ap-northeast-1 --query 'actionExecutionDetails[].{stage:stageName,status:status,external:output.executionResult.externalExecutionId,error:output.executionResult.errorDetails.message}' --output json
& $aws deploy list-deployments --application-name kongportfolio --deployment-group-name production --region ap-northeast-1 --query deployments --output json
& $aws codebuild list-builds-for-project --project-name kongportfolio-deploy --sort-order DESCENDING --max-items 1 --region ap-northeast-1 --query ids --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
& $aws codebuild batch-get-builds --ids kongportfolio-deploy:e67ebb2b-d5e2-4fb3-8f27-2a5ff64fefbe --region ap-northeast-1 --output json
& $aws logs get-log-events --log-group-name /aws/codebuild/kongportfolio-deploy --log-stream-name e67ebb2b-d5e2-4fb3-8f27-2a5ff64fefbe --region ap-northeast-1 --query 'events[].message' --output json
```

第二道 ApproveTrafficShift Succeeded，用户审阅 ID **247a947b-d0c8-4d36-acb6-f53775245758**；DeployProduction InProgress。部署 CodeBuild **e67ebb2b-d5e2-4fb3-8f27-2a5ff64fefbe** 的源码为固定 ff77d627f3a5182bac6872375dcd828199e1e57a，BUILD 已执行 node scripts/deploy-production.mjs。初始 deploy list 空、live2/无权重。元数据 `.local/deployment-live-build.json`、UTF8 日志 `.local/deployment-live-build.log`（通过 PYTHONUTF8/控制台 UTF8），没有保存审批 token。没有人工另启动构建/流水线或创建部署，发布由已审批流水线继续。

### 15.1 Blue 基线实际成功，后续校验因 AWS 返回形状停止

约20秒短等待后再次 `deploy list-deployments`，对每个 ID `deploy get-deployment --deployment-id <ID> --query 'deploymentInfo.{id:deploymentId,status:status,config:deploymentConfigName,description:description,error:errorInformation,rollback:rollbackInfo}'`。基线 **d-0XJZB7ZDM Succeeded**，配置 LambdaAllAtOnce，描述准确绑定本次执行；CodeBuild 却 FAILED。刷新 get-log-events 并 Select-String 提取错误：`Initial Blue baseline was not recorded; refuse canary`。不是切流失败：没有创建主 canary，live2/无权重且公开 health UP。

读取 `deploy get-deployment --deployment-id d-0XJZB7ZDM --query 'deploymentInfo.{status:status,app:applicationName,group:deploymentGroupName,revision:revision}'` 与 `get-deployment-group --query deploymentGroupInfo.lastSuccessfulDeployment`：AWS 已记录本组 lastSuccessfulDeployment，但 GetDeployment.revision.appSpecContent **仅返回 sha256，不返回原 content**。原代码尝试解析 content，保守返回 false，因此阻断切流。没有 IAM 错误或权限扩张需求；首次 Blue→Blue 的服务接受已在真实 AWS 验证。

再次 batch-get-builds / list-action-executions 保存 `.local/deployment-live-build.json`、`.local/deployment-failed-actions.json`：DeployProduction Failed。失败构建仍上传报告到 `kongportfolio-candid/Deployment/t7XD7tc`，CodeBuild 外层 SHA 0faf8e3db426ea932943ab8afab2c776fb4f7752c44d2dd3ee8e0f3d7bca97b4（仅从元数据记录，没有下载报告）；不能将失败流水线称为成功。

### 15.2 精确哈希校验修复与本地复现

使用 apply_patch 修改 scripts/deployment-contract.mjs 新增 isBlueBaseline：核对 Succeeded、固定 app/group、AppSpecContent 类型和**由固定函数/live/Blue→Blue 生成的完整 JSON SHA256**。修改 deploy-production.mjs 使用该纯函数，避免读取不存在的 content。修复允许正确哈希的已记录基线，错误版本/组/状态/哈希仍拒绝，不跳过首次保护、不新增权限。

test-deployment.mjs 新增真实返回形状 fixture（只有哈希）、错误Blue/失败状态/错误组/篡改哈希的断言。命令：

```powershell
node scripts/test-deployment.mjs
node --check scripts/deploy-production.mjs
& $aws deploy get-deployment --deployment-id d-0XJZB7ZDM --region ap-northeast-1 --output json > .local/deployment-blue-baseline.json
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {isBlueBaseline} from './scripts/deployment-contract.mjs'; if(!isBlueBaseline(JSON.parse(readFileSync('.local/deployment-blue-baseline.json','utf8').replace(/^\uFEFF/,'' )).deploymentInfo,'2')) process.exit(1); console.log('Actual recorded Blue baseline digest verified');"
```

全部测试通过；实际 AWS 基线哈希 **9bfd87a600a5ac75419eacb865bba5f8813859858b8d3c898486ba0a1d8689a2** 与本地 Blue2→Blue2 AppSpec 哈希一致。只读取生产状态，没有切换或恢复别名；线上没有偏离 Blue，因此不需要回滚。

将修复和失败记录写入 PROJECT_PLAN.md、docs/codedeploy-next-story.md、本日志，扫描/diff/path 检查后提交推送 `fix: verify CodeDeploy baseline using returned AppSpec digest`。随后启动固定新 SHA 的候选流水线，重新验证全部 Candidate/STG 并停第一道人工审批；旧审批绑定旧执行，绝不拿来批准新候选或把原 pipeline 运行代码暗中替换。没有新资源或 Terraform/IAM 变更。

### 15.3 修复提交与新执行

执行 `. ./scripts/tools.ps1`、Node 失败路径测试、path/diff/Gitleaks 扫描（无泄露），暂存上述六个脚本/文档文件，`git commit -m 'fix: verify CodeDeploy baseline using returned AppSpec digest'`、`git push`、`git rev-parse HEAD`、`git status --short`，固定提交 **c0a0a2ce2e8f1018e30b968fa6e40e5969792a75**。没有 main 合并。

```powershell
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=c0a0a2ce2e8f1018e30b968fa6e40e5969792a75' --region ap-northeast-1 --output json
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=98380c85-fbbc-4b50-9416-7f10ddccdc0c --region ap-northeast-1 --output json
# 分别 list-builds-for-project 取最新 ID，再按 resolvedSourceVersion 核对：
& $aws codebuild batch-get-builds --ids kongportfolio-ci-frontend:0bb755cf-10d8-4705-a02b-63bf6a350c0c kongportfolio-ci-backend:c0de1fb7-0b31-46ce-865b-66b00bcae76c --region ap-northeast-1 --query 'builds[].{id:id,status:buildStatus,sha:resolvedSourceVersion}' --output json
```

新执行 **98380c85-fbbc-4b50-9416-7f10ddccdc0c**，Source 已成功读取 c0a0a2c；启动结果 `.local/deployment-fixed-execution.json`、actions `.local/deployment-fixed-actions.json`。候选构建 **98206404-3ece-4dd6-b193-bb784a411858**。推送触发的两项现有 CI 均 SUCCEEDED、源码 c0a0a2c；未手动 start-build。约40秒短等待，没有循环启动额外发布。保持现有资源/角色不变，不调用 UpdateAlias 或代理审批。

### 15.4 新执行到第一道审批的真实复核

随后约35秒及20秒短等待后，用同一 list-action-executions 更新 `.local/deployment-fixed-actions.json`。Candidate **98206404-3ece-4dd6-b193-bb784a411858**、STG **4ad476f1-221a-4cd4-9832-9feb501b92ce** 都 SUCCEEDED，batch-get-builds 核对源码均 c0a0a2ce2e8f1018e30b968fa6e40e5969792a75，保存 `.local/deployment-fixed-candidate-stg.json`。STG 原脚本对同次 ZIP 发布/调用数字 **版本6** 七项通过，Source/BuildCandidate/VerifyStaging Succeeded，**ApproveProduction InProgress**。新执行尚未发布 Green/部署，未使用旧审批。

读取两份 CI get-log-events（frontend stream 0bb755cf-10d8-4705-a02b-63bf6a350c0c；backend stream c0de1fb7-0b31-46ce-865b-66b00bcae76c，日志组对应 /aws/codebuild/kongportfolio-ci-frontend/backend）保存 `.local/deployment-fix-frontend-ci.log`、`deployment-fix-backend-ci.log`，摘要确认修复 guard 测试、applicationChecksRan=true，后端9+3测试/ZIP smoke通过。只读 GET GitHub commit c0a0a2c 的 `/status`，combined、ci/frontend、ci/backend 全 success。没有推送第二个修复或手动重试构建。

版本化报告独立复核：

```powershell
New-Item -ItemType Directory -Path .local/deployment-fixed-stg-review-98380c85 -Force
# key 从本次 VerifyStaging.outputArtifacts 取得。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/lpu1ngu --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/lpu1ngu --version-id vHx.8_T6ctr8eFuagPrNQtp3LvA3CeF0 --region ap-northeast-1 .local/deployment-fixed-stg-review-98380c85/report.zip --output json
Get-FileHash -LiteralPath .local/deployment-fixed-stg-review-98380c85/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead 仅接受唯一 report.json，读取后释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-stg --qualifier 6 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
```

外层 SHA **40ed5fd088d93475faff6f98eb66750aafe6506bd17b2d6d8a1c7c6eb751fc10** 与 CodeBuild artifacts.sha256sum 一致；report kind/passed/execution/source/function/version/七项全通过一致，导出 VERIFIED_RELEASE/VERIFIED_VERSION 匹配。Release **a578af2edc0269822612dce35ff921efbc4595f33552999bdf5c40a57da13fe8**，backend SHA **991f27a2e68eb94e81a30ecfc2d7d5ee3452738304565cb49a72abc1afcd9799** 与实际 qualifier6 CodeSha256 匹配。ZIP/report/object/review JSON 仅留忽略的上述目录。生产 live2/无权重、health UP。

更新 PROJECT_PLAN.md、docs/codedeploy-next-story.md、本日志，运行 diff/path/Gitleaks 校验，暂存三文档、本地提交 `docs: record baseline fix and fresh staging approval evidence`，最后 git status --short。不为文档再启动 CI 或候选。最终向用户明确旧执行失败原因/未切流、修复已验证、新98380c85/STG6需重新第一道手动审批。首次真实 canary/自动回滚仍没有验收，不称部署已成功。

### 15.5 继续请求后的审批复查

用户说“ok 继续”后，运行 git status --short（干净），设置 kong-dev profile，执行 `codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=98380c85-fbbc-4b50-9416-7f10ddccdc0c`（只查询 stage/status/external/error）；GetAlias 查询 version/weights；`codebuild list-builds-for-project --project-name kongportfolio-green --sort-order DESCENDING --max-items 1 --query ids`，均 region ap-northeast-1 / JSON。

AWS 实际显示新执行第一道 **ApproveProduction InProgress**，Source/Candidate/STG 已 Succeeded；live仍2/无权重。最新 Green ID仍旧执行1010d2da，不是新执行的新验证结果。没有将聊天里的“继续”当成 AWS 审批完成，没有启动重复执行或代批。向用户再次给出控制台链接并明确选新98380c85/STG6的 ApproveProduction→ApproveGreenCreation，点击审阅/批准/提交，之后才能继续 Green。

仅 apply_patch 更新本日志，git diff --check 检查格式；本地日志待后续一起提交，本次没有 Git 发布、云写入或新资源操作。

## 16. 修复后新执行的 Green 验证（2026-11-12）

用户再次要求“ok 继续”。以 kong-dev / Tokyo 只读检查真实 AWS，未代理人工审批。`git status --short` 只有上一轮待提交的本日志修改，保留并一起记录，没有覆盖文件。

```powershell
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=98380c85-fbbc-4b50-9416-7f10ddccdc0c --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
& $aws codebuild list-builds-for-project --project-name kongportfolio-green --sort-order DESCENDING --max-items 1 --region ap-northeast-1 --query ids --output json
& $aws codebuild batch-get-builds --ids kongportfolio-green:a9b6d691-7231-49e0-a620-fa754784d368 --region ap-northeast-1 --output json
```

本次第一道审批现在 **Succeeded**，审阅 ID **a08b5b97-17d6-4d12-88bd-7d027ac3e9e7**。Green 构建 a9b6d691-7231-49e0-a620-fa754784d368 初始 BUILD/导出空值，约20秒短等待后再次 actions/batch-get-builds，最终 **SUCCEEDED**，源码 c0a0a2ce2e8f1018e30b968fa6e40e5969792a75；新生产不可变 **版本5** 七项通过。读取日志 `logs get-log-events --log-group-name /aws/codebuild/kongportfolio-green --log-stream-name a9b6d691-7231-49e0-a620-fa754784d368 --query 'events[].message'`，UTF8 设置和 Select-String 提取七项摘要；脚本 CLI 顺序同10.1，本次 STG qualifier6/Green qualifier5。没有重打包或新建构建，沿同次审批候选运行。

元数据 `.local/deployment-fixed-green-build.json`、actions `.local/deployment-fixed-green-actions.json`、云日志 `.local/deployment-fixed-green-build.log`，只在忽略目录。

### 16.1 独立证据核对

```powershell
New-Item -ItemType Directory -Path .local/deployment-fixed-green-review-98380c85 -Force
# 从本次 action outputArtifacts 获取 key。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/IYoCq9A --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/IYoCq9A --version-id pGD5MzBLeiq_iCwYmGn5bwZ_je5lsojv --region ap-northeast-1 .local/deployment-fixed-green-review-98380c85/report.zip --output json
Get-FileHash -LiteralPath .local/deployment-fixed-green-review-98380c85/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead 限唯一 report.json，读取并释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-prod --qualifier 5 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
```

报告外层 SHA **d559c29da7e51df55b17e3b4542ce4d4c15c86ae28be6edb2d0d76b8d4964549** 与 CodeBuild artifacts.sha256sum 相同；kind/passed/liveTrafficUnchanged、function、Blue2/Green5/STG6、七项全通过正确；execution/source/release/backend SHA 与已审 STG 一致，approval1ActionId 与 AWS 成功 action ID 一致。Release **a578af2edc0269822612dce35ff921efbc4595f33552999bdf5c40a57da13fe8**；backend SHA **991f27a2e68eb94e81a30ecfc2d7d5ee3452738304565cb49a72abc1afcd9799** 等于实际 Green5 CodeSha256 解码值；第二道审批导出 GREEN_RELEASE/GREEN_VERSION/BLUE_VERSION 与报告一致。live 仍2、RevisionId 与报告快照相同、无权重，公开 health UP。

原件/report/object/review JSON 只留上述 .local 目录，不进入 Git。当前 **ApproveTrafficShift InProgress**，DeployProduction 未执行；旧基线已成功，修复匹配真实digest，但首次 canary/回滚仍未验证。向用户提供新执行98380c85的第二道审批链接，明确 **Blue2/Green5**，批准会真实10%/五分钟→100%，第一道不再重复。

apply_patch 更新本日志、PROJECT_PLAN.md、docs/codedeploy-next-story.md；diff/path/Gitleaks 校验后仅本地 `git commit -m 'docs: record fixed Green verification and pending canary approval'`，包含之前15.5未提交日志，最后 git status --short。不修改源码/制品，不推送触发额外CI，不代批、不直接调用部署或UpdateAlias。

## 17. 修复后 CodeDeploy 真实灰度执行（2026-11-12）

用户说“ok 继续”，先只读核对 AWS。git status --short 干净；kong-dev profile/ap-northeast-1。命令：

```powershell
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=98380c85-fbbc-4b50-9416-7f10ddccdc0c --region ap-northeast-1 --query 'actionExecutionDetails[].{stage:stageName,status:status,external:output.executionResult.externalExecutionId,error:output.executionResult.errorDetails.message}' --output json
& $aws deploy list-deployments --application-name kongportfolio --deployment-group-name production --region ap-northeast-1 --query deployments --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
& $aws codebuild list-builds-for-project --project-name kongportfolio-deploy --sort-order DESCENDING --max-items 1 --region ap-northeast-1 --query ids --output json
& $aws deploy get-deployment --deployment-id d-K1QJSA0EM --region ap-northeast-1 --output json
& $aws codebuild batch-get-builds --ids kongportfolio-deploy:0a1ce867-7916-443e-be58-aab3556c37ea --region ap-northeast-1 --query 'builds[].{id:id,status:buildStatus,phase:currentPhase,sha:resolvedSourceVersion}' --output json
& $aws cloudwatch describe-alarms --alarm-names kongportfolio-prod-live-errors --region ap-northeast-1 --query 'MetricAlarms[].{name:AlarmName,state:StateValue}' --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
```

本次第二道人审 **Succeeded**，审阅 ID **3b58f932-20fe-4e8f-a091-1e131666c9b6**；DeployProduction InProgress。部署构建 **0a1ce867-7916-443e-be58-aab3556c37ea**，固定源码c0a0a2ce2e8f1018e30b968fa6e40e5969792a75。已有基线 d-0XJZB7ZDM 之后，实际主 canary **d-K1QJSA0EM** 已创建，描述绑定本次98380c85，配置LambdaCanary10Percent5Minutes，创建时间13:22:26 JST。初次独立读取已观察到 **live主版本2、AdditionalVersionWeights={5:0.1}**，真实10%灰度确实发生；当前告警OK、healthUP、没有错误/rollbackInfo。部署元数据 `.local/deployment-canary.json`。发布由经两道用户审批的 CodeBuild 控制器执行，本机没有代理审批、重复启动或直接UpdateAlias。

### 17.1 观察到真实灰度与全量完成

约40秒短等待后，重复只读 get-deployment/GetAlias/describe-alarms/HTTPS health，用 PowerShell DateTimeOffset 计算 elapsedSeconds，并将时间/部署状态/版本/权重/告警/health/错误/rollback摘要 ConvertTo-Json -Compress 后 Add-Content 到 `.local/deployment-canary-observations.jsonl`。13:27:28.58 JST，距创建303秒，仍主版本2+Green5权重0.1，alarmOK、healthUP，无错误/回滚。

再等约30秒并查询：CodeDeploy **d-K1QJSA0EM Succeeded**，完成时间 **13:27:28.995 JST**；live **5/无权重**，errorInformation/rollbackInfo为空。CodeBuild **0a1ce867-7916-443e-be58-aab3556c37ea SUCCEEDED**、源码c0a0a2c；DeployProduction action Succeeded。刷新完整元数据 `.local/deployment-canary.json`、`.local/deployment-fixed-live-build.json`、actions `.local/deployment-success-actions.json`。只出现已有Blue基线和一个正式canary，没有重复基线。修复后的digest判断已在真实控制器中通过。

### 17.2 下载最终部署报告并独立匹配

```powershell
New-Item -ItemType Directory -Path .local/deployment-final-review-98380c85 -Force
# key来自本次DeployProduction.outputArtifacts。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/Deployment/8X2JaCE --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/Deployment/8X2JaCE --version-id _v31Ry3oglCKiH6iK44b5KN5.tVmFinA --region ap-northeast-1 .local/deployment-final-review-98380c85/report.zip --output json
Get-FileHash -LiteralPath .local/deployment-final-review-98380c85/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead限唯一report.json，读取并释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-prod --qualifier 5 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --output json
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id 98380c85-fbbc-4b50-9416-7f10ddccdc0c --region ap-northeast-1 --query 'pipelineExecution.{status:status,version:pipelineVersion}' --output json
```

报告外层SHA **3375e1783c51db25c5ee9944b7c0de639a94597b17227a832231635bfd84b665** 等于CodeBuild artifacts.sha256sum。逐项校验schema1/kind production-deployment/passed=true、execution/source/release与已审Green一致、deploymentId=d-K1QJSA0EM、Blue2/Green5、观察中确有Blue2/Green5 0.1以及最后Succeeded/live5/空权重。报告共 **15次观察**，从Created/Blue2到Succeeded/Green5；实际qualifier5 CodeSha256仍等于已批准Green。API Gateway仍调用live别名，未修改集成/域名。流水线整体 **Succeeded**、version4。

原件ZIP、report.json/object.json/review.json仅在 `.local/deployment-final-review-98380c85/`，不加入Git，不上传请求/响应原文。

### 17.3 全量后的公开HTTPS与Terraform

PowerShell单引号here-string经 `node --input-type=module` 执行验证：import assert、fs.writeFileSync、timers/promises.sleep及现有staging-contract.mjs的contracts；逐项fetch固定公开域名，redirect=error、超时30秒，断言HTTP status、成功内容marker/no-store，间隔1200ms避免节流；只保存检查摘要 `.local/deployment-final-public-api.json`。

实际请求七项：GET /api/health=200/UP，GET /api/profile?lang=ja、zh、en各200/语言标记，POST /api/bedrock=200/PREPARING，GET /api/not-a-route=404，POST /api/profile=405，全部通过。POST仍为占位，无真实Bedrock模型调用。这里是CloudFront/API Gateway公开HTTP验证，不声称原生浏览器视觉检查或容器重新构建。

```powershell
& D:\software\Terraform\terraform.exe '-chdir=infra/terraform/portfolio' plan '-input=false' '-detailed-exitcode' '-no-color'
& D:\software\Terraform\terraform.exe '-chdir=infra/terraform/cicd' plan '-input=false' '-detailed-exitcode' '-no-color'
```

两套实际plan均 **No changes**，日志 `.local/deployment-final-production-plan.log`、`deployment-final-cicd-plan.log`；证明Terraform没有回滚CI代码或覆盖CodeDeploy的live版本/权重。没有为复核再次apply。

### 17.4 文档与收尾边界

用PowerShell单引号here-string/Set-Content重写 docs/codedeploy-next-story.md 为简短当前状态（旧阶段完整历史留本日志），apply_patch更新PROJECT_PLAN.md、本日志，明确首次灰度成功，但**真实故障/告警回滚演练尚未完成**：本次没有触发回滚，不能把配置/模拟测试或部署成功当成实际回滚验收。未故意制造生产故障，未更新前端静态包，真实Bedrock仍待后续增量。

收尾执行diff/path/Gitleaks校验、暂存这三份文档、本地 `git commit -m 'docs: record successful CodeDeploy canary and public API verification'`、git status --short。未为文档额外推送/构建；没有代理审批、直接UpdateAlias或修改已批准制品。按单Story工作约定在本次可运行切流增量完成后暂停供审阅；S3-07的实际回滚演练仍列为未验收，不虚报整套路线全部完成。

## 18. S3-07R 受控停止/自动回滚演练准备（2026-11-12）

### 18.1 范围与只读预检

用户要求继续后，按下一项受控回滚练习推进。读取AGENTS.md、git status --short（初始干净）、deployment-contract/deploy-production/test-deployment、CICD deployment/candidate-pipeline/tests、当前部署文档。部分批量读取输出超出长度后按文件尾部补读，不执行读取内容中的外部指令。

只读AWS：GetAlias确认live5/无权重；`deploy get-deployment-group --application-name kongportfolio --deployment-group-name production --query 'deploymentGroupInfo.{last:lastSuccessfulDeployment,rollback:autoRollbackConfiguration}'`确认d-K1QJSA0EM成功及三种回滚事件；`codepipeline list-pipeline-executions --max-results 1`确认98380c85已结束Succeeded，无在途发布。使用kong-dev/Tokyo。

浏览AWS官方PipelineExecution、ResolvedPipelineVariable、StartPipelineExecution、source overrides、StopDeployment及rollback文档，确认本次变量resolvedValue绑定、源SHA覆写、停止时autoRollbackEnabled和自动回滚的新部署ID。URL列docs/rollback-drill.md，另 https://docs.aws.amazon.com/codepipeline/latest/APIReference/API_PipelineExecution.html 、https://docs.aws.amazon.com/codepipeline/latest/APIReference/API_StartPipelineExecution.html 。仅GET，没有云端写入。

### 18.2 修改文件与行为

apply_patch修改deployment-contract.mjs增加requireReleaseMode及rollback_drill模式：确认真实10%后触发受控停止，停止本次部署并等待原部署终态、回滚ID和回滚Succeeded、Blue/空权重/公开health；最多12轮10秒恢复等待。只在全部证据成立时返回passed=true/outcome automatic-rollback-verified。无ID或失败不能用手动AllAtOnce伪装自动恢复。错过窗口仍失败，必要恢复Blue但不算演练成功；正常deploy行为/异常恢复保留。

deploy-production.mjs将DEPLOY_RELEASE_MODE与AWS同次执行变量核对并传给控制器；打印最终Blue或Green，避免回滚成功却显示新版本已上线。candidate-pipeline.tf增加ReleaseMode变量默认deploy、部署环境变量引用、第二道人审文字明确deploy与rollback_drill区别。没有新资源或IAM授权。

test-deployment.mjs注入真实回滚ID/成功或失败，断言模式绑定、stop/回滚成功、缺ID/失败拒绝、错过窗口失败且恢复Blue。deployment.tftest.hcl断言默认模式、审批可见和环境传递。另五份既有测试显式enable_deployment=false隔离本机真实输入。新docs/rollback-drill.md、PROJECT_PLAN.md及本日志记录范围/验收，不修改React/Java功能。

### 18.3 测试、计划与修复记录

```powershell
node scripts/test-deployment.mjs
node --check scripts/deploy-production.mjs
$tf='D:\software\Terraform\terraform.exe'
& $tf '-chdir=infra/terraform/cicd' fmt '-recursive'
& $tf '-chdir=infra/terraform/cicd' validate
& $tf '-chdir=infra/terraform/cicd' test '-no-color'
$env:AWS_PROFILE='kong-dev'
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-out=rollback-drill.tfplan' '-no-color'
& $tf '-chdir=infra/terraform/cicd' show '-json' rollback-drill.tfplan
```

Node演练/失败路径测试及语法通过，Terraform validate通过。初次test受本机terraform.tfvars的enable_deployment=true影响，5份旧测试默认Green=false，触发输入验证：3pass/5fail/8skip；用PowerShell Get-Content/正则/Set-Content为这5个测试全局输入补enable_deployment=false后fmt并重跑，**16pass/0fail**。没有改真实enable_deployment输入或通过关闭真实资源来修测试。

实际计划 **0 add/1 update/0 destroy**，JSON断言唯一变化为aws_codepipeline.candidate[0]，否则停止。保存ignored rollback-drill.tfplan和`.local/rollback-drill-plan.log`。仅更新现有流水线模式/审批/参数，不新增收费资源；仍有既有CI/部署分钟、日志/请求费用。模式测试不能代表真实自动回滚已成功。

本次“继续”授权回滚练习的准备和现有流水线配置；不新增收费资源，无需重复请求资源创建批准。实际生产影响仍需新执行两道用户手动审批，第二道明确模式与恢复目标。接下来先扫描/提交推送、确认现有AWS CI，再应用此唯一pipeline更新，启动固定新SHA/rollback_drill，停第一道审批供用户审阅，不代批或自动进入生产演练。

### 18.4 Git、现有CI、唯一配置更新和演练执行

运行Node测试、path检查、Gitleaks dir、git diff --check，git add（仅三个部署脚本、candidate-pipeline、六份测试、docs/rollback-drill.md、PROJECT_PLAN.md、根日志），cached diff检查后 `git commit -m 'feat: add execution-bound controlled rollback drill'`、git push、rev-parse/status。提交 **8ad190ba366b6967793675098f5df1fab26fd324**，dir/暂存/push全历史扫描无泄露，无main合并。推送也带上此前本地文档记录；候选仍DetectChanges=false，不自动发布。

list-builds-for-project分别查询现有两个CI，再 `batch-get-builds --ids kongportfolio-ci-frontend:1646d1e9-ceaa-4cbe-84c7-a36a4f20f2af kongportfolio-ci-backend:5018cf31-20a0-4d08-91fc-dbc157cbb848` 按SHA核对；约35秒/25秒短等待后，两项SUCCEEDED/SHA8ad190b。读取两个CI日志组对应stream的get-log-events，存 `.local/rollback-drill-frontend-ci.log`、`rollback-drill-backend-ci.log`，证实rollback drill注入测试在AWS Linux通过、前端40 tests/build、后端9+3 tests/ZIP smoke、applicationChecksRan=true。只读GET GitHub commit8ad190b `/status` 最终success，两context均success；摘要 `.local/rollback-drill-source-ci.json`。

```powershell
& $tf '-chdir=infra/terraform/cicd' apply '-input=false' '-no-color' rollback-drill.tfplan
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-detailed-exitcode' '-no-color'
& $aws codepipeline get-pipeline --name kongportfolio-candidate --region ap-northeast-1 --output json
& $aws codepipeline list-pipeline-executions --pipeline-name kongportfolio-candidate --max-results 1 --region ap-northeast-1 --query 'pipelineExecutionSummaries[].{id:pipelineExecutionId,status:status}' --output json
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=8ad190ba366b6967793675098f5df1fab26fd324' --variables 'name=ReleaseMode,value=rollback_drill' --region ap-northeast-1 --output json
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id 96861976-0f9e-4a0c-b49e-9c75c0c1762b --region ap-northeast-1 --query 'pipelineExecution.{id:pipelineExecutionId,version:pipelineVersion,status:status,variables:variables}' --output json
```

Apply **0 added/1 changed/0 destroyed**（`.local/rollback-drill-apply.log`），后续plan No changes（`.local/rollback-drill-post-apply-plan.log`）。实际pipeline version5，变量ReleaseMode/defaultValue deploy，schema与期望一致；配置更新没有自动执行，最近旧执行仍Succeeded。

只启动一次新执行 **96861976-0f9e-4a0c-b49e-9c75c0c1762b**，返回信息 `.local/rollback-drill-execution.json`。立即GetPipelineExecution遇到短暂PipelineExecutionNotFoundException；只重试该只读GET，没有重复start。随后成功读回InProgress/version5、**ReleaseMode resolvedValue=rollback_drill**，证明模式已绑定本次执行。没有创建生产部署、修改别名、代理审批或新增收费资源。

### 18.5 新候选/STG到第一道人审及报告复核

约40/35/20秒短等待，用 `codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=96861976-0f9e-4a0c-b49e-9c75c0c1762b --output json` 更新 `.local/rollback-drill-actions.json`；分别list-builds-for-project确认Candidate/STG ID，再batch-get-builds按resolvedSourceVersion核对：Candidate **3895c434-6edb-487e-88d3-f1ec24de3e92**、STG **3dbc6f8a-bd85-4201-8849-5cb3eab7a4df** 均SUCCEEDED、源码8ad190b；元数据 `.local/rollback-drill-candidate-stg.json`。Candidate执行全ci.sh all/打包/候选完整性；STG脚本用同次ZIP发布并直接调用数字**版本7**七项通过，无真实Bedrock调用。

```powershell
New-Item -ItemType Directory -Path .local/rollback-drill-stg-review-96861976 -Force
# key从本次STG action outputArtifacts读取。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/S49xu6L --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/S49xu6L --version-id 5X5ipLLdhxFRSGPG__IDFnuyRwJSPC1j --region ap-northeast-1 .local/rollback-drill-stg-review-96861976/report.zip --output json
Get-FileHash -LiteralPath .local/rollback-drill-stg-review-96861976/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead限制唯一report.json，读取后释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-stg --qualifier 7 --region ap-northeast-1 --output json
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id 96861976-0f9e-4a0c-b49e-9c75c0c1762b --region ap-northeast-1 --query 'pipelineExecution.{status:status,version:pipelineVersion,mode:variables}' --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
```

外层SHA **40b5138f10d1fca52f14dfd35e4ddfb7f4e50dd7cfeb3da73934b4b8ee0ff9d4** 匹配CodeBuild artifacts.sha256sum；report schema/kind/passed/七项、execution/source/function/version正确，Release **13d4d232f880fb581fcd890881eaf13be39ff19d02693f7059901a1b40ebf506**、backend SHA **3d765d2a17cc880a99349c47b2355b1cc771b0ea34a20ccb647e5c7140e299b3** 与实际Lambda qualifier7 CodeSha256和审批导出变量相符。原件/report/object/review仅留上述忽略目录。

整体InProgress/version5/ReleaseMode rollback_drill，**ApproveProduction InProgress**；没有运行Green/部署/停止/回滚。live仍5/无权重，公开healthUP。给用户第一道审批链接，明确新96861976/STG7，第一道只验证Green；第二道显示演练模式并授权实际10%后的停止/自动回滚，最终目标恢复演练前Blue。

更新本日志/PROJECT_PLAN.md/docs/rollback-drill.md，diff/path/Gitleaks检查后仅本地提交 `docs: record rollback drill configuration and first approval evidence`、git status --short，不为文档推送触发重复CI。没有改React/Java、没有新增资源或IAM权限、没有代替用户提交任一人工审批。当前只验收到第一道人审，真实自动回滚仍待下一阶段。

## 19. 回滚演练第一道人审后的Green验证（2026-11-12）

用户回复ok后先核对AWS；git status --short干净。设置kong-dev profile、Tokyo region，只读查询：list-action-executions（pipeline kongportfolio-candidate，filter execution96861976-0f9e-4a0c-b49e-9c75c0c1762b，stage/status/external/error摘要）、GetAlias(version/weights)、list-builds-for-project(kongportfolio-green，DESCENDING/max-items1)，随后batch-get-builds。

第一道人审 **Succeeded**，action ID **5d529f28-4e3d-4a88-953d-063b8740343a**；Green构建 **a562a361-a36a-4473-912f-433eafcd198b**，源码8ad190ba366b6967793675098f5df1fab26fd324。初始BUILD/导出空值，约20秒短等待后构建SUCCEEDED；action状态有短暂传播延迟，随后再只读查询已到ApproveTrafficShift。没有重复start-build或start-pipeline。

### 19.1 报告、模式、实际代码与线上快照复核

```powershell
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id 96861976-0f9e-4a0c-b49e-9c75c0c1762b --region ap-northeast-1 --output json
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=96861976-0f9e-4a0c-b49e-9c75c0c1762b --region ap-northeast-1 --output json
& $aws codebuild batch-get-builds --ids kongportfolio-green:a562a361-a36a-4473-912f-433eafcd198b --region ap-northeast-1 --output json
New-Item -ItemType Directory -Path .local/rollback-drill-green-review-96861976 -Force
# 读取本次VerifyGreen outputArtifacts中的bucket/key。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/Ej4gzS9 --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/Ej4gzS9 --version-id nfCEkVO2XklH1GlnAbITLZiRb1Y9Bs.7 --region ap-northeast-1 .local/rollback-drill-green-review-96861976/report.zip --output json
Get-FileHash -LiteralPath .local/rollback-drill-green-review-96861976/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead限唯一report.json，读取后释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-prod --qualifier 6 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
```

GetPipelineExecution确认本次ReleaseMode.resolvedValue=**rollback_drill**。报告外层SHA **8bf99a0cb089e2bc5f05210074bd9a22245859ff8b6d8f4c2a0aa3fbdb381598** 匹配CodeBuild artifacts.sha256sum。schema/kind/passed/liveTrafficUnchanged、function/七项全通过、Blue5/Green6/STG7正确；execution/source/release/backend SHA与已审STG一致；approval1ActionId与AWS成功action ID匹配。Release **13d4d232f880fb581fcd890881eaf13be39ff19d02693f7059901a1b40ebf506**，backend SHA **3d765d2a17cc880a99349c47b2355b1cc771b0ea34a20ccb647e5c7140e299b3** 等于真实Green qualifier6 CodeSha256解码值。三项Gate2导出变量与报告相符；live仍5、RevisionId与报告快照相同、无权重，healthUP。

元数据 `.local/rollback-drill-green-build.json`、actions `.local/rollback-drill-green-actions.json`，下载原件/report/object/review JSON仅在上述ignored目录。Green使用原verify-green脚本CLI序列，STG7/Green6数字版本七项直接调用，无真实Bedrock请求。没有修改生产配置、流量、告警状态或新增资源。

### 19.2 停在第二道人审

ApproveTrafficShift **InProgress**，部署演练尚未执行。向用户明确执行96861976、模式rollback_drill、Blue5/Green6，第二道批准后观察10%即停止、验证CodeDeploy自动回滚并恢复Blue5；不是常规五分钟后全量发布。自动回滚ID、恢复成功与公开API均待实际验收，不把Green通过称为回滚通过。

apply_patch更新本日志、PROJECT_PLAN.md、docs/rollback-drill.md；diff/path/Gitleaks检查后仅本地 `git commit -m 'docs: record rollback drill Green and second approval evidence'`、git status --short。不推送文档触发额外CI，不代理审批，不直接CreateDeployment/UpdateAlias，不重新构建已批准候选。

## 20. 受控停止与自动回滚真实演练（2026-11-12）

用户回复ok后先核对AWS；git status --short干净。使用kong-dev/Tokyo，执行list-action-executions（execution96861976，stage/status/external/error摘要）、deploy list-deployments（app kongportfolio/group production）、CodeBuild list-builds-for-project(kongportfolio-deploy，DESCENDING/max-items1)、GetAlias(version/weights)。第二道ApproveTrafficShift **Succeeded**，用户审阅 ID **8c09ca5c-e22d-466c-bdcc-a5a7c16436f6**；DeployProduction InProgress，初始live5/无权重。

`codebuild batch-get-builds --ids kongportfolio-deploy:8a900c73-0933-494a-90cc-7926500deb82 --region ap-northeast-1 --output json` 返回源码8ad190ba366b6967793675098f5df1fab26fd324、BUILD正在执行deploy-production.mjs。元数据 `.local/rollback-drill-live-build.json`；get-log-events(日志组/aws/codebuild/kongportfolio-deploy、stream8a900c73-0933-494a-90cc-7926500deb82、query events[].message)保存 `.local/rollback-drill-live-build.log`，UTF8环境/控制台设置，只展示运行摘要。

GetPipelineExecution再次确认ReleaseMode.resolvedValue=rollback_drill、整体InProgress。只由经两道审批的控制器执行演练；本机没有代理审批、直接更新别名、重启流水线或手动制造生产错误。

### 20.1 实际停止和AWS自动回滚

约20秒短等待后，deploy list-deployments逐个get-deployment，过滤本次description或带rollbackInfo的记录，保存 `.local/rollback-drill-deployments.json`。观察到：

- 本次Blue5→Blue5基线 **d-CRSIZL0EM Succeeded**；正常的上一版发布revision不是精确Blue5-only哈希，所以控制器先创建可信基线。
- 灰度 **d-2OPWFF0EM Stopped**，配置LambdaCanary10Percent5Minutes，error=MANUAL_STOP/abort request，这是演练受控停止而非应用故障。
- 原灰度rollbackInfo.rollbackDeploymentId=**d-M40WD11EM**；AWS该回滚部署 **Succeeded**，反向rollbackTriggeringDeploymentId=d-2OPWFF0EM。
- 实际GetAlias **live5/无权重**。第一次查询时构建仍在完成恢复验证，未把流量已恢复提前称为整条流水线成功。

刷新batch-get-builds/actions/get-log-events，CodeBuild **8a900c73-0933-494a-90cc-7926500deb82 SUCCEEDED**、源码8ad190b，DeployProduction Succeeded，云日志显示 `CodeDeploy automatic-rollback-verified: d-2OPWFF0EM; final live 5`。新元数据 `.local/rollback-drill-live-build.json`、actions `.local/rollback-drill-final-actions.json`；healthUP。没有本机stop/create-deployment/UpdateAlias；停止与自动恢复来自已审控制器和CodeDeploy。

### 20.2 版本化演练报告与自动回滚关联独立复核

```powershell
New-Item -ItemType Directory -Path .local/rollback-drill-final-review-96861976 -Force
# key从本次DeployProduction.outputArtifacts取得。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/Deployment/kTYEbQo --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/Deployment/kTYEbQo --version-id JuhaOcqjwDh0ti5OqgjT6MOjWt64w4En --region ap-northeast-1 .local/rollback-drill-final-review-96861976/report.zip --output json
Get-FileHash -LiteralPath .local/rollback-drill-final-review-96861976/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead限唯一report.json，读取后释放流。
& $aws deploy get-deployment --deployment-id d-2OPWFF0EM --region ap-northeast-1 --output json
& $aws deploy get-deployment --deployment-id d-M40WD11EM --region ap-northeast-1 --output json
& $aws lambda get-function-configuration --function-name kongportfolio-prod --qualifier 5 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --output json
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id 96861976-0f9e-4a0c-b49e-9c75c0c1762b --region ap-northeast-1 --query 'pipelineExecution.{status:status,version:pipelineVersion,variables:variables}' --output json
```

报告外层SHA **12afd95fc2ce6568adb1f80082fd21f0e8bf245570f89b47ff91b98deb8ad2b3** 匹配CodeBuild artifacts.sha256sum。断言schema/kind/passed=true、mode=rollback_drill、outcome=automatic-rollback-verified、execution/source/release匹配已审Green、Blue5/Green6及原部署ID正确，recovery.requested/verifiedBlue=true、rollbackDeploymentId=d-M40WD11EM。四次观察包含基线Created/Succeeded、canary Created及 **Blue5+Green6权重0.1**。最终恢复证据存recovery，不假称canary为Succeeded。

独立匹配AWS原部署Stopped及其回滚ID、回滚Succeeded及反向触发ID、固定app/group。实际数字版本5 CodeSha256与原稳定上线时的已审报告相同；GetAlias确认live5/空权重。完整回滚元数据 `.local/rollback-drill-success-deployment.json`，下载原件/report/object/review仅在上述ignored目录。整体pipeline **Succeeded**/version5/mode rollback_drill；这是演练成功，不是Green6被全量推广。

### 20.3 附加核验假设纠正及恢复后的公开API

额外本地核验曾直接调用isBlueBaseline，要求**AWS生成的自动回滚revision摘要**与手写Blue5-only基线摘要完全一致，断言失败，HTTP检查尚未发出；这是核验脚本对AWS返回形状的额外假设，不是部署控制器或线上失败。只读get-deployment比较：手写基线摘要274253aa…、自动回滚摘要69c59c67…不同，API不返回原content，不能声称两份文本相同。

继续 `deploy list-deployment-targets --deployment-id d-M40WD11EM` 返回kongportfolio-prod:live，再 `get-deployment-target --deployment-id d-M40WD11EM --target-id kongportfolio-prod:live`，留存 `.local/rollback-drill-success-target.json`：目标与生命周期均Succeeded。该历史lambdaFunctionInfo还显示原current5/target6/targetVersionWeight1，不用于推断实时路由；以实际Lambda GetAlias/live5与不可变版本代码匹配作为当前恢复证据。没有放宽部署控制器的基线校验或修改权限/生产状态，也没有把这条附加断言悄悄说成通过。

重新运行本地PowerShell单引号here-string → `node --input-type=module`：断言实际回滚target的deploymentId/targetId/status，随后循环现有staging-contract.mjs的七项contracts，固定HTTPS域名fetch、redirect=error/30秒超时、status/marker/no-store断言、间隔1200ms。GET health、GET profile?lang=ja/zh/en、POST Bedrock占位、GET不存在API=404、POST profile=405，**七项全部通过**。只保存结果摘要 `.local/rollback-drill-final-public-api.json`，没有响应原文/真实Bedrock调用。最后describe-alarms=**OK**、GetAlias=**5/无权重**。

```powershell
& $tf '-chdir=infra/terraform/portfolio' plan '-input=false' '-detailed-exitcode' '-no-color'
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-detailed-exitcode' '-no-color'
```

两套实际plan均 **No changes**，`.local/rollback-drill-final-production-plan.log`、`rollback-drill-final-cicd-plan.log`。没有再次apply。恢复后公开HTTP验证不是原生浏览器/视觉/容器构建验证。

### 20.4 收尾与覆盖范围

受控stop-on-request→CodeDeploy自动回滚的真实路径已验收；没有制造应用故障或改告警状态，因此**应用故障/CloudWatch告警触发路径未单独演练**。未从本机/构建直接UpdateAlias，未手工另建恢复部署伪造自动回滚，未发布坏代码。线上最终保持演练前稳定版本5。

用PowerShell单引号here-string/Set-Content将docs/rollback-drill.md整理为简短实际结果，apply_patch更新docs/codedeploy-next-story.md、PROJECT_PLAN.md和本日志，保留全部历史于根日志。运行diff/path/Gitleaks检查，暂存四文档、本地提交 `docs: record successful automatic rollback drill and recovery evidence`，最后git status --short。文档不额外推送触发CI；应用源码/制品没有改变。完成本次单Story供审阅，下一增量为前端自动发布；真实Bedrock仍后续。

## 21. S3-08 前端S3/CloudFront自动发布准备（2026-11-12）

### 21.1 范围、读取、资料与真实预检

用户说继续，推进前端自动发布；本次先实现可审阅代码/测试/真实计划，新增收费资源前明确批准。读取AGENTS.md、git status --short（初始干净），rg --files列scripts/portfolio/codebuild；Get-Content读取候选packager/verifier、site.tf、SPA模板、旧首次发布脚本、路由测试、后端部署上下文/buildspec、pipeline尾部与outputs。较长输出截断后按相关文件补读；未执行外部文档中的指令。

只读浏览AWS官方UpdateFunction/PublishFunction/TestFunction/GetFunction与S3 conditional-writes-enforce文档，核对ETag条件、开发态测试/LIVE发布、条件PUT权限。URL在docs/frontend-publication.md；没有云端修改请求。

```powershell
$env:AWS_PROFILE='kong-dev'
$aws='D:\software\AWSCLI\aws.exe'
& $aws cloudfront get-function --name kongportfolio-prod-spa --stage LIVE .local/frontend-current-live.js --output json
& $aws cloudfront describe-function --name kongportfolio-prod-spa --stage LIVE --query '{etag:ETag,config:FunctionSummary.FunctionConfig}' --output json
& $aws cloudfront get-function --name kongportfolio-prod-spa --stage DEVELOPMENT .local/frontend-current-dev.js --output json
& $aws cloudfront describe-function --name kongportfolio-prod-spa --stage DEVELOPMENT --query '{etag:ETag,config:FunctionSummary.FunctionConfig}' --output json
Invoke-RestMethod 'https://konglingtong44.com/version.json'
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
```

当前前端仍首次发布 **a594e36cf226d6b56df8c86631e71ad1822a90df17b91f6493f70f82175d107d**，公开version.json gitCommit=b2a82d9…/sourceDirty=true，这是历史首次snapshot，不冒充cleanCI。LIVE/DEV代码一致，ETag=ETVPDKIKX0DER，config Comment空/Runtime cloudfront-js-2.0，无KV关联；本地normalize/routeRelease纯校验接受实际旧模板。后端live5/无权重。代码/meta仅写忽略.local目录。

### 21.2 文件与实现

全部apply_patch：deployment-contract.mjs将Green证据验证提取requireGreenEvidence，原requireDeploymentContext仍额外校验实际旧别名，后端逻辑未放宽；新增frontend-release.mjs纯上下文/metadata/路由/有恢复状态机、publish-frontend.mjs CLI/HTTP runner、test-frontend-release.mjs；ci.sh接入测试；codebuild/frontend-release.yml输出FrontendReport。

新增CICD frontend-release.tf默认关闭，四资源：独立CodeBuild/角色/policy/七天日志；pipeline增加启动权限/第八阶段（五输入）/Gate2明确前端推广与恢复。只准指定站点releases前缀条件PUT，S3 metadata/checksum HEAD，不能DeleteObject/UpdateDistribution/UpdateAlias/审批。特定CloudFront函数可Get/Describe/Update/Test/Publish，不改分发配置。rollback_drill验证报告后跳过前端，无S3/CloudFront写。

生产site.tf给SPA函数code加ignore_changes，明确管辖交接，Terraform继续runtime/分发/关联；新发布仅允许现有模板中的releaseID变动。开发态/线上ETag快照防并发，先S3完整上传与公开SHA校验，再开发态测试才发布；后验证版本/首页/深链接/health。失败尝试恢复原指向，遇未知并发变更不覆盖。前端恢复不回滚已成功后端。没有覆盖旧key或删除旧发布，不把本方案称CloudFront双环境蓝绿。

新增frontend-release.tftest.hcl三计划；六份既有测试显式enable_frontend_release=false隔离未来本机opt-in，PowerShell Get-Content/正则/Set-Content只补全局测试输入；terraform.tfvars.example补默认false，真实本机输入未开启。更新docs/frontend-publication.md、PROJECT_PLAN.md与根日志，未改React/Java业务源码。

### 21.3 检查与真实计划

```powershell
node scripts/test-frontend-release.mjs
node scripts/test-deployment.mjs
node --check scripts/publish-frontend.mjs
# node --input-type=module调用routeRelease/normalizeCode核对实际LIVE/DEV本机副本。
& $tf '-chdir=infra/terraform/cicd' fmt '-recursive'
& $tf '-chdir=infra/terraform/cicd' validate
& $tf '-chdir=infra/terraform/cicd' test '-no-color'
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-var=enable_frontend_release=true' '-out=frontend-release.tfplan' '-no-color'
& $tf '-chdir=infra/terraform/cicd' show '-json' frontend-release.tfplan
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-detailed-exitcode' '-no-color'
& $tf '-chdir=infra/terraform/portfolio' fmt '-check'
& $tf '-chdir=infra/terraform/portfolio' validate
& $tf '-chdir=infra/terraform/portfolio' test '-no-color'
& $tf '-chdir=infra/terraform/portfolio' plan '-input=false' '-detailed-exitcode' '-no-color'
```

Node上下文/路径/MIME/cache/旧模板/上传顺序/演练跳过/开发态失败/公开验证失败恢复/上传前后并发拒绝均通过，后端部署/回滚纯测试继续通过；实际LIVE/DEV模板副本也通过。CICD **19 mocked plans**、生产**3个域名mocked plans**通过，validate/format通过，无本次测试失败。Mock和本地恢复测试不是实际CloudFront发布/回退成功。

真实启用计划 **4 add/2 change/0 destroy**，JSON断言数量、无delete；新增frontend CodeBuild/role/policy/log，更新candidate pipeline及其启动policy。保存ignored frontend-release.tfplan和`.local/frontend-release-plan.log`。默认关闭No changes（frontend-release-disabled-plan.log）；生产代码所有权交接No changes（frontend-router-handoff-plan.log），均.local。未apply、上传、更新/发布CloudFront函数或启动新候选。

预计新增阶段20次/月×3分钟×(small $0.005+V2 $0.002)约$0.42/月，外加S3/CloudFront请求、版本存储和日志，未扣共享免费额度，非全站总价或封顶；旧版本保留，清理另行审批。价格参考官方链接见文档。创建四资源和CloudFront代码管理交接必须明确批准；实际前后端发布仍由新执行两道人审后进行。

### 21.4 源码发布、AWS CI及前缀构建复核

补齐发布/恢复后的LIVE代码快照断言：公共HTTP检查通过后还需控制面代码等于本次模板；恢复后LIVE/DEV都须等于旧代码，避免只凭单一边缘结果报告成功。对应并发测试通过。清理未用import，没有业务修改。

```powershell
. ./scripts/tools.ps1
node scripts/test-frontend-release.mjs
node scripts/test-deployment.mjs
node scripts/test-cloudfront-routing.mjs
node --check scripts/publish-frontend.mjs
& D:\software\Git\bin\bash.exe -n scripts/ci.sh
node .githooks/check-staged-paths.mjs --all
gitleaks dir --redact --no-banner .
git diff --check
# git add仅本次20个脚本/TF/测试/buildspec/文档文件；私有输入/plan/.local不暂存。
git diff --cached --check
git commit -m 'feat: prepare approved immutable frontend publication and recovery'
git push
git rev-parse HEAD
git status --short
```

提交 **b00264affd26de31c47f349676cd9979791370f4**，扫描dir/暂存/push全历史无泄露，工作区干净，未合并main。推送包含先前本地文档记录，但未启动新候选执行或部署（DetectChanges=false），enable_frontend_release仍未开启。

分别list-builds-for-project取现有CI的最新ID，再batch-get-builds按SHA核对，约40秒短等待后前后端均SUCCEEDED：frontend **21269231-e76d-4ab0-8dce-542b75ff7cca**；backend **07721e9d-78ca-4a11-ae0b-64390d558db2**。get-log-events对应CI日志组/stream保存 `.local/frontend-release-frontend-ci.log`、`frontend-release-backend-ci.log`，确认frontend release纯逻辑测试在AWS Linux通过、前端40 tests/build、后端9+3 tests/ZIP smoke，applicationChecksRan=true。只读GET GitHub commit b00264a `/status`：combined/ci/frontend/ci/backend全success；元数据 `.local/frontend-release-source-ci.json`。

额外只读rg查frontend/src中的/images/、/assets/、BASE_URL/import.meta.env：PixelGarden使用BASE_URL，styles.css含根图片url。初次整行CSS输出太长，随后用rg -n -o只输出匹配片段。为验证Vite会将该public图片转为发布前缀，在frontend工作目录执行：

```powershell
# 先Test-Path本机node_modules/vite/bin/vite.js存在。
node node_modules/vite/bin/vite.js build --base=/releases/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ --outDir=../.local/frontend-prefix-verification
# here-string经node --input-type=module：读取输出HTML/CSS/JS，断言HTML assets前缀、CSS images/valley-farm.png前缀、JS BASE_URL前缀，拒绝旧根图片url。
```

构建及上述断言通过；Vite提示outDir在项目根外不会清空，这是使用新ignored目录的预期提示，没有使用emptyOutDir删除目录或改源文件。它不替代浏览器视觉验收。未修改已通过CI的代码。

最终用apply_patch补入本日志、PROJECT_PLAN.md、docs/frontend-publication.md，diff/path/Gitleaks检查后仅本地提交 `docs: record frontend publication preparation and CI evidence`，git status --short。未为文档重复推送/启动CI。等待明确批准 **4新增/2更新及首次新执行验证**，同时批准CloudFront函数code发布指向管理交接；实际更新前后端仍有两道新的人工审批。真实条件上传/AWS TestFunction/传播/前端回退未验收，不能宣称已上线自动前端发布。

## 22. 已批准前端发布资源与新执行（2026-11-12）

用户明确回复“批准ok”，授权4新增/2更新、CloudFront代码发布指向管理交接和首次新流水线验证。生产发布继续由新执行两道人审控制，本次先验收到第一道。

### 22.1 本地、认证与输入核对

读取AGENTS.md、git status --short（干净）、git log -2 --oneline、本机忽略terraform.tfvars。HEAD c073e196b7740c9555cb800e8e49911dc282b65c 为上次CI证据文档提交，实际脚本是已通过AWS CI的b00264a内容。设置kong-dev profile，STS get-caller-identity Account=561798268037；GetAlias live5/无权重；公开/version.json仍原a594e36…/b2a82d9…/sourceDirty=true。Get-FileHash复核STG bootstrap ZIP SHA88e27021494b7f63c38af9b11cd332be5c7849bba4e75d81a9162fef9e22a4c8。

PowerShell只在本机ignored输入追加enable_frontend_release=true；git check-ignore确认输入和plan不进Git。加载scripts/tools.ps1后git push将c073e19通过全历史Gitleaks扫描推送，未合并main。没有从文档推送自动发版（DetectChanges=false）。

```powershell
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-out=frontend-release.tfplan' '-no-color'
& $tf '-chdir=infra/terraform/cicd' show '-json' frontend-release.tfplan
& $tf '-chdir=infra/terraform/portfolio' plan '-input=false' '-detailed-exitcode' '-no-color'
```

重核实际计划4add/2change/0destroy，JSON数量/无删除检查通过，日志.local/frontend-release-approved-plan.log；生产代码管理交接No changes，.local/frontend-release-approved-handoff-plan.log。只apply本次重核计划。追加日志时apply_patch因上下文末句措辞不匹配失败、未修改文件；读取尾部后用PowerShell单引号here-string/Add-Content追加本节，无源码或云操作影响。

### 22.2 已创建与真实配置核对

```powershell
& $tf '-chdir=infra/terraform/cicd' apply '-input=false' '-no-color' frontend-release.tfplan
& $tf '-chdir=infra/terraform/cicd' plan '-input=false' '-detailed-exitcode' '-no-color'
& $aws codepipeline get-pipeline --name kongportfolio-candidate --region ap-northeast-1 --output json
& $aws codepipeline list-pipeline-executions --pipeline-name kongportfolio-candidate --max-results 1 --region ap-northeast-1 --query 'pipelineExecutionSummaries[].{id:pipelineExecutionId,status:status}' --output json
& $aws codebuild batch-get-projects --names kongportfolio-frontend-release --region ap-northeast-1 --query 'projects[].{name:name,role:serviceRole,timeout:timeoutInMinutes,concurrency:concurrentBuildLimit,buildspec:source.buildspec}' --output json
& $aws iam get-role-policy --role-name kongportfolio-frontend-release-build --policy-name immutable-site-upload-and-reviewed-pointer --query PolicyDocument --output json
```

Apply **4 added/2 changed/0 destroyed**（`.local/frontend-release-apply.log`），后续plan **No changes**（`.local/frontend-release-post-apply-plan.log`）。实际pipeline **version6/QUEUED**、八阶段，PublishFrontend位于两个人审与DeployProduction之后，五输入SourceRef/Candidate/STG/Green/DeploymentReport齐全；ReleaseMode默认deploy。新的CodeBuild实际角色、15min/并发1/buildspec正确。角色policy保存`.local/frontend-release-deployed-role.json`，解析确认无DeleteObject/UpdateDistribution/UpdateAlias/PutApprovalResult，不假称真实上传IAM已验证。

列执行确认配置更新没有自动启动（最近旧96861976 Succeeded）。随后仅一次启动固定新源码正常发布：

```powershell
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=c073e196b7740c9555cb800e8e49911dc282b65c' --variables 'name=ReleaseMode,value=deploy' --region ap-northeast-1 --output json
```

返回ID保存在`.local/frontend-release-execution.json`；显式选择deploy，避免混淆前次rollback_drill。当前没有上传新前端、更新/发布CloudFront代码或新生产部署，先等待本次STG与第一道审批。旧审批不复用。

### 22.3 新执行到第一道人审及独立报告核对

新执行 **2a56d7b1-840e-45b0-8ac4-7b37872cbb4f**。约40/35/20秒短等待，每次list-action-executions按本次execution过滤，保存`.local/frontend-release-actions.json`；get-pipeline-execution读回version6/ReleaseMode.resolvedValue=deploy。Source成功取得固定c073e19，Candidate **bf260a32-51ea-4f6d-8724-ce7cc4507cd0**、STG **6f4f501c-9014-4da8-b33c-acecd4dab600** 均SUCCEEDED；batch-get-builds匹配完整源码SHA，存`.local/frontend-release-candidate-stg.json`。Candidate运行全ci.sh all/打包/完整性，STG用同次候选ZIP发布并直接调用数字**版本8**七项通过（仍是Bedrock占位，无模型调用）。

```powershell
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=2a56d7b1-840e-45b0-8ac4-7b37872cbb4f --region ap-northeast-1 --output json
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id 2a56d7b1-840e-45b0-8ac4-7b37872cbb4f --region ap-northeast-1 --query 'pipelineExecution.{version:pipelineVersion,status:status,variables:variables}' --output json
& $aws codebuild batch-get-builds --ids kongportfolio-candidate:bf260a32-51ea-4f6d-8724-ce7cc4507cd0 kongportfolio-stg:6f4f501c-9014-4da8-b33c-acecd4dab600 --region ap-northeast-1 --output json
New-Item -ItemType Directory -Path .local/frontend-release-stg-review-2a56d7b1 -Force
# bucket/key从本次STG outputArtifacts读出。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/pLjyi9j --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/pLjyi9j --version-id bCmvaxl4suS9r9TWgUQtJj2D863IfO6C --region ap-northeast-1 .local/frontend-release-stg-review-2a56d7b1/report.zip --output json
Get-FileHash -LiteralPath .local/frontend-release-stg-review-2a56d7b1/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead限唯一report.json，读取后释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-stg --qualifier 8 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --query '{version:FunctionVersion,weights:RoutingConfig.AdditionalVersionWeights}' --output json
Invoke-RestMethod 'https://konglingtong44.com/version.json'
Invoke-RestMethod 'https://konglingtong44.com/api/health'
```

报告外层SHA **a8f0dc6cd989406a5d189391e58385fc20a54fbc69a8684bc169fd5302247d1c** 匹配CodeBuild artifacts.sha256sum；schema/kind/passed、execution/source/function/version、七项全通过正确。Release **0dfbd04490393ec56e8c0c554d032167676f068a8fca0d71ce282a5e874b09b2**，backend SHA **e596fcd3bfb1b108dc7b3c823ed7bb3b06aaa4adca1bf67ab4831658c0f63bd2** 等于实际STG8 CodeSha256解码值；Gate1 VERIFIED_RELEASE/VERIFIED_VERSION匹配报告。原件ZIP/report/object/review仅存上述ignored目录。

当前Source/BuildCandidate/VerifyStaging Succeeded，**ApproveProduction / ApproveGreenCreation InProgress**，整体仍InProgress；未自行审批。生产live仍5/无权重、旧前端/version仍a594e36…/sourceDirty=true、healthUP。新前端资源虽已创建，尚无网站上传、CloudFront代码更新或发布。第一道批准只发布/验证Green；第二道才授权正常后端切流及同候选前端发布与必要恢复，明确区别前次rollback_drill。

apply_patch更新本日志、PROJECT_PLAN.md、docs/frontend-publication.md；运行diff/path/Gitleaks检查，暂存三文档、本地提交 `docs: record frontend publication infrastructure and first approval gate`，git status --short。不为文档推送额外CI，不改固定源码/制品，不启动重复执行或代理审批。真实前端上传/IAM/TestFunction/传播/恢复仍待后续阶段验收。

## 23. 前端发布执行的Green验证与第二道人审（2026-11-12）

用户回复ok后，先git status --short（干净），再用kong-dev/Tokyo查询本次execution2a56d7b1的list-action-executions、GetAlias(version/weights)、list-builds-for-project(kongportfolio-green，DESCENDING/max-items1)。第一道审批 **Succeeded**，用户action ID **4df159ca-c99a-410e-8694-b2099516c546**；Green BUILD期间live仍5/无权重。batch-get-builds获取 **fde496b6-5fa5-4ea8-9482-4ca1784b17bf**，固定源码c073e196b7740c9555cb800e8e49911dc282b65c。约20秒短等待后刷新：构建/VerifyGreen Succeeded，**ApproveTrafficShift InProgress**。

### 23.1 独立复核同次GreenReport

```powershell
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id 2a56d7b1-840e-45b0-8ac4-7b37872cbb4f --region ap-northeast-1 --output json
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter pipelineExecutionId=2a56d7b1-840e-45b0-8ac4-7b37872cbb4f --region ap-northeast-1 --output json
& $aws codebuild batch-get-builds --ids kongportfolio-green:fde496b6-5fa5-4ea8-9482-4ca1784b17bf --region ap-northeast-1 --output json
New-Item -ItemType Directory -Path .local/frontend-release-green-review-2a56d7b1 -Force
# key来自本次VerifyGreen outputArtifacts。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/SiDyjMA --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/SiDyjMA --version-id fWUSeIqu3pJUL8tK81Q_XyiOUOvES9w4 --region ap-northeast-1 .local/frontend-release-green-review-2a56d7b1/report.zip --output json
Get-FileHash -LiteralPath .local/frontend-release-green-review-2a56d7b1/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead限制唯一report.json，读取后释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-prod --qualifier 7 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --output json
Invoke-RestMethod 'https://konglingtong44.com/version.json'
Invoke-RestMethod 'https://konglingtong44.com/api/health'
```

GetPipelineExecution确认mode **deploy**，不是回滚演练。外层SHA **18f6039c518f9c25e87af4147d405b74b511c905973019a80361c2b4cd251b1e** 等于CodeBuild artifacts.sha256sum；schema/kind/passed/liveTrafficUnchanged/function、Blue5/Green7/STG8、七项全通过正确；execution/source/release/backend SHA与已审STG一致，approval1ActionId匹配AWS成功actionID。Release **0dfbd04490393ec56e8c0c554d032167676f068a8fca0d71ce282a5e874b09b2**，backend SHA **e596fcd3bfb1b108dc7b3c823ed7bb3b06aaa4adca1bf67ab4831658c0f63bd2** 等于实际Green7 CodeSha256解码值。三项Gate2导出变量与报告一致；live版本5/RevisionId与报告原快照相同、无权重。公开前端仍旧a594e36…/sourceDirty=true、healthUP。

元数据 `.local/frontend-release-green-build.json`、actions `.local/frontend-release-green-actions.json`，ZIP/report/object/review仅在上述ignored目录，不提交原件。Green沿既有verify-green脚本发布并直接验证数字版本7；没有重新打包或触发真实Bedrock，没有手动改流量。

### 23.2 待正常前后端发布审批

当前停第二道 **ApproveTrafficShift / ApproveBlueGreenDeployment**。向用户明确本次正常发布 **mode deploy、Blue5→Green7**；第二道批准会先10%/五分钟→100%后端切流，成功后才上传/验证同候选React并切换CloudFront指向，失败按已审恢复逻辑处理。不是前次stop-at10%的rollback_drill。当前前端发布阶段未执行，不称前端自动上线已验收。

用apply_patch更新本日志、PROJECT_PLAN.md、docs/frontend-publication.md；diff/path/Gitleaks检查，仅本地提交 `docs: record full-stack release Green and second approval gate`、git status --short。没有推送/额外构建/代理审批/CreateDeployment/CloudFront更新或静态上传，固定源码/制品不变。

## 24. 正常后端灰度与React前端实际发布（2026-11-12）

用户回复ok后，先git status --short（干净）、只读AWS核对。kong-dev/Tokyo，list-action-executions过滤execution2a56d7b1、GetAlias(version/weights)、deploy list-deployments(app kongportfolio/group production)、CodeBuild list-builds-for-project(kongportfolio-deploy，DESCENDING/max-items1)。第二道审批 **Succeeded**，用户action ID **3dc7dde5-cea4-47f5-9051-ad423371a883**；DeployProduction InProgress，初始live5/无权重。

batch-get-builds取得部署构建 **b1e6162a-dcfb-4ba1-bcaf-b9e57470d616**，BUILD、固定源码c073e196b7740c9555cb800e8e49911dc282b65c；完整元数据`.local/frontend-release-backend-build.json`。逐个get-deployment过滤本次description，保存`.local/frontend-release-deployments.json`，本次Blue5-only基线 **d-7BY21K2EM Succeeded**，LambdaAllAtOnce，创建15:08:23.940 JST，无错误/回滚。公开HTTPS healthUP。没有本机代理审批或手动发起部署；发布由已审批的同次控制器执行，前端须等后端成功才会运行。

### 24.1 后端10%灰度观察

约40秒短等待后，deploy list/get显示主canary **d-42C5RN2EM InProgress**，配置LambdaCanary10Percent5Minutes，创建15:08:49.506 JST；GetAlias独立读到Blue5/Green7权重0.1，告警OK、healthUP，无错误或rollbackInfo。

再等约40秒，读取该部署/GetAlias/describe-alarms/HTTPS health，用DateTimeOffset计算elapsedSeconds、记录时间/状态/版本/权重/告警/health/error/rollback，ConvertTo-Json -Compress→Add-Content保存`.local/frontend-release-canary-observations.jsonl`。15:11:54.452 JST/已185秒，仍5+7权重10%、告警OK/healthUP，无错误或回滚；这是已实际观察，不将“配置10%”替代真实权重证据。

### 24.2 后端成功，前端开发态测试响应解析失败

约35秒后重复get-deployment/GetAlias/actions：主canary **d-42C5RN2EM Succeeded**，完成15:13:51.930 JST，live **7/无权重**，无错误/rollbackInfo。部署构建b1e6162a最终SUCCEEDED；前端构建 **3363d605-c043-4e17-bb04-dc3d631b0f85** 已启动、源码c073e19。

batch-get-builds/get-log-events保存`.local/frontend-release-live-build.json`、`frontend-release-live-build.log`，初始BUILD无错误。约20秒短等待后，公开/version仍旧a594e36…；只读 `s3api list-objects-v2 --bucket kongportfolio-site-561798268037-ap-northeast-1 --prefix releases/0dfbd04490393ec56e8c0c554d032167676f068a8fca0d71ce282a5e874b09b2/` 显示6文件（HTML/version/favicon/CSS/JS/PNG，约2.4MB）。GetFunction读取DEV/LIVE副本到`.local/frontend-release-observed-*.js`，normalize/routeRelease仍旧指向，未切换。

随后构建 **FAILED**：`JSON.parse(test.FunctionOutput).uri` 得到undefined，期望新release/index.html。阶段已完成条件上传/HEAD元数据与checksum/公开全部文件SHA验证、更新DEVELOPMENT并调用AWS TestFunction，解析校验在发布LIVE前失败。失败构建按框架恢复旧DEVELOPMENT，LIVE旧指向没有改变；不能称整条发布成功。后端版本7成功保留，前端恢复不会回滚后端。

### 24.3 真实TestFunction形状复现、恢复与修复

```powershell
& $aws cloudfront describe-function --name kongportfolio-prod-spa --stage DEVELOPMENT --output json
# PowerShell生成合成GET /事件(.local/frontend-test-event.json)，viewer IP=127.0.0.1/host公开域名，无真实用户数据。
& $aws cloudfront test-function --name kongportfolio-prod-spa --stage DEVELOPMENT --if-match '<刚读回ETag>' --event-object fileb://.local/frontend-test-event.json --output json
& $aws cloudfront get-function --name kongportfolio-prod-spa --stage LIVE .local/frontend-after-failure-live.js --output json
& $aws cloudfront get-function --name kongportfolio-prod-spa --stage DEVELOPMENT .local/frontend-after-failure-dev.js --output json
```

实际FunctionErrorMessage为空，FunctionOutput是 **{"request":{"uri":"/releases/<id>/index.html",...}}**，不是顶层uri；样例存`.local/frontend-test-actual-response.json`。这是测试响应格式解析错误，不是路由执行报错。本机TestFunction仅测试当前开发态，不更新/发布函数或流量。实际LIVE/DEV副本校验相等且仍旧a594e36…，确认前端保持旧发布。

读取失败构建artifacts返回key **kongportfolio-candid/FrontendRe/3kKnLo8**，SHA **b706683675597159500257b2d94633e77e57566c3e5e603d1c81a2e739599423**；head/get精确对象版本、Get-FileHash与CodeBuild SHA匹配，ZipFile限唯一report.json，保存`.local/frontend-release-failure-review-2a56d7b1/`。断言kind frontend-publication、execution正确、passed=false、oldRelease=a594e36…、newRelease=0dfbd044…、**recovery.restoredOld=true**。AWS整体pipeline Failed，live仍7/无权重。该路径验证的是发布前开发态恢复，未验证新LIVE前端上线后的回退。

apply_patch新增纯函数verifyRouterTest，严格检查FunctionErrorMessage及JSON.FunctionOutput.request.uri；runner改用该解析。test-frontend-release.mjs新增真实wrapper fixture、执行错误、错误形状/错误URI负例；运行Node前端/后端发布测试、node --check，再用node --input-type=module回放真实AWS样例，全部通过。没有绕过检查、放宽路由、修改IAM或重新创建资源。

修改三脚本与失败记录文档后扫描/提交推送 `fix: parse wrapped CloudFront TestFunction request output`，再启动固定修复源码的新执行并重新经两道人工审批；不暗中替换旧SourceRef/已批准制品，不复用旧审批。没有新Terraform资源或权限变更，旧前端和新后端保持可用；尚未宣称自动前端上线已验收。

### 24.4 修复提交、CI与新执行

执行`. ./scripts/tools.ps1`、Node前端发布测试、path检查、Gitleaks dir、git diff --check；暂存三个脚本+本日志/PROJECT_PLAN/前端文档，cached diff检查后commit/push、rev-parse/status。固定修复SHA **7a2e1b897848328d112d44e45802849ad52bbd5c**，dir/暂存/push全历史扫描无泄露，未合并main。随后：

```powershell
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=7a2e1b897848328d112d44e45802849ad52bbd5c' --variables 'name=ReleaseMode,value=deploy' --region ap-northeast-1 --output json
```

只启动一次新执行 **5d55596a-4238-4240-bfbf-3e8ae47ee264**，保存`.local/frontend-fixed-execution.json`，当前待新候选/STG与第一道人审。

分别list-builds-for-project/batch-get-builds确认修复源码两项CI均SUCCEEDED：frontend **28a6b7db-b532-431e-bd11-023a8c82cd45**、backend **08189062-ce3a-4003-8c48-0a2e7ab5786c**；元数据`.local/frontend-fix-ci.json`。get-log-events取对应CI组/stream，保存`frontend-fix-frontend-ci.log`、`frontend-fix-backend-ci.log`，确认frontend-release回归测试AWS Linux通过、前端40 tests/build、后端9+3 tests/ZIP smoke，applicationChecksRan=true。只读GET GitHub commit7a2e1b8 `/status`，combined与两个context均success；未手动重启CI。

失败恢复后生产根再执行 `terraform -chdir=infra/terraform/portfolio plan -input=false -detailed-exitcode -no-color`，**No changes**（`.local/frontend-failure-production-plan.log`），未apply。没有因为DEV恢复元数据变化覆盖当前路由，代码管理交接仍符合预期。

### 24.5 修复执行到新第一道人审

两次约40秒短等待，list-action-executions按新execution5d55596a过滤更新`.local/frontend-fixed-actions.json`；Source/Candidate/STG均Succeeded，ApproveProduction InProgress。Candidate **7a6ca25a-0bdb-4856-ba86-e4388b902dbe**、STG **f9e341e0-c091-4272-a70b-456a8311a667** 均SUCCEEDED/源码7a2e1b897848328d112d44e45802849ad52bbd5c，batch-get-builds元数据`.local/frontend-fixed-candidate-stg.json`。Candidate完整ci.sh all/打包通过；STG用同次ZIP发布并直接验证数字**版本9**七项通过。

```powershell
New-Item -ItemType Directory -Path .local/frontend-fixed-stg-review-5d55596a -Force
# key来自本次VerifyStaging outputArtifacts。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/aGgYC1C --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/StagingRep/aGgYC1C --version-id s75SxZtzaK0irwW5ny2DKLcWS5QSs2Xm --region ap-northeast-1 .local/frontend-fixed-stg-review-5d55596a/report.zip --output json
Get-FileHash -LiteralPath .local/frontend-fixed-stg-review-5d55596a/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead限唯一report.json，读取后释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-stg --qualifier 9 --region ap-northeast-1 --output json
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id 5d55596a-4238-4240-bfbf-3e8ae47ee264 --region ap-northeast-1 --query 'pipelineExecution.{status:status,version:pipelineVersion,variables:variables}' --output json
Invoke-RestMethod 'https://konglingtong44.com/api/health'
```

外层SHA **19d74c78e76da87fe93cdbe9e8fe700d29d455ed54b6646b8e2c7421ec7fd48a** 匹配CodeBuild artifacts.sha256sum；schema/kind/passed/execution/source/function/version/七项正确、Gate1导出变量相符。Release **242f8cb4af0a0ff5fed61f8ae9984f2189c8c912af102e9db531afeb1bd7e481**，backend SHA **779731b31559e37896c04bd6bc9076fe237cb7ad5ccc3163bd24f7ac6d598552** 等于实际STG9 CodeSha256解码值。原件/report/object/review仅留上述ignored目录。

整体InProgress/version6/ReleaseMode deploy，停在新第一道人审；线上后端7/无权重、旧前端a594e36…保留且healthUP（前面已独立读回）。没有新网站上传/函数修改/生产切流。提醒用户选**新5d55596a/STG9**，不要重试旧失败执行2a56d7b1；第一道只验证Green，第二道才正常后端/前端发布。

apply_patch更新本日志、PROJECT_PLAN.md、docs/frontend-publication.md，diff/path/Gitleaks检查，仅本地提交 `docs: record CloudFront parser fix and fresh approval evidence`、git status --short。不为文档触发额外CI/发布，没有新增TF/IAM/费用资源、没有代理审批或暗换原制品。前端LIVE新版本发布与发布后恢复仍未验收。

## 25. 修复后Green8验证与第二道人审（2026-11-12）

用户回复ok后先git status --short（干净），kong-dev/Tokyo查询新execution5d55596a的list-action-executions、GetAlias和最新Green构建。第一道审批 **Succeeded**，action ID **054d8f46-5303-4731-a5cf-d8227900a35a**。Green构建 **70d33467-1b3d-46a5-afa5-57b993103e9a** 初始BUILD/导出空值，约20秒短等待后batch-get-builds与actions刷新：**SUCCEEDED**、固定源码7a2e1b897848328d112d44e45802849ad52bbd5c；ApproveTrafficShift InProgress。元数据`.local/frontend-fixed-green-build.json`、actions`.local/frontend-fixed-green-actions.json`。

### 25.1 同次证据、实际版本和前端现状

```powershell
& $aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id 5d55596a-4238-4240-bfbf-3e8ae47ee264 --region ap-northeast-1 --output json
& $aws codebuild batch-get-builds --ids kongportfolio-green:70d33467-1b3d-46a5-afa5-57b993103e9a --region ap-northeast-1 --output json
New-Item -ItemType Directory -Path .local/frontend-fixed-green-review-5d55596a -Force
# key从本次VerifyGreen outputArtifacts读取。
& $aws s3api head-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/UUXxHaW --region ap-northeast-1 --output json
& $aws s3api get-object --bucket kongportfolio-artifacts-561798268037-ap-northeast-1 --key kongportfolio-candid/GreenRepor/UUXxHaW --version-id uHJTd4UdKLLOVs1gsUJ9_b6FYnIQbzl4 --region ap-northeast-1 .local/frontend-fixed-green-review-5d55596a/report.zip --output json
Get-FileHash -LiteralPath .local/frontend-fixed-green-review-5d55596a/report.zip -Algorithm SHA256
# .NET ZipFile.OpenRead限制唯一report.json，读取后释放流。
& $aws lambda get-function-configuration --function-name kongportfolio-prod --qualifier 8 --region ap-northeast-1 --output json
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1 --output json
Invoke-RestMethod 'https://konglingtong44.com/version.json'
Invoke-RestMethod 'https://konglingtong44.com/api/health'
```

GetPipelineExecution确认ReleaseMode=deploy。报告外层SHA **d1d3784977f3982ad2ca1de0624a9d84e89c555af48ad152e697da9c72eb3368** 匹配CodeBuild artifacts.sha256sum；schema/kind/passed/liveTrafficUnchanged、function、Blue7/Green8/STG9及七项正确；execution/source/release/backend SHA与已审STG一致，approval1ActionId匹配AWS成功action。Release **242f8cb4af0a0ff5fed61f8ae9984f2189c8c912af102e9db531afeb1bd7e481**、backend SHA **779731b31559e37896c04bd6bc9076fe237cb7ad5ccc3163bd24f7ac6d598552** 等于实际Green8 CodeSha256。三项Gate2导出变量相符；live仍7、RevisionId与报告原快照一致、无权重，前端仍a594e36…/sourceDirty=true、healthUP。原件/report/object/review仅留上述ignored目录。

没有新网站上传、CloudFront更新/发布或生产切流；Green只发布数字版本并直接测试。当前第二道审批待用户完成，明确新执行5d55596a/**deploy、Blue7→Green8**；批准后后端10%/五分钟→100%，成功后运行修复后的React上传/CloudFront测试/发布。不是rollback_drill，也不是已完成前端上线。

apply_patch更新根日志、PROJECT_PLAN.md、docs/frontend-publication.md，diff/path/Gitleaks校验，仅本地提交 `docs: record fixed full-stack Green and second approval gate`、git status --short。不额外推送/构建、不代批、不重打包候选，没有TF/IAM/资源变更。真实前端LIVE发布与发布后回退仍待验收。
