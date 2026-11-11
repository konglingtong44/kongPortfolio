# S2-04 上线记录 — 2026-11-11

网站：https://d4htln25bw5g5.cloudfront.net

CloudFront：`E2NYEXSOAQ1TWE`（Deployed）；Lambda：`kongportfolio-prod:live` → version `2`；区域：东京。HTTP API：`https://7fiaa91yq2.execute-api.ap-northeast-1.amazonaws.com`。State key：`portfolio/prod/terraform.tfstate`，与 bootstrap 分离。

## 已执行

用户对 23 项具体计划和 USD 1–3/月预算估算回复“合理 来吧”后执行。PowerShell 工作目录为仓库根目录：

```powershell
node scripts/review-first-plan.mjs .local/first.tfplan.json
./scripts/apply-first-release.ps1 -TerraformExecutable D:\software\Terraform\terraform.exe -AwsExecutable D:\software\AWSCLI\aws.exe
# 使用保存计划内的账号和候选目录执行 publish-first-release.ps1。
# 发布前重新 Gitleaks 扫描；只上传 manifest 中的六个公开文件。
node scripts/smoke-first-deployment.mjs https://d4htln25bw5g5.cloudfront.net a594e36cf226d6b56df8c86631e71ad1822a90df17b91f6493f70f82175d107d
```

Apply：23 added / 0 changed / 0 destroyed。CloudFront 约 2 分 37 秒完成分发创建。六个前端对象用 SHA256 + If-None-Match=* 上传；重复运行上传只核验并跳过，没有覆盖。AWS 返回的 Lambda CodeSha256 与审批候选 ZIP 相同。

候选源快照：`a594e36cf226d6b56df8c86631e71ad1822a90df17b91f6493f70f82175d107d`。清单 SHA256：`dd3d9c55c03250605e242cf65f6eff09f3660775c4927f987cbeb11a8b887b1d`。这是已审核的未提交本地快照，`sourceDirty=true`；没有宣称为干净 CI release。

## 线上发现与修复

首次 health 为 503/DOWN。CloudWatch 明确记录 `DiskSpaceHealthIndicator` 检查 `/var/task/.`，available 0，threshold 10 MB。该部署目录只读，改为环境变量 `MANAGEMENT_HEALTH_DISKSPACE_PATH=/tmp`，保留真实磁盘健康检查，不直接禁用它。[Spring 配置](https://docs.spring.io/spring-boot/appendix/application-properties/index.html)、[Lambda /tmp](https://docs.aws.amazon.com/lambda/latest/dg/configuration-ephemeral-storage.html)

同时发现空 `s3_origin_config` 与 OAC 源站返回值不一致造成计划永久差异；去掉多余空块，无需修改云资源。重新生成 health-fix.tfplan，验证**只有 Lambda 函数和 live 别名两项 update**后执行：0 added / 2 changed / 0 destroyed，live 发布为 version 2。ZIP 与前端保持原候选。没有增加资源、吞吐配置或 IAM 权限。

最后运行 `terraform -chdir=infra/terraform/portfolio plan -input=false -detailed-exitcode`：退出 0，No changes。

## 验收结果

| 检查 | 结果 |
|---|---|
| CloudFront HTTPS 首页、JS/CSS/favicon、version.json | 200，release ID 匹配 |
| `/api/health` | 200 / UP |
| `/api/profile?lang=ja/zh/en` | 三语均正确，Cache-Control no-store |
| POST `/api/bedrock` | 200 / PREPARING，占位不调用模型 |
| `/api/missing` | 404，不返回 SPA HTML |
| 不存在 JS、`/images/missing` | 403/404，不返回应用 HTML |
| `/projects/example` | SPA 页面 200 |
| S3 REST origin 匿名直接读取 index | 403，不能绕过 CloudFront 读取 |
| S3 四项公开访问阻止、版本控制、加密 | 全 true / Enabled / AES256 |
| Lambda 执行角色 | 仅 CreateLogStream / PutLogEvents 至自身日志组 |
| Lambda 配置 | Java 21，1 GB，28 s，reserved concurrency 5；DEBUG=false；diskspace=/tmp |

最初一次实测初始化约 4.1 秒、最大内存约 204 MB，只是一次观测，不代表所有后续冷启动或稳定性能。保留 1 GB 初始配置，未据单次样本缩规格。

视觉/交互/移动端仍未验证：Computer Use 在识别浏览器 URL 时被工具停止，未继续任何 UI 输入；HTTPS 验收不能代替这些检查。真实 Bedrock、AWS CI/CD、蓝绿切流、双审批、自定义域名和自动告警回滚都尚未实现。未改 DNS，未 commit/push。

本轮日志、计划与候选包在忽略的 `.local/` 和 `*.tfplan` 中。下一 Story 是 AWS-native CI/CD 准备；上线增量在此暂停供用户审核。
