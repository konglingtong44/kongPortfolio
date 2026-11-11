# 自定义域名 — konglingtong44.com

**2026-11-12 已上线：https://konglingtong44.com 。** HTTPS/前后端验收通过，Terraform 最后 plan 退出 0 / No changes。浏览器视觉未复检，本 Story 不改变应用代码或重建发布包。

用户要求沿用已有名称。核查发现原托管区仍存在，但公共 DNS 为 NXDOMAIN、AWS 注册列表为空、注册局无记录，CheckDomainAvailability=AVAILABLE。旧注册操作记录确认该域名曾注册并于 2024 年到期，托管区不等于注册所有权。

用户选择继续注册并提供真实联系人资料后，已提交 Route 53 注册：1 年，最高 USD 16（税另计），AutoRenew=false，注册/管理/技术/账单联系人的隐私保护均开启。域名可用性和报价在提交前重新核对，Consent 锁定最高价格。注册人信息及原始请求只保留在忽略的 `.local/`，不写进仓库或公开前端。一次地址字段校验被拒绝后，确认没有新注册操作，再将地区代码转为注册局要求的 ISO subdivision 后提交成功；不是重复购买。

注册于 2026-11-11 完成，AWS operation=SUCCESSFUL，注册局=active；有效期至 2027-11-11（东京时间），自动续费关闭。操作 ID 保存在 `.local/domain-registration-operation.json`。已收到注册及 nameserver 更新成功通知，GetContactReachabilityStatus=DONE，无需再做邮箱验证。2026-11-12 完成 CloudFront 自定义域名发布；原地址 https://d4htln25bw5g5.cloudfront.net 仍可使用。

## 接入配置已准备

- `infra/terraform/portfolio/domain.tf`：已有公开 zone 查询、us-east-1 非导出 ACM 证书、DNS 验证记录、证书验证等待、主域名 A/AAAA alias。
- CloudFront：新域名 alias、SNI、TLSv1.2_2021；仍使用原分发与原前后端，不创建 ALB 或服务器。
- `custom_domain` 默认 null；本机现已通过忽略的 `custom-domain.auto.tfvars.json` 启用，不将账号设置硬编码进公共模板。不会管理/删除原 hosted zone，也不会覆盖 `testec2`、NS、SOA 或已有记录。
- 计划 5 add / 2 update / 0 delete；实际 apply 为 **5 added / 1 changed / 0 destroyed**：证书及验证、3 条 DNS 记录，更新 CloudFront；S3 policy 重新计算后与原值一致，因此未修改。证书已签发、分发 Deployed、A/AAAA 生效。CloudFront 发布约 9 分钟，DNS 写入约 33 秒；无应用替换。

域名注册单独按年收费；ACM 集成服务用的非导出公开证书免费，Route 53 到 CloudFront 的 alias 查询不额外计费，不需要再建一个收费托管区。[ACM 定价](https://aws.amazon.com/certificate-manager/pricing/)、[Alias 说明](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html)

## 委派与重复空区处理

注册 API 自动生成了一个新空 zone。已将 registrar nameservers 指回原 zone `Z05184721X76TVPH1GCMX` 的四个 nameserver，并从 Google/Cloudflare 公共解析器验证完全一致。核对注册前 zone 快照、初始注册 NS、新区当前记录仅 NS/SOA 且无用户记录后，删除了本次自动生成的空区；原 zone 和 testec2 记录保留。新区在 12 小时内删除，避免重复 hosted-zone 月费，见 [AWS 注册说明](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html)。

```powershell
# 脚本先检查账号、域名所属 zone、公共 NS 是否完全匹配；未就绪会停止。
./scripts/enable-custom-domain.ps1 -DomainName konglingtong44.com -HostedZoneId Z05184721X76TVPH1GCMX -ExpectedAccountId '<ACCOUNT_ID>' -AwsExecutable D:\software\AWSCLI\aws.exe -TerraformExecutable D:\software\Terraform\terraform.exe
# 检查计划后加 -Apply 执行；实际使用的设置保存到忽略的 custom-domain.auto.tfvars.json。
node scripts/smoke-first-deployment.mjs https://konglingtong44.com '<releaseId>' konglingtong44.com
```

验证记录：Terraform fmt/validate 和真实计划通过；3 个 mocked-provider plan 测试通过（默认不改网站、免费证书/指定记录、拒绝无关 zone）。委派未完成时，脚本真实拒绝启用域名；完成后才生成计划和执行。ACM us-east-1 为 ISSUED / validation SUCCESS / export DISABLED；CloudFront 使用 SNI 和 TLSv1.2_2021。TLS 客户端正常验证证书链和 konglingtong44.com SAN，实测握手 TLS 1.3；没有跳过证书校验。

主域名线上验收：主页/JS/CSS/favicon/version、三语 profile、UP health、POST PREPARING、no-store API、真实 API 404/缺失资源错误均通过；深层 SPA 路由 200，HTTP 301 → HTTPS。原 CloudFront URL 仍可读取同一版本。最终 Terraform No changes。

执行方式：注册与 registrar NS 用 AWS CLI；ACM、验证记录、A/AAAA、CloudFront 别名与 TLS 用 Terraform。没有新建常驻服务器，没有启用真实 Bedrock/CI/CD/蓝绿。注册/验证未通过浏览器自动操作邮箱或认证页面；未 commit/push。本 Story 完成，暂停供用户审核，之后继续 AWS CI/CD。
