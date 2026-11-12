# S2-01 执行记录 — 2026-11-11

操作目录：`D:\study\kongPortfolio\infra\terraform\bootstrap`。没有修改 `D:\software\terraform-test`。经用户阅读估价后说“开始”批准本次 State bucket 创建。

## 认证与准备

命令均由 PowerShell 执行。实际使用完整程序路径，因为当前代理进程 PATH 中没有 terraform/aws：

```powershell
$tf = 'D:\software\Terraform\terraform.exe'
$aws = 'D:\software\AWSCLI\aws.exe'
$env:AWS_PROFILE = 'kong-dev'
& $aws sts get-caller-identity --query '{Account:Account}' --output json
```

确认账号与本地 `terraform.tfvars` 目标一致。沿用用户已登录的 SSO 临时凭证，没有创建 Access Key 或修改 IAM。配置使用 `allowed_account_ids` 防止误操作其他账号。

准备了 main.tf、安全 Git 规则、模板以及依赖 lockfile。本地 `terraform.tfvars`、`backend.hcl` 已填写并被 Git 忽略。

```powershell
& $tf init -input=false -lockfile=readonly
& $tf fmt -check
& $tf validate -no-color
& $tf plan -input=false -no-color '-out=bootstrap.tfplan'
```

结果：Terraform 1.17.1 / AWS provider 6.72.0，plan 为 6 add / 0 change / 0 destroy。PowerShell 下 `-out=bootstrap.tfplan` 必须整体加引号，本次已调整文档。

## 创建与核对

重新核对 STS 和保存的计划后执行：

```powershell
& $tf show -no-color bootstrap.tfplan
& $tf apply -input=false -no-color bootstrap.tfplan
$stateBucket = & $tf output -raw state_bucket_name
& $aws s3api get-bucket-location --bucket $stateBucket
& $aws s3api get-public-access-block --bucket $stateBucket
& $aws s3api get-bucket-versioning --bucket $stateBucket
& $aws s3api get-bucket-encryption --bucket $stateBucket
& $aws s3api get-bucket-ownership-controls --bucket $stateBucket
& $aws s3api get-bucket-policy --bucket $stateBucket --query Policy --output text
```

新增的是一个 bucket，以及 public access block、ownership controls、versioning、encryption、bucket policy 五项配置。全部创建成功；检查值分别为 Tokyo、四项 true、Enabled、AES256、BucketOwnerEnforced、DenyInsecureTransport。没有创建网站基础设施、DynamoDB 或客户管理 KMS key。

## 迁移 State

新增 `backend.tf`，以忽略的 `backend.hcl` 提供 bucket、key、region、encrypt、use_lockfile 和账号限制。第一次创建 bucket 必须先用本地 State，因为远程 backend 无法在 bucket 存在前使用。

```powershell
'yes' | & $tf init -migrate-state '-backend-config=backend.hcl' -no-color
& $tf plan -input=false -no-color -detailed-exitcode -lock-timeout=10s
& $aws s3api head-object --bucket $stateBucket --key bootstrap/terraform.tfstate
& $aws s3api list-object-versions --bucket $stateBucket --prefix bootstrap/terraform.tfstate
```

迁移明确复制已有 State，没有用空 State 或 `-force-copy`。plan 返回 0 / No changes；远程对象 12,469 bytes，AES256，有版本 ID。本地 State 备份保留在忽略范围内。

## 锁竞争测试与清理

最初尝试 `terraform console` 持锁，但该运行下没有观察到 S3 活动锁，因此没有以此认定锁验证通过。

改用临时 `lock-probe.tf` 定义一个常量 output。第一终端运行 `terraform apply -refresh-only -no-color`，停在确认提示，不输入 yes；这时它持有 State 锁。第二终端运行：

```powershell
& $tf plan -input=false -no-color -lock-timeout=3s
& $aws s3api head-object --bucket $stateBucket --key bootstrap/terraform.tfstate.tflock
```

第二进程按预期退出 1，返回 `Error acquiring the state lock` 和 S3 412；锁对象存在且加密。第一终端输入 `no` 取消，删除临时探针文件后再运行 plan，退出 0 / No changes。列举对象确认只有活动 State，没有残留活动锁。未使用 `-lock=false` 或 force-unlock，未持久化探针 output。

## 本地安全验证与边界

`node scripts/test-hooks.mjs` 通过：27 个强制加入的私有路径被拒绝，公开 Terraform 文件和 lockfile 可提交，缺失 Gitleaks 时拒绝提交。Gitleaks 扫描通过（以 2 MB 单文件上限跳过 provider 二进制）；`git diff --check` 通过。State、计划、tfvars、backend 本地输入与 provider 目录均被 Git 忽略。

没有 commit/push，没有运行前后端或容器测试（本次不改应用）。Budget 尚未创建。下一个 Story 再审核网站资源与费用；本次暂停供用户复核。
