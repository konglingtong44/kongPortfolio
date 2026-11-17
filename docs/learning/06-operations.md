# 06｜日常发布、控制台路径和排错

[上一章](05-ai.md) · [学习路线](README.md)

这章用于**已有环境**。日常修改React、Java、页面资料，不重新创建State、域名、连接或流水线。新机器先恢复原有私有配置和State位置，不能只填默认值就apply。

## 1. 先确认起点

仓库根目录：

```powershell
. ./.local/learning-context.ps1
git status --short
aws lambda get-alias --function-name kongportfolio-prod --name live --query '{Version:FunctionVersion,Weights:RoutingConfig.AdditionalVersionWeights}'
aws codepipeline list-pipeline-executions --pipeline-name kongportfolio-candidate --max-results 5
```

记录当前线上版本，检查是否已有进行中或等待审批的执行。维护现有账号时恢复完整的ignored tfvars、auto.tfvars、backend和初始候选；不能用本教程的新账号JSON覆盖它们，否则默认false可能提议删除已启用服务。

## 2. 改代码，检查，推送

```powershell
# 先Ctrl+C停止本地开发服务，避免Windows文件锁影响npm ci。
# 完整本地检查；其中Docker存在时只校验Compose配置，不代表镜像已构建。
./scripts/check.ps1
git diff --check
git status --short
# 审查diff，明确git add本次文件，然后commit。
git push origin feat/aws-serverless-ci
$Commit = (git rev-parse HEAD).Trim()
```

本机只准备源码和证据，正式CI/CD仍在AWS。仅更新笔记也要明确选择文件，不把私有资料一起提交。记录本次完整40位SHA；后来的纯文档提交与正在发布的固定源码可以不同，不能因此换掉候选。

控制台 **CodeBuild → Build projects → 两个ci项目 → Build history → 本次构建**，核对Source version与 `$Commit`。GitHub对应提交的Checks也应通过。只看最新一行不够，可能有人又推了新提交。

## 3. 固定提交启动一次发布

**以下会运行真实构建和可能的AI验收，产生费用。** 两个CI通过后：

```powershell
$SourceRevision = "actionName=GitHub,revisionType=COMMIT_ID,revisionValue=$Commit"
$ExecutionId = (aws codepipeline start-pipeline-execution `
    --name kongportfolio-candidate `
    --source-revisions $SourceRevision `
    --variables 'name=ReleaseMode,value=deploy' `
    --query pipelineExecutionId --output text).Trim()
if ($LASTEXITCODE -ne 0) { throw '没有成功启动，不能猜执行ID' }
$ExecutionId
```

反引号是PowerShell续行符，后面不要留空格。`deploy`是正常发布；`rollback_drill`是会影响实际请求的演练，不在日常发布中随意使用。

鼠标路径：**CodePipeline → kongportfolio-candidate → 开始执行／Release change**。若当前界面支持源版本覆盖，选GitHub源、填完整Commit ID并选执行模式；如果只能发“最新”，则不能替代上面固定提交的命令。[源版本覆盖](https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-trigger-source-overrides.html)

记住返回的Execution ID，之后所有报告和审批都只看这次：

```powershell
aws codepipeline get-pipeline-execution --pipeline-name kongportfolio-candidate --pipeline-execution-id $ExecutionId --query 'pipelineExecution.{Status:status,Source:artifactRevisions}'
aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter "pipelineExecutionId=$ExecutionId" --query 'actionExecutionDetails[].{Stage:stageName,Action:actionName,Status:status,Result:output.executionResult}'
```

`Succeeded`是该阶段完成，`InProgress`可能是在构建、等限流窗口、等人工审批或等部署传播；不能只凭这个词判断卡死。

## 4. 两次人工审批怎么点

AWS控制台切东京 → **CodePipeline → kongportfolio-candidate → Execution history → 选择本次Execution ID**。

| 阶段／Action | 点击顺序 | 批准前看什么 | 批准后允许什么 |
|---|---|---|---|
| ApproveProduction／ApproveGreenCreation | Review／审阅 → 填审核说明 → Approve／批准 → Submit／提交 | 本次SHA、STG报告、候选release一致，检查passed | 创建并验证生产新版Green |
| ApproveTrafficShift／ApproveBlueGreenDeployment | 同上 | 同次Green报告、Blue／Green版本、源码、执行模式、冷请求结果 | 新版接用户请求，随后发布同候选前端 |

不满意时选Reject并写原因。第一次通过不是第二次也获准；测试绿色不是人审自动通过。审批来自仓库的[两道生产审批约定](../../AGENTS.md)，不靠手改Lambda别名绕过。

`VerifyStaging`启用AI后，前6次调用后会等约70秒限流窗口再跑自然问法，这是脚本设计。CodeDeploy的10%观察还要5分钟，CloudFront发布另有传播时间。

## 5. 怎么看报告，而不是只看绿色

控制台选择阶段的输出制品链接，进入制品S3，下载该次报告ZIP查看 `report.json`。不要从S3列表随便挑一个名字相近的旧报告。

下面演示CLI读取STG报告，只读取ZIP中唯一的report.json，不解压任意路径：

```powershell
$Actions = aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter "pipelineExecutionId=$ExecutionId" | ConvertFrom-Json
$StgAction = $Actions.actionExecutionDetails | Where-Object { $_.stageName -eq 'VerifyStaging' -and $_.status -eq 'Succeeded' } | Select-Object -First 1
if (-not $StgAction) { throw '本次STG尚未成功' }
$Location = $StgAction.output.outputArtifacts[0].s3location
$ReportZip = Join-Path $RepoRoot '.local/stg-report.zip'
aws s3 cp "s3://$($Location.bucket)/$($Location.key)" $ReportZip
if ($LASTEXITCODE -ne 0) { throw '下载失败' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$Zip = [IO.Compression.ZipFile]::OpenRead($ReportZip)
try {
    if ($Zip.Entries.Count -ne 1 -or $Zip.Entries[0].FullName -ne 'report.json') { throw '报告内容不符合预期' }
    $Reader = [IO.StreamReader]::new($Zip.Entries[0].Open())
    try { $Report = $Reader.ReadToEnd() | ConvertFrom-Json } finally { $Reader.Dispose() }
} finally { $Zip.Dispose() }
if (-not $Report.passed -or $Report.gitCommit -ne $Commit -or $Report.pipelineExecutionId -ne $ExecutionId) {
    throw '报告不是本次候选或未通过'
}
$Report | Select-Object passed,gitCommit,pipelineExecutionId,releaseId,functionVersion
```

Green、部署、前端报告也从各自的同次输出制品读取。字段随报告类型不同：Green有新旧版本，部署有deploymentId与outcome，前端有公开文件与路由验证；不要用一个报告替代全部阶段证据。

## 6. 上线后验收

```powershell
$WebsiteUrl = (terraform -chdir=infra/terraform/portfolio output -raw website_url).Trim()
$Version = Invoke-RestMethod "$WebsiteUrl/version.json"
if ($Version.gitCommit -ne $Commit -or $Version.releaseId -ne $Report.releaseId) { throw '公网前端不是本次候选' }
Invoke-RestMethod "$WebsiteUrl/api/health"
aws lambda get-alias --function-name kongportfolio-prod --name live --query '{Version:FunctionVersion,Weights:RoutingConfig.AdditionalVersionWeights}'
```

完成后live应指向通过Green验证的版本、没有附加流量权重，health应UP；在浏览器实际查看页面、项目弹窗及本次修改。测试AI时限定问题和次数，记录usage，不为了验收反复点击生成。

**health只证明基本存活，不证明所有功能正确。** 保存本次SHA、执行ID、release、生产版本、检查结果与未覆盖项。版本号可以跳，不要求和教材的26相同。

## 7. 失败时去哪里

| 失败位置 | 控制台点击路径 | 优先核对 |
|---|---|---|
| Source | Pipeline本次执行→Source详情；Connections | 分支／SHA／仓库授权是否正确 |
| BuildCandidate | 阶段详情→CodeBuild→Build details／Logs | 测试失败、秘密扫描、依赖、候选文件校验 |
| VerifyStaging | CodeBuild的STG构建→Logs；输出报告 | `failedCheck`、HTTP状态、资料权限、模型输出、限流窗口 |
| VerifyGreen | Green构建日志／报告；Lambda新版本 | 第一审批是否属于本次、角色与资料参数是否匹配、冷请求预算 |
| DeployProduction | CodeDeploy→Applications→kongportfolio→production→本次Deployment | 告警、部署状态、新旧版本、关联回滚 |
| PublishFrontend | 前端发布构建日志；CloudFront→Functions | 文件校验、并发配置变化、测试态路由、公网版本 |
| 看似全成功但页面旧 | 公网version.json、浏览器网络面板 | 是旧标签页缓存，还是不同release／没有完成前端阶段 |

CLI日志查询示例，ID来自本次action结果，不猜：

```powershell
$BuildId = Read-Host '失败阶段的完整CodeBuild ID'
aws codebuild batch-get-builds --ids $BuildId --query 'builds[0].{Status:buildStatus,Phase:currentPhase,Errors:phases[].contexts,Logs:logs}'
# 日志组和stream来自上条响应：
$Group = Read-Host 'logs.groupName'
$Stream = Read-Host 'logs.streamName'
aws logs get-log-events --log-group-name $Group --log-stream-name $Stream --start-from-head
```

不把问答、履历、凭证正文复制到公开日志。仓库的失败报告只保存安全检查名和token指标。已经发生的失败样本保留；修源码后形成新候选，不循环重试直到偶然成功。

## 8. 真实故障复习：中文回答变成日语

生产26之前，STG32在 `requirements-typo-zh` 失败：构建与接口通过，但AI用日语回答了中文问题。调查顺序是SSO恢复→按执行ID取日志／安全报告→隔离STG有限复现→修复→本地与真实模型检查→新候选→STG33→两次人审→生产26。

修复在请求前后明确回答语言，并由Java拦截中文中的日语假名；保留原验收断言、不自动二次付费调用、不改个人资料来凑答案。[完整记录](../history/releases/bedrock-staging-language-fix.md)

## 9. 怎么恢复

| 时机 | 做法 |
|---|---|
| 构建／STG／Green未通过，或审批被拒 | 阻断后续，访客继续访问原版本；查明后新建候选 |
| 仍在CodeDeploy部署中 | 确认本次部署ID，在CodeDeploy选择 **Stop and roll back deployment**；只停CodePipeline不保证流量恢复 |
| 发布和观察脚本已退出，后端才出错 | 从已知正常源码发一次新候选，仍走两道人审；不能Stop一个早已成功的旧部署来倒退 |
| 前端发布后出错 | 核对保留的旧页面目录，按当前路由版本恢复并测试；前端恢复不等于后端也恢复 |
| 费用达到关停条件 | 用04章控制器处理，不把停站当成版本回滚 |

真实回滚和恢复可能中断服务，先安排窗口。已验证的是受控停止后的自动回滚；应用异常、告警和前端上线后恢复仍需单独实演。详细条件见[恢复图说明](../architecture/recovery-map.md)。

## 10. 维护基础设施与资料

只有修改基础设施时才plan／apply。恢复全部私有输入、原State和保留的初始候选后，先fmt／validate／测试，再保存计划、逐项审查。尤其检查默认false是否会删除已启用服务。

资料更新单独走bedrock-content：保留仍被live／回滚版本使用的VersionId，审核新文本、上传、取得新版本和摘要，再更新STG与生产配置，通过新的候选发布。不要删除旧对象或把读取改成任意最新版来避开校验。

备份和删除是另一项操作。State桶、资料桶及部分资源带防删保护；不把 `terraform destroy` 当“暂停费用”的按钮。要清理时先按资源清单说明影响，再单独计划和批准。
