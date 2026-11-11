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
