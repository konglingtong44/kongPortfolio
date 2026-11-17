# 02｜State、第一次云端部署和域名

[上一章](01-local.md) · [学习路线](README.md) · [下一章](03-delivery.md)

本章仅用于**新账号中的首次搭建**。已有生产环境从[06](06-operations.md)维护，不能用一个空State重新管理同名资源。下面的apply、上传、域名操作可能收费。

## 1. 先看费用并准备变量

控制台 **Billing and Cost Management → Budgets → Create budget**，可先建立自己的月度费用通知，填写自己的邮箱。预算有统计延迟，不能保证账单停在该金额。04章再接本项目的关停机制。

仓库根目录：

```powershell
. ./.local/learning-context.ps1
# 粘贴01章实际打印的候选目录，不能填历史releaseId。
$ReleaseDir = (Resolve-Path (Read-Host 'First-release candidate完整目录')).Path
$Manifest = Get-Content -Raw -Encoding utf8 "$ReleaseDir/manifest.json" | ConvertFrom-Json
if ($Manifest.kind -ne 'first-release-candidate') { throw '候选类型不正确' }
if ((Get-FileHash "$ReleaseDir/backend.zip" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Manifest.backend.sha256) {
    throw '候选ZIP内容已改变'
}
Set-LearningJson .local/portfolio.learning.tfvars.json @{
    expected_account_id = $AccountId
    release_directory = $ReleaseDir.Replace('\','/')
}
aws lambda get-account-settings --query AccountLimit
```

`manifest`用于确认“准备上传的是哪组文件”。后续的Terraform还会检查前端文件及ZIP摘要。不要把另一次构建的文件混入这个目录。

最后一条查本账号Lambda限制。新账号若无法分配代码要求的预留并发，应在 **Service Quotas → AWS Lambda**核对并申请合适配额；不要直接删除所有并发限制来绕过失败。

## 2. 创建保存Terraform记录的桶

Terraform的State记录配置和AWS资源的对应关系。先创建保存State的S3桶，再把记录迁进去，解决“桶还没有，State存哪里”的问题。

当前仓库的bootstrap已经声明S3 backend，因此新账号不能直接照旧手册在原目录init。先在独立本地目录只复制资源定义：

```powershell
$BootstrapDir = Join-Path $RepoRoot '.local/bootstrap-first'
if (Test-Path "$BootstrapDir/terraform.tfstate") { throw '已存在State，先查明，不重复初始化' }
New-Item -ItemType Directory -Force $BootstrapDir | Out-Null
Copy-Item infra/terraform/bootstrap/main.tf "$BootstrapDir/main.tf"
Set-LearningJson "$BootstrapDir/terraform.tfvars.json" @{
    expected_account_id = $AccountId
    region = 'ap-northeast-1'
    state_bucket_name = $StateBucket
}
terraform "-chdir=$BootstrapDir" init -input=false
terraform "-chdir=$BootstrapDir" validate
terraform "-chdir=$BootstrapDir" plan -input=false '-out=bootstrap.tfplan'
terraform "-chdir=$BootstrapDir" show bootstrap.tfplan
```

预期是一个桶及其公开访问阻止、版本、加密等配置，不是多个桶。核对账号、桶名和新增范围；如果出现删除或不认识的资源，先停。

**确认费用和这份计划后，实际创建：**

```powershell
terraform "-chdir=$BootstrapDir" apply -input=false bootstrap.tfplan
```

控制台 **S3 → 这个State桶 → Permissions／Properties**：公开访问被阻止、版本控制启用、默认加密开启。直接在控制台手建同名桶不会自动进入Terraform State，本路线不用它代替上述创建。

## 3. 将State迁到刚创建的桶

仍用上一步变量，创建实际backend配置：

```powershell
$BootstrapBackend = Join-Path $RepoRoot '.local/bootstrap.backend.hcl'
$BackendText = @"
bucket = "$StateBucket"
key = "bootstrap/terraform.tfstate"
region = "ap-northeast-1"
encrypt = true
use_lockfile = true
allowed_account_ids = ["$AccountId"]
"@
[IO.File]::WriteAllText($BootstrapBackend, $BackendText, $Utf8NoBom)
Copy-Item infra/terraform/bootstrap/backend.s3.tf.example "$BootstrapDir/backend.tf"
terraform "-chdir=$BootstrapDir" init -migrate-state "-backend-config=$BootstrapBackend"
# 阅读迁移提示：把刚才的本地State复制到这个远程桶。
terraform "-chdir=$BootstrapDir" plan -detailed-exitcode
```

`-migrate-state`迁移已有记录，不是创建空记录。最后退出0且No changes才继续；`-detailed-exitcode`的2表示有差异，1是错误。[Terraform迁移说明](https://developer.hashicorp.com/terraform/cli/commands/init)

之后可回到仓库中的正式bootstrap目录使用同一份远程记录：

```powershell
terraform -chdir=infra/terraform/bootstrap init "-backend-config=$BootstrapBackend"
terraform -chdir=infra/terraform/bootstrap plan "-var-file=$BootstrapDir/terraform.tfvars.json"
```

应为No changes。保留 `.local/bootstrap-first` 内的迁移证据，不在另一个State里重新创建同一个桶。不同root使用同一个桶、不同key：

| root | State key |
|---|---|
| bootstrap | bootstrap/terraform.tfstate |
| portfolio | portfolio/prod/terraform.tfstate |
| cicd | cicd/terraform.tfstate |
| cost-control | cost-control/terraform.tfstate |
| bedrock-content | bedrock-content/terraform.tfstate |

## 4. 创建网站资源

根据模板生成网站root的backend文件：

```powershell
$SiteBackend = Join-Path $RepoRoot '.local/portfolio.backend.hcl'
$SiteBackendText = (Get-Content -Raw infra/terraform/portfolio/backend.hcl.example).Replace('<ACCOUNT_ID>', $AccountId)
[IO.File]::WriteAllText($SiteBackend, $SiteBackendText, $Utf8NoBom)
terraform -chdir=infra/terraform/portfolio init "-backend-config=$SiteBackend" -lockfile=readonly
terraform -chdir=infra/terraform/portfolio validate
terraform -chdir=infra/terraform/portfolio plan "-var-file=$RepoRoot/.local/portfolio.learning.tfvars.json" "-out=$RepoRoot/.local/site-first.tfplan"
terraform -chdir=infra/terraform/portfolio show "$RepoRoot/.local/site-first.tfplan"
```

审核的资源应围绕：私有页面S3、CloudFront、API Gateway、Java Lambda、对应日志和IAM；此时没有CodeBuild、知识库、ECS或ALB，Bedrock默认关闭。

当前源码增加了AI专用HTTP路由；历史 `review-first-plan.mjs`／`apply-first-release.ps1` 固定旧23资源范围，**不适用于当前首次初始化**。本章使用标准Terraform保存计划并逐项审核；不为凑旧数量删路由，也不把历史资源数量当新计划批准。维护现有环境更不能用“只允许新增”的首次计划审查。

**审核该具体计划、确认费用后：**

```powershell
terraform -chdir=infra/terraform/portfolio apply -input=false "$RepoRoot/.local/site-first.tfplan"
terraform -chdir=infra/terraform/portfolio output
$CloudFrontUrl = (terraform -chdir=infra/terraform/portfolio output -raw cloudfront_url).Trim()
```

CloudFront需要传播时间；出现输出不代表页面文件已上传。控制台对应：Lambda→Functions→`kongportfolio-prod`，API Gateway→该HTTP API，CloudFront→Distributions，S3→`kongportfolio-site-<自己的账号>-ap-northeast-1`。

## 5. 上传同一组前端文件并验收

```powershell
./scripts/publish-first-release.ps1 -ExpectedAccountId $AccountId -Profile kong-dev -ReleaseDirectory $ReleaseDir
node scripts/smoke-first-deployment.mjs $CloudFrontUrl $Manifest.releaseId
Invoke-RestMethod "$CloudFrontUrl/version.json"
Invoke-RestMethod "$CloudFrontUrl/api/health"
```

上传脚本只上传manifest列出的文件，旧对象不覆盖、不删除；不是 `aws s3 sync --delete`。预期HTTPS页面可打开，version与本次release匹配，health为UP，API错误不会被替换成React首页。AI此时尚未开启。

如果Lambda健康检查报磁盘空间错误，确认配置中的检查路径是可写 `/tmp`，而不是只读部署目录 `/var/task`，不直接关闭健康检查。S3直接访问403通常符合私有桶设计，应通过CloudFront检查。

## 6. 可选：接自己的域名

1. 在域名注册商购买或使用已有域名，先看首年和续费价格。不要重复购买已有域名。
2. AWS **Route 53 → Hosted zones → Create hosted zone**，建立域名的**公有**托管区，记下Zone ID和四条NS；托管区本身可能收费。
3. 到注册商修改该域名的Nameservers为此NS集合，等待公网解析一致。域名注册和DNS托管是两件事。
4. 对已注册、已正确委派的域名，在本章一直使用的完整输入中增加域名配置：

```powershell
$Domain = Read-Host '自己的域名，不含https://'
$ZoneId = Read-Host '刚才的公有Hosted Zone ID'
Resolve-DnsName -Name $Domain -Type NS
# 先确认公网返回的NS与Route 53托管区一致，再准备配置。
Set-LearningJson .local/portfolio.learning.tfvars.json @{
    custom_domain = @{ name = $Domain; hosted_zone_id = $ZoneId }
}
terraform -chdir=infra/terraform/portfolio plan "-var-file=$RepoRoot/.local/portfolio.learning.tfvars.json" "-out=$RepoRoot/.local/domain.tfplan"
terraform -chdir=infra/terraform/portfolio show "$RepoRoot/.local/domain.tfplan"
# 审核只新增证书、验证／网站记录并更新分发和对应桶策略，没有删除后：
terraform -chdir=infra/terraform/portfolio apply -input=false "$RepoRoot/.local/domain.tfplan"
```

这些配置不购买域名、不创建托管区，也不替你改注册商NS；它们为CloudFront配置证书和A／AAAA记录。证书在 `us-east-1`，应用在东京。若使用子域名，查NS时改查托管区的域名；证书DNS验证需要等待，未Issued时先查委派与验证记录。[CloudFront证书要求](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html)

历史 `enable-custom-domain.ps1`读取的是root目录的完整私有输入；本教程把输入放在 `.local` 并逐次传入 `-var-file`，因此这里使用上面的显式命令，避免漏掉账号和候选参数。

鼠标查看：**ACM（切到us-east-1）→证书→Issued**，**Route53→托管区→Records**，**CloudFront→分配→Alternate domain names**。这些页面适合检查；手动另建证书或改分发，不能自动代替Terraform管理。

**完成标准：** 远程State可读；网站HTTPS、版本和健康检查正确；保留本次候选目录、私有输入与State位置。进入[03](03-delivery.md)。
