# S2-02 — 首次部署前核查

验收：核对 SSO 目标账号、现有 Budget/订阅、DNS zone、证书及相关服务；提供可重复运行的只读脚本；不重复创建现有 Budget，不改变 DNS，不创建网站资源。

## 执行方式

```powershell
# 在仓库根目录；用自己的目标账号替换占位符。
./scripts/aws-preflight.ps1 -ExpectedAccountId '<ACCOUNT_ID>' -Profile kong-dev
# 当前机器 AWS CLI 未进入代理进程 PATH 时追加：
# -AwsExecutable D:\software\AWSCLI\aws.exe
```

脚本先用 STS 核对账号，再调用 Budgets describe、Route 53 list-hosted-zones、ACM list-certificates、ECS list-clusters、ECR describe-repositories、CloudFront list-distributions、ELBv2 describe-load-balancers。只读；失败立即停止，不把失败视为空资源。报告仅在全部成功后写入忽略的 `.local/aws-preflight.json`，不打印或保存订阅邮箱/SNS 地址。ACM 分别查询东京和 us-east-1，并包含所有受支持 key type。

## 2026-11-11 结果

| 项目 | 核查结果 |
|---|---|
| 目标账号 | 与传入账号一致 |
| Monthly Budget | USD 10/月，COST，无 cost filter；实际阈值 80、预测阈值 60，各有 1 个 EMAIL 订阅；API 未返回这两条的 ThresholdType，因此本记录不换算成美元阈值 |
| My Zero-Spend Budget | USD 1/月，COST，无 cost filter；实际金额 > USD 0 提醒，1 个 EMAIL 订阅 |
| Budget health | 两者均为 HEALTHY；包含税费，不含 credit/refund |
| Route 53 | 1 个公开 hosted zone；域名保留在本地报告，未修改记录 |
| ACM | 东京/us-east-1 查询均无证书 |
| CloudFront | 查询无分发 |
| ECS / ECR / ELBv2 | 东京查询均为空 |

已有 Budget 足以提供当前 State 阶段的费用提醒，不额外创建或导入接管现有配置。当前提醒尚未达到路线图设想的实际/预测 50%/80%/100%完整规则；是否调整及整站预算随部署范围确定。单纯预算监控和通知免费，自动动作和 Budget Reports 另有定价，见 [AWS Budgets 定价](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/)。Budget 不自动封顶消费，也不能保证实时通知。

验证：真实 AWS 完整查询成功；错误账号输入被拒绝，原报告未被覆盖；PowerShell 解析检查、Git diff 检查和新增脚本/文档 Gitleaks 扫描通过。没有改应用，未重跑前后端/容器测试。未 commit/push。

限制：没有测试实际邮件送达，没有验证 DNS 委派/域名续费，没有检查其他区域的应用资源；计费数据有延迟。未设置 Cost Anomaly Detection。未创建网站或证书。

下一 Story：根据用户选择准备首次部署的具体 Terraform plan 和当前价格核算，先展示资源/费用再创建。完整原架构与静态前端分阶段方案仍待用户选择；本 Story 不扩大之前 State bucket 的付费批准范围。
