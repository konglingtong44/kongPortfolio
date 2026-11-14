# AWS 费用：当前运维入口与历史ECS估算

**当前状态（2026-11-14）：** 实际费用来源、四档$5/$10/$15/$25自动关停、手动恢复和已完成验证见[费用控制](aws-cost-control.md)；已删除的旧资源见[清理记录](aws-resource-cleanup.md)，实际命令见[补录](aws-commands-20261114.md)。既有$10／Zero-Spend邮件预算保留，新控制预算另建。下文仅保留当时的历史估算与规划，不代表当前状态或未获批准的创建操作。

当前用户选定的低流量 Serverless 方案预算见 [Serverless 路线](../README.md#aws-运行架构)，约 USD 2–5/月目标。下文 USD 55–80 等为原 ECS/ALB 历史方案，仅供比较；不能当作当前资源报价或创建授权。

2026-11-11 账号核查更新：已有 USD 10 月度 Budget 和 Zero-Spend 邮件提醒，本轮未重复创建。具体规则、验证范围见 [首次部署前核查](../README.md#检查安全与目录)。下表仍为原完整架构的规划估算，不表示用户已批准整站费用，也不是当前账号账单。

2026-11-11 估算；假设东京 ap-northeast-1、730 小时/月、Linux x86、低流量约 10 GB/月，不扣 Free Tier/credits、不含税/汇率、域名续费及其他既有资源。区域/访问量改变需重算，不保证账单上限。

公开 AWS Price List：东京 Fargate vCPU USD 0.05056/小时、内存 USD 0.00553/GB小时；ALB USD 0.0243/小时 + 0.008/LCU小时；IPv4 USD 0.005/地址小时。[ECS 东京价格](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/ap-northeast-1/index.json)、[ALB 东京价格](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSELB/current/ap-northeast-1/index.json)、[IPv4](https://aws.amazon.com/vpc/pricing/)

| 项目 | 单任务常驻 / 月（USD） | 假设 |
|---|---:|---|
| ECS Fargate | 22.49 | 0.5 vCPU + 1 GB，730 × (0.5 × 0.05056 + 0.00553) |
| ALB | 17.74 + 0–5.84 | 1 ALB、平均 0–1 LCU，更多流量另计 |
| 公网 IPv4 | 10.95 起 | ALB 两 AZ 最少 2 个 + 任务 1 个，扩容会增加 |
| S3 + CloudFront | 1–5 预算 | 少量版本存储、请求及约 10 GB 传输，不依赖免费计划 |
| ECR | 0.2–1 预算 | 少量镜像，保留上一稳定 digest |
| CloudWatch | 0.5–3 预算 | 日志/alarms，保留 7–14 天 |
| CodeBuild + CodePipeline | 1–5 预算 | 两 release 管线、约 20 次发布/月及少量 PR CI，规格/时长待测；频繁 CI 需提高预算 |
| Route 53 | 0.5 + 查询 | 现有 zone 只计一次，不新建 zone；续费另计 |

合计约 **USD 55–80/月**；双 AZ 两任务再加约 USD 26.14，预算 **USD 85–110/月**。单任务不承诺 AZ 高可用。当前 512 MB 容器限制不等于云上最佳规格，先测 Java 内存/CPU。

## 临时和可选成本

一个额外 Green（0.5 vCPU/1GB）+ IPv4 约 USD 0.03581/小时，等两小时约 USD 0.072/次，20 次约 USD 1.43；另有 STG、LCU、日志、构建。Green 需 pause 超时回滚，STG 按 execution 清理，不永驻两套生产。HA 的额外 Green 成本翻倍。

CloudFront staging 按请求/流量计费，不等于免费传输。CodePipeline V2 按 action execution 分钟、CodeBuild 按规格/时间，不能一律按 pipeline 固定 1 美元。[CodePipeline](https://aws.amazon.com/codepipeline/pricing/)、[CodeBuild](https://aws.amazon.com/codebuild/pricing/)、[CloudFront](https://aws.amazon.com/cloudfront/pricing/)、[ECR](https://aws.amazon.com/ecr/pricing/)、[CloudWatch](https://aws.amazon.com/cloudwatch/pricing/)、[S3](https://aws.amazon.com/s3/pricing/)

当前预算无 NAT。单 NAT 常驻可额外约 USD 35–70/月，另有 GB 处理及跨 AZ 流量，东京创建前重算，多 AZ 再倍增。私网多个 interface endpoints 也按端点/AZ小时收费，不假定一定更便宜；S3 gateway endpoint 不同。[VPC 定价](https://aws.amazon.com/vpc/pricing/)

不默认建数据库、WAF、付费 KMS key、永驻 STG、第二 ALB。CloudFront 套餐需核对连续部署/OAC支持，不把免费额度当永久保证。不使用 GitHub Actions；GitHub Pro 分支保护费用独立于 AWS。CodeBuild PR 检查也收费，需限制触发频率和并发。

低成本可选：纯静态前端约 USD 1–5/月（Java API 暂不可用）；静态前端 + Lightsail/EC2 后端需另估价，不能宣称等价 ECS 原生蓝绿。本阶段不替用户创建或更换方案。

## Phase 2 控制

先批准预算/方案，设置 Budget 月度实际和预测 50%/80%/100%提醒、Cost Anomaly Detection、Project/Environment/Owner 标签、日志保留、ECR lifecycle、STG/Green timeout。Budget 不是消费硬上限，需配权限和清理。资源清单获明确批准后才能创建。
