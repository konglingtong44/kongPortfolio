# AWS 操作记录与复习路线

这是人工整理的操作记录，不是完整终端录屏。前面已完成部分按执行记录重建；本轮开始逐步补记。命令以仓库根目录 `D:\study\kongPortfolio` 为起点，注明不同工作目录。`<...>` 是占位符，不能直接复制执行。含 `apply`、`push`、`start-build` 的命令会产生实际变更或费用，不要为了复习重复运行。

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

## 5. S3-04：获批后创建并验证候选流水线（进行中）

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
