# 03｜把测试与发布放到AWS

[上一章](02-first-site.md) · [学习路线](README.md) · [下一章](04-cost-control.md)

目标：推送触发自动检查；生产发布人工选提交，并经过两道审批。CI负责检查，CD负责交付与部署。所有构建在AWS运行，不增加GitHub Actions。

## 1. 先把仓库改成你自己的

新账号读者在编辑器的全局搜索中，将 **`infra/terraform/cicd` 文件夹内**的 `konglingtong44/kongPortfolio` 替换为自己的 `OWNER/kongPortfolio`，包含其中的测试文件。它不只出现在源码地址，也出现在IAM连接权限限制中，漏改会授权失败。项目拥有者维护原仓库时不替换。

```powershell
# 仓库根目录；加载00章上下文。
. ./.local/learning-context.ps1
$GitHubUser = Read-Host '实际推送代码的GitHub用户名'
$ActorId = [string](Invoke-RestMethod "https://api.github.com/users/$GitHubUser").id
$CicdInput = Join-Path $RepoRoot '.local/cicd.learning.tfvars.json'
Set-LearningJson $CicdInput @{
    expected_account_id = $AccountId
    github_actor_id = $ActorId
    candidate_source_branch = 'feat/aws-serverless-ci'
}
$CicdBackend = Join-Path $RepoRoot '.local/cicd.backend.hcl'
$text = (Get-Content -Raw infra/terraform/cicd/backend.hcl.example).Replace('<ACCOUNT_ID>', $AccountId)
[IO.File]::WriteAllText($CicdBackend, $text, $Utf8NoBom)
terraform -chdir=infra/terraform/cicd init "-backend-config=$CicdBackend" -lockfile=readonly
terraform -chdir=infra/terraform/cicd validate
```

这里的数字是GitHub用户ID，不是AWS账号。个人Fork通常由自己推送；组织仓库的OWNER和实际推送人可能不同，不能直接把组织ID填给actor限制。

## 2. 创建连接，再用鼠标授权

首次默认所有可选服务关闭，先只计划GitHub连接：

```powershell
terraform -chdir=infra/terraform/cicd plan "-var-file=$CicdInput" "-out=$RepoRoot/.local/connection.tfplan"
terraform -chdir=infra/terraform/cicd show "$RepoRoot/.local/connection.tfplan"
# 核对只新增预期连接、确认后执行付费／云端写入计划。
terraform -chdir=infra/terraform/cicd apply -input=false "$RepoRoot/.local/connection.tfplan"
$ConnectionArn = (terraform -chdir=infra/terraform/cicd output -raw connection_arn).Trim()
```

初建常显示 `PENDING`，因为Terraform不能替你同意GitHub授权：

1. AWS控制台切东京 → **Developer Tools → Settings → Connections**。
2. 选择 `kongportfolio-github` → **Update pending connection／更新待处理连接**。
3. **Install a new app／安装应用**，登录GitHub，选择正确的个人／组织所有者。
4. GitHub的仓库权限选择 **Only select repositories**，仅选自己的本项目仓库，完成授权。
5. 回AWS完成连接，看到 **AVAILABLE**。

```powershell
./scripts/check-source-connection.ps1 -ExpectedAccountId $AccountId -Profile kong-dev -ConnectionArn $ConnectionArn
```

此检查只读；AVAILABLE不代表代码一定能构建，下一步才验证。[AWS连接说明](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-create.html)

## 3. 建立两个CI项目和自动触发

```powershell
Set-LearningJson $CicdInput @{ enable_ci = $true }
terraform -chdir=infra/terraform/cicd plan "-var-file=$CicdInput" "-out=$RepoRoot/.local/ci.tfplan"
terraform -chdir=infra/terraform/cicd show "$RepoRoot/.local/ci.tfplan"
# 审核CodeBuild、日志、角色和权限后才apply；构建按使用收费。
terraform -chdir=infra/terraform/cicd apply -input=false "$RepoRoot/.local/ci.tfplan"
```

会建立 `kongportfolio-ci-frontend`、`kongportfolio-ci-backend`。先在控制台 **CodeBuild → Build projects → 项目 → Start build**，指定这次Git提交，确认能拉代码并构建。

再开启GitHub通知：

```powershell
Set-LearningJson $CicdInput @{ enable_ci_webhooks = $true }
terraform -chdir=infra/terraform/cicd plan "-var-file=$CicdInput" "-out=$RepoRoot/.local/webhooks.tfplan"
terraform -chdir=infra/terraform/cicd show "$RepoRoot/.local/webhooks.tfplan"
# 审核只包含本次预期变更后：
terraform -chdir=infra/terraform/cicd apply -input=false "$RepoRoot/.local/webhooks.tfplan"
```

此前所有true开关都保留在同一个JSON中，不能用只含一个新开关的文件替换完整输入。推送当前代码后，在GitHub提交页面看检查结果，在AWS看相同提交的构建。

```powershell
git status --short
# 审查并明确暂存自己改的源码，提交后：
git push origin feat/aws-serverless-ci
$Commit = (git rev-parse HEAD).Trim()
aws codebuild list-builds-for-project --project-name kongportfolio-ci-backend --sort-order DESCENDING --query 'ids[:5]'
# 从输出选本次ID，前端项目也同样检查。
$BuildId = Read-Host '本次完整CodeBuild构建ID'
aws codebuild batch-get-builds --ids $BuildId --query 'builds[0].{Status:buildStatus,Source:resolvedSourceVersion}'
```

必须是本次 `$Commit` 且SUCCEEDED，不是看到列表里某个绿色旧构建就继续。前端无变化时CI可能只运行公共检查，这是脚本的有意行为。

## 4. 建立完整候选发布链

先将生产版本管理交给流水线。02章已有live别名，才能开启这个设置：

```powershell
Set-LearningJson .local/portfolio.learning.tfvars.json @{ pipeline_owns_lambda_versions = $true }
terraform -chdir=infra/terraform/portfolio plan "-var-file=$RepoRoot/.local/portfolio.learning.tfvars.json" "-out=$RepoRoot/.local/version-handoff.tfplan"
terraform -chdir=infra/terraform/portfolio show "$RepoRoot/.local/version-handoff.tfplan"
# 不应换掉线上live的版本／流量；确认后apply。
terraform -chdir=infra/terraform/portfolio apply -input=false "$RepoRoot/.local/version-handoff.tfplan"
```

这不等于发版。Terraform管理运行配置，流水线发布Java版本，CodeDeploy切流；否则配置管理可能把应用发布状态倒退。

新终端需重新取02章的 `$ReleaseDir` 和 `$Manifest`；这是保留的、校验过的首次候选，不是测试fixture ZIP：

```powershell
$ReleaseDir = (Resolve-Path (Read-Host '02章保留的首次候选完整目录')).Path
$Manifest = Get-Content -Raw -Encoding utf8 "$ReleaseDir/manifest.json" | ConvertFrom-Json
Set-LearningJson $CicdInput @{
    enable_candidate_pipeline = $true
    enable_staging = $true
    staging_bootstrap_zip = "$ReleaseDir/backend.zip".Replace('\','/')
    staging_bootstrap_sha256 = $Manifest.backend.sha256
    enable_green = $true
    enable_deployment = $true
    enable_frontend_release = $true
}
terraform -chdir=infra/terraform/cicd plan "-var-file=$CicdInput" "-out=$RepoRoot/.local/delivery.tfplan"
terraform -chdir=infra/terraform/cicd show "$RepoRoot/.local/delivery.tfplan"
# 确认新增流水线、制品桶、STG、验证／发布项目、角色、日志及部署告警范围后：
terraform -chdir=infra/terraform/cicd apply -input=false "$RepoRoot/.local/delivery.tfplan"
```

如果希望分阶段理解，可以依次开启candidate、staging、green、deployment、frontend_release，每次保存、审查、apply自己的计划；保留已经启用的前置开关。上述完整配置也保留两道审批，不会省略人审。

| AWS阶段 | 实际工作 |
|---|---|
| Source | 拉取选定的Git提交 |
| BuildCandidate | 完整检查，构建一次前后端文件，存到制品S3 |
| VerifyStaging | 在独立测试Lambda检查接口，启用AI后也检查真实问答 |
| ApproveProduction | 人工允许创建并验证生产新版 |
| VerifyGreen | 直接调用生产新版；访客还使用旧版 |
| ApproveTrafficShift | 人工允许真正切流和对应页面发布 |
| DeployProduction | 新版先10%请求，观察5分钟，再全量 |
| PublishFrontend | 核对同一候选，上传页面并切换分发目录 |

`Blue`是本次旧版，`Green`是新版，不是两台固定服务器。构建结果、测试结果、批准和部署须属于同一次执行。

## 5. 用一次真实发布验收

创建流水线后先查是否已有自动产生的初次执行，避免重复启动：

```powershell
aws codepipeline list-pipeline-executions --pipeline-name kongportfolio-candidate --max-results 5
```

之后按[06章的固定提交与审批步骤](06-operations.md)完成一次普通发布。开启AI前，空POST仍是PREPARING，属于正常占位；AI在05章接通后才要求真实回答。

**完成标准：** CI能处理本次push；一次执行经过全部阶段、两个人审均完成；最终版本、健康状态及前端来源一致。仅创建了项目或只通过STG，不算生产发布完成。

## 控制台可以代替哪些动作

授权连接、查看构建、查看制品、审阅并批准都可以在控制台完成。资源创建按Terraform保持一致；不要在Lambda手动“上传ZIP”、改live别名或在S3随便覆盖文件来代替流水线。发生权限错误先检查连接授权和限定的仓库，不直接把策略改成全资源管理员。
