# S2-04 — 首次 Serverless 部署

当前网站：https://konglingtong44.com 。2026-11-11 完成首次部署，2026-11-12 完成 [域名接入](../../../docs/custom-domain.md)。原 CloudFront 地址仍可用。初次创建命令、修复和验证见 [上线记录](DEPLOYMENT.md)。

当前维护只需运行 `terraform -chdir=infra/terraform/portfolio plan` 检查差异。下方 23-create 计划和 apply 包装属于本次首次创建的历史步骤，**不要重新执行旧 first.tfplan**；后续发布在新 Story 中生成新计划。新机器需保留/取回对应候选 ZIP、manifest 和前端文件，不能把重新构建的不同文件冒充原发布包。

新机器还需恢复同样的本地域名变量：`custom-domain.auto.tfvars.json` 中的 name/hosted_zone_id；默认 null 仅供尚未接域名的新部署。先看 plan，不能把缺少本地参数导致的删除计划当作维护操作。

## 本次资源与费用

| 资源 | Terraform 新增数 | 配置 |
|---|---:|---|
| S3 | 6 | 1 网站 bucket + 公开访问阻止、ACL 禁用、版本控制、AES256、限定 CloudFront 读 releases 的 HTTPS policy |
| CloudFront | 4 | 1 分发、OAC、SPA Function、遵循对象 Cache-Control 的缓存策略；API 不缓存 |
| Lambda | 4 | 1 Java 21 函数、1 live 别名、2 条 API 路由调用权限；1 GB / 28 秒 / reserved concurrency 5，非预置并发 |
| IAM | 2 | 1 Lambda 执行角色 + 只允许写自身日志流的 policy；无 Bedrock/SSM/S3 权限 |
| HTTP API | 5 | API、v2 integration、2 路由、默认 stage；1 请求/秒，burst 5 |
| CloudWatch | 2 | Lambda/API 两个日志组，保留 7 天；不记录 body/query/IP |
| 合计 | **23** | **0 修改、0 删除**；不含服务器、ALB、NAT、数据库、CI/CD、CodeDeploy、Bedrock |

本阶段低流量按 USD 1–3/月预留（约 1,000 次访问、3,000–5,000 API、少量静态数据/日志，含既有 Route 53 zone 的约 USD 0.50/月归属，未新建 zone）。此为预算而非报价，不含税/域名续费；免费额度与账号其他用量共享、流量异常和执行时间会影响费用。完整后续 CI/CD + 短 Bedrock 问答仍以 USD 2–5/月为初期目标，实际运行后复核。节流/并发限制和 Budget 都不是月费封顶。

价格依据：[Lambda](https://aws.amazon.com/lambda/pricing/)、[HTTP API](https://aws.amazon.com/api-gateway/pricing/)、[CloudFront](https://aws.amazon.com/cloudfront/pricing/)、[S3](https://aws.amazon.com/s3/pricing/)、[CloudWatch](https://aws.amazon.com/cloudwatch/pricing/)、[Route 53](https://aws.amazon.com/route53/pricing/)。

## 已执行的准备

仓库根目录：`./scripts/prepare-first-release.ps1`。它运行 Lambda profile 的 3 tests、ZIP-only smoke、前端 TypeScript/40 tests/版本化 Vite 构建以及 12 个 CloudFront 路由测试。产物在忽略的 `.local/releases/<64位源快照SHA256>/`，包含 backend.zip、frontend 和 manifest.json；同 ID 不覆盖。

当前仓库未提交，所以 manifest 标记 `sourceDirty=true`，记录 base Git commit、构建输入的内容哈希和产物哈希。这是为人工审核显式构建的本地候选，不冒充干净 CI release，也没有拿旧的 CI 验证包充当发布包。后续 AWS release 必须固定干净的受信 SHA。生成后只复用此候选，不能修改它或重复覆盖。

已创建忽略的 `backend.hcl`、`terraform.tfvars`：东京、目标账号限制、同一 State bucket 的独立 `portfolio/prod/terraform.tfstate` key，以及候选目录。可从 `.example` 模板在新机器重建本地配置，严禁保存凭证。

```powershell
$env:AWS_PROFILE = 'kong-dev'
terraform '-chdir=infra/terraform/portfolio' init '-backend-config=backend.hcl' -lockfile=readonly
terraform '-chdir=infra/terraform/portfolio' fmt -check
terraform '-chdir=infra/terraform/portfolio' validate
terraform '-chdir=infra/terraform/portfolio' plan -input=false '-out=first.tfplan'
terraform '-chdir=infra/terraform/portfolio' show -json first.tfplan | Set-Content -Encoding utf8 .local/first.tfplan.json
node scripts/review-first-plan.mjs .local/first.tfplan.json
```

本机 Terraform 未进入代理 PATH，实际使用 `D:\software\Terraform\terraform.exe`；provider 6.72.0 从 bootstrap 的已安装缓存复用并用只读 lockfile 校验，后端初始化/validate/真实 plan 均成功。

## 本次获批准后已执行的步骤（历史记录）

```powershell
./scripts/apply-first-release.ps1 -TerraformExecutable D:\software\Terraform\terraform.exe -AwsExecutable D:\software\AWSCLI\aws.exe
# apply 包装先核对账号、保存计划的 23-create 范围、manifest 和所有产物哈希。
# 随后对同一候选执行，填入本地配置所指的目录：
./scripts/publish-first-release.ps1 -ExpectedAccountId '<ACCOUNT_ID>' -ReleaseDirectory '<候选目录>' -AwsExecutable D:\software\AWSCLI\aws.exe
# 用 Terraform output 的 website_url / initial_release_id：
node scripts/smoke-first-deployment.mjs '<CloudFront HTTPS URL>' '<releaseId>'
```

`apply` 创建资源但不会上传前端；两步必须都完成再检查网站。上传前全量校验哈希；PutObject 使用 If-None-Match=* 与 SHA256 checksum；已存在的 key 必须匹配 checksum/MIME/缓存头，否则停止。仅上传 manifest 的 6 个公开文件，不上传源码、日志、State、清单里的源码列表或秘密。不会删旧版本。静态对象由发布流程管理，避免以后 terraform apply 切版本时自动删掉旧文件。

HTTP API 源站 URL 当前也是公开的，限流在 API stage 生效；尚未增加登录或 CloudFront 独占入口验证。Bedrock 仍为 PREPARING。首次部署的 live 别名暂归 Terraform 管；接入 CodeDeploy 前必须交接别名/版本所有权，不能直接让两者同时改。

## 验证与缺口

Terraform fmt/validate、真实计划 23 add / 0 change / 0 destroy 和计划规则审查通过。复制候选并修改 index.html 后，Terraform precondition 拒绝；离线 apply stub 验证再次检查后才会调用 apply。离线上传 stub 验证同文件跳过、6 个 create-only 上传及 checksum、错误账号拒绝。28 项 Git hook、secret scan、脚本语法检查通过。

真实 AWS 函数、HTTP API、CloudFront 路由、静态上传、三语/health/POST/错误响应和缓存头已通过 HTTPS 验收；S3 匿名访问为 403。发现 Lambda 只读 `/var/task` 导致 disk-space health DOWN，通过 Terraform 将检查路径设为 `/tmp`，只更新函数和别名；live 当前版本 2。并移除 OAC 源站多余空 s3_origin_config 以消除永久计划差异。最后 plan 为 No changes。

浏览器视觉验收未完成：Computer Use 因无法可靠识别当前 URL 而停止，未继续界面操作；不能把 HTTPS 冒烟称为浏览器交互/移动端验证。没有真实 Bedrock 调用，CI/CD、蓝绿、自定义域名和告警回滚仍待后续 Story。没有 commit/push。本 Story 完成，暂停供用户审核。
