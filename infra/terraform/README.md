# Terraform State 安全准备（S2-01）

当前根栈：bootstrap、portfolio、cicd、[cost-control](cost-control/README.md)及[bedrock-content](bedrock-content/README.md)，各用独立state key；下文是bootstrap首次创建／迁移记录。费用控制当前已接通四档，维护时必须恢复真实ignored输入，不能用默认false无意撤掉通知；资料根栈仅管理私有S3及指定版本读取权限，不发布应用。完整历史／命令见[操作补录](../../docs/aws-commands-20261114.md)。
范围：东京区域的专用 State bucket。网站、Budget、IAM 角色、ECS 和流水线另作小 Story；本次不创建这些资源。认证沿用本机 SSO，不在配置中保存凭证或绑定个人 profile，AWS CI 将使用角色。

当前状态：2026-11-11 经用户批准已创建并迁移，迁移后 plan 无差异，并发锁验证通过。执行过程见 [执行记录](EXECUTION.md)。本 Story 完成，暂停供用户审核。

## 现在日常使用 / 新机器初始化

现有 `backend.tf` 已启用 S3。首次在新机器拉取仓库时，从模板创建忽略的 `terraform.tfvars` 和 `backend.hcl` 并填写同一目标账号/bucket；本机已有这两个文件，无需覆盖。使用现有 bucket，不要重复 bootstrap。

```powershell
$env:AWS_PROFILE = 'kong-dev'
# SSO 过期时运行 aws sso login --profile kong-dev
Set-Location D:\study\kongPortfolio\infra\terraform\bootstrap
terraform init '-backend-config=backend.hcl' -lockfile=readonly
terraform validate
terraform plan -input=false -lock-timeout=60s
```

验收：fmt/validate 和真实只读 plan 通过；私有 bucket、SSE-S3 加密、Versioning、禁用 ACL、强制 HTTPS；迁移后启用 S3 原生锁；敏感 Terraform 文件被 ignore 和 fail-closed hook 拦截。远程迁移/锁定必须实际执行后才能称已验证。

## 首次创建流程参考（已完成，不要重复执行）

以下记录的是还没有 `backend.tf` 时的初始创建过程。在仓库根目录的 PowerShell 中执行；若 terraform/aws 不在当前 PATH，使用其完整可执行文件路径。不要删除当前 backend 来重新运行此流程。

```powershell
$env:AWS_PROFILE = 'kong-dev'
aws sso login --profile kong-dev
aws sts get-caller-identity --profile kong-dev
Set-Location infra/terraform/bootstrap
Copy-Item terraform.tfvars.example terraform.tfvars
Copy-Item backend.hcl.example backend.hcl
# 将两个本地文件的 <ACCOUNT_ID> 替换为上面核对的目标账号。
terraform init
terraform fmt -check
terraform validate
terraform plan -input=false '-out=bootstrap.tfplan'
```

若本地文件已存在，不要覆盖。检查 plan：预期 6 个 resource 新增，0 修改/删除，均用于同一个 S3 bucket；无 DynamoDB 或客户管理 KMS key。计划和 State 即使未包含密码也禁止提交；`.terraform.lock.hcl` 应提交。

## 仅获明确批准后：创建、验证、迁移

```powershell
terraform apply bootstrap.tfplan
# 用 output 的 bucket 名核对以下 AWS 只读查询：
$stateBucket = terraform output -raw state_bucket_name
aws s3api get-public-access-block --bucket $stateBucket
aws s3api get-bucket-versioning --bucket $stateBucket
aws s3api get-bucket-encryption --bucket $stateBucket
aws s3api get-bucket-ownership-controls --bucket $stateBucket
aws s3api get-bucket-policy --bucket $stateBucket
Copy-Item backend.s3.tf.example backend.tf
terraform init -migrate-state '-backend-config=backend.hcl'
# 确认迁移提示；失败时保留本地 State/备份，勿改用空 State 或 -force-copy。
terraform plan -input=false -lock-timeout=60s
```

迁移后应无变更。核对 S3 中 `bootstrap/terraform.tfstate` 的版本，并通过第二终端并发 plan 验证锁竞争（第一个进程持锁时，第二个应等待或失败）；具体无写入的验证方法见执行记录。本地备份保留在 Git 忽略范围内并妥善备份。`prevent_destroy` 是配置保护，不能阻止控制台删除或移除 resource 配置；不要给此 bucket 设置自动过期规则。

后续网站独立 root 使用同一 bucket、不同 key（如 `portfolio/prod/terraform.tfstate`），继续启用 `encrypt`、`use_lockfile` 和账号限制。部署角色只获指定 State key 的 Get/Put、对应 `.tflock` 的 Get/Put/Delete 和受限 ListBucket；本 Story 不创建角色。

费用：S3 按存储、请求及传输收费；State 通常很小，但 State 和锁的历史版本随操作累积，不承诺免费或账单上限。本次已向用户说明个人项目通常低于 USD 0.10/月的用量估算并获批准；不代表整站费用或费用上限。

依据：[HashiCorp S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3)（原生锁、版本恢复及 IAM 权限）；[AWS S3 定价](https://aws.amazon.com/s3/pricing/)。

## 本次验证（2026-11-11）

- Terraform 1.17.1 / AWS provider 6.72.0；SSO profile `kong-dev` 的 STS 账号与本地输入一致。依赖 lockfile 已生成并保留。
- `init -lockfile=readonly`、`fmt -check`、`validate` 通过；真实账号 `plan` 为 6 add / 0 change / 0 destroy，已保存到忽略的 `bootstrap.tfplan`。
- Hook 测试：27 个强制加入的私有路径被拦截，公开 Terraform 文件/模板/lockfile 可提交，缺失 Gitleaks 时拒绝提交；新增 Terraform 文件 Gitleaks 扫描通过（跳过 provider 二进制）。
- 用户批准后 apply 成功：6 added / 0 changed / 0 destroyed；AWS CLI 核对 Tokyo、四项公开访问阻止、AES256、Versioning、BucketOwnerEnforced 和拒绝 HTTP 的 policy 均符合配置。
- `init -migrate-state` 成功；S3 State 为 12,469 bytes，存在非空版本 ID，AES256 加密；迁移后及锁测试后 plan 均无差异。
- 并发锁验证：持锁期间第二进程 plan 超时返回锁错误；取消第一个进程后 plan 恢复正常，无残留活动 `.tflock`；未写入探针 output。
- 未改应用代码，本 Story 未重跑前后端/容器测试。未 commit/push。Budget 与后续网站资源未创建。
