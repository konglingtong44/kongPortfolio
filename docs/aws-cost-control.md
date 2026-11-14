# AWS 费用关停：$5／$10／$15／$25 四档已接通

每个 UTC 月份，实际费用大于 $5 / $10 / $15 / $25 各触发一次关停；恢复后不被旧档位重复关停，跨月不自动恢复。真实关闭／恢复、已消费告警重放、SNS 实际投递均已验收。真实账单跨档与跨月尚未发生云上验收，预算数据仍有延迟。

已完成：20 个本地状态／SDK 接口测试（含Runtime／Mantle双入口关停策略）、2 个 Terraform mock 测试、Terraform validate/fmt、四个 PowerShell 语法检查、Gitleaks。前后端没有改动，本轮未重复运行其测试。

用户批准后已 apply：**24 个新增资源，0 自动关停订阅**。使用现有状态桶的独立 key，结果通知沿用现有 Monthly Budget 的唯一邮件地址，本地输入和计划均 ignored。新增内容为三个预算、四个 SNS 主题及其权限和邮件订阅、控制 Lambda/IAM、私有状态桶相关配置、失败队列与一个 CloudWatch 告警／日志组。后续退役旧站时，再 apply 了控制 Lambda 与其 IAM 策略两个更新，只管理正式站 CloudFront。纯预算监控通知免费，未使用收费的原生 Budget Actions；其余服务按实际资源／请求收费：[Budgets 定价](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/)、[CloudWatch 定价](https://aws.amazon.com/cloudwatch/pricing/)。

当前（2026-11-14）：预算实际费用 $19.021，consumed=[5,10,15]、resources=[]、mode=on；**$25 未消费，是本月下一次自动关停点**。四个阈值主题各有一个已确认 Lambda 订阅，结果邮件已确认。新增 $25 按月度规则保留，下个月从 $5 开始重新监控，仍不自动开站。正式首页 HTTP 200、API health 200/UP。详见 [资源清理记录](aws-resource-cleanup.md)。

用户批准后，四档接通计划核对并 apply：11 create / 2 update / 0 delete，仅新增 $25 预算／主题／策略、四组调用权限与订阅，更新控制 Lambda 和失败队列来源策略，未改业务开关。本地 ignored `.local/cost-control.tfvars.json` 现为 `arm_notifications=true`；源码默认 false 是新部署的安全默认值，维护现有账号时不要遗漏已审查的真实输入。

向本月已消费的 $5/$10/$15 主题各 Publish 一条消息，三个 SNS MessageId 均在控制 Lambda 的结构化日志中核对到 ignored-consumed；S3 状态字节不变、失败队列为空。没有向未消费的 $25 主题发测试消息，避免真实关停；$25 的关停与恢复去重通过本地模拟验证。证据：ignored `.local/cost-control-armed25-verification.json`。最终真实 Terraform plan 为 No changes。

## 2026-11-14 真实演练结果

- 首次发现阶段开关 IAM 只授权了 pipeline ARN，缺少 stage ARN；先恢复后端／CloudFront，再通过 Terraform 修正为指定管线的阶段 ARN。真实 IAM 模拟核实目标阶段 allowed、其他管线 implicitDeny；不扩大到全账号管线。
- 第二次完整 off/on：关停时 prod/stg 并发 0/0、后端 HTTP 503、两个角色 Bedrock Deny、7 个非 Source 阶段暂停、2 个 CI webhook 阻断、8 个资源快照保存。等 CloudFront 关闭配置 Deployed 后恢复。
- 恢复时与演练前逐项对比：并发 5/1、角色临时 Deny 删除、全部阶段开关和 webhook 原值一致；CloudFront 启用且 Deployed，首页和 API health HTTP 200/UP；快照清空，无活动构建或发布。
- 云端重复告警重放：已消费的 5/10/15 各两次，6 次全部 ignored-consumed，S3 状态字节不变。使用直接 Lambda SNS 格式事件重放，**不是 SNS 实际投递或真实账单跨档端到端测试**；跨月测试仍为本地模拟。
- 补测中发现 128MB 运行环境接近内存上限（127MB），一次调用最终 300 秒超时，期间占用唯一并发位、后续请求被限流。已改为 256MB，并在温调用间复用 SDK Session／客户端；修复后 6 次重放通过，报告内存 94MB、首次约 3.4 秒、随后约 28–37ms。这些是本次重复告警路径的实测，不代表完整关停路径耗时。控制函数并发仍为 1，按钮读取超时延长为 360 秒，覆盖控制函数的 300 秒上限。
- 恢复成功会清除之前的 errors，失败记录保留具体 AWS 错误代码。真实无在途任务，因此本轮没有验证“正在运行的构建／发布被停止”分支。

演练证据保存在 ignored `.local/cost-drill-*.json`／日志；第一次错误与后续修复均保留，没有将失败尝试算作通过。演练时自动通知未接通；后续已按上方记录完成接通。

## 2026-11-14 账号核查

SSO 账号 561798268037。Cost Explorer 本月估计合计约 **$19.02**，包含税；数据有延迟，不是最终发票。以下列出已出现的费用及项目可能继续收费的项目，不能把历史账单当作资源仍在运行的证明。

| 服务 | 本月已报告 USD（约） | 继续收费来源 | 本方案行为／剩余费用 |
|---|---:|---|---|
| Amazon Registrar | 16.00 | 域名注册／到期续费 | 不取消域名；本月购买不可通过暂停退回 |
| Tax | 1.73 | 对应服务税费 | 不可关停；预算包含税 |
| CodeBuild | 0.575 | 每次构建时间 | 阻断两个 CI webhook；停止本项目七个构建项目的在途构建；不会阻止管理员另行手动 StartBuild |
| Route 53 | 0.5014352 | Hosted Zone、DNS 查询 | 保留 DNS，仍收费；删除 zone 不是安全的暂停操作 |
| CodePipeline | 0.21 | 当前 V2 action 执行时间 | 禁用全部非 Source 阶段入口、停止旧执行；Source 仍可能触发和收费，管线未删除 |
| S3 | 0.0037498 | 网站、制品、状态、版本存储／请求 | 四个旧桶已按后续授权删除；原四个项目桶及后续新增私有资料桶均保留，存储与请求仍可能收费 |
| API Gateway | 0.0006824 | 请求 | Lambda 并发归零后不再执行后端，但直连 HTTP API 请求仍可计费 |
| CloudFront | <0.000001 | 请求与传输 | 两个旧分配已删除；按钮只控制正式站 E2NYEXSOAQ1TWE，传播需时间，在途请求仍可能收费 |
| EFS | <0.000001 | 旧文件系统存储 | fs-0e39d17094efae58c 已按后续授权删除；既有恢复点另计，未一并删除 |
| Lambda | 当前报告 0 | 请求、执行时间、特殊预置功能 | prod/stg 并发分别从实测 5/1 归零；恢复读取快照，不硬编码；在途执行无法瞬间撤销 |
| CloudWatch | 当前报告 0 | 日志存储／摄取、告警 | 保留日志与告警，仍可能收费 |
| SNS／SQS | 当前报告 0 | 消息与请求 | 保留；新关停机制也使用这两项 |
| KMS／ACM／Glue | 当前报告 0 | 取决于资源类型与使用方式 | 本轮无收费行，不表示所有规格永久免费；不改动 |
| AWS Backup | 本月未见独立收费行 | 已发现旧恢复点，可能有存储费 | 保留恢复点，不删除备份 |
| Bedrock（本地接入，云端未启用） | Java与SSO短诊断经Mantle成功 | 输入／输出 tokens；知识库等附加组件另算 | 关停时仅对 prod/stg 角色加入 bedrock:* 与 bedrock-mantle:* Deny；控制器更新已部署，双入口拒绝经IAM模拟验证，本轮未重做真实停站；不限制SSO管理员或其他角色 |
| 本关停机制（新增） | 已部署，后续计入账单 | Lambda、S3 状态版本、SNS、SQS、日志及一个告警 | 无定时轮询，不使用付费 Cost Explorer 轮询；费用不保证为零 |

东京已检查：EC2 实例、NAT Gateway、ALB、ECS 集群、RDS 实例均为空。后续追加清理授权后，两个旧 CloudFront、旧 EFS 与四个旧 S3 桶已删除；备份恢复点保留。17 个已启用区域核对 CloudTrail 无现存 trail；未对所有区域的全部服务做完整扫描，不能宣称整个账号无其他资源。本月账单覆盖所有区域的已报告费用。

最新账单：`./scripts/get-aws-costs.ps1`（一次 Cost Explorer 查询可能有 API 费）。

## 档位与恢复规则

- 四个独立月预算，实际成本 **大于** $5/$10/$15/$25，整账号、所有区域；排除 credits/refunds，包含税、域名、预付费和订阅。不是“从现在起新增花费”。保留已有邮件预算。
- Budgets → 各自 SNS → 同一控制 Lambda。所有手动命令也走该 Lambda，并发固定 1；状态放在独立、加密、版本化的私有 S3 桶。
- 关停前逐项保存原值。重复关停不覆盖快照。只有全部关停步骤完成才确认档位消费；部分失败仍尝试其他资源，并保留错误，重试或手动恢复。
- 恢复先读取四个预算的实际费用最大值，将已跨过的档位标记为本月已消费；也可提供 `-BaselineUsd` 作为已核对费用下限。处理过的告警档位也会计入，即使预算数据滞后。
- 恢复之前发布的 SNS 通知和上月通知直接忽略，防止延迟／重复投递；恢复未完成时，新档位通知失败重试，不静默丢弃。
- **例：$5 关停→恢复→$10 关停→恢复→$15 关停→恢复→$25 关停。** 如果账单一次从 $4 跳到 $16，前三档已跨过，恢复后等待 $25。如果恢复时已超过 $25，本月四档都会消费，之后没有更高档；需要更高档位须修改配置。
- 跨月只在收到新命令／通知时更新档位状态，不运行自动恢复任务。若服务原来就关闭，继续保持关闭。
- AWS 账单／Budgets 更新有延迟，费用可超出阈值；恢复后新发布、对应尚未消费档位的通知仍可能关停。它不是精确硬额度。

## 一键命令（部署后可用）

### 控制台入口（已配置）

打开 [东京控制 Lambda 的测试页](https://ap-northeast-1.console.aws.amazon.com/lambda/home?region=ap-northeast-1#/functions/kongportfolio-cost-control?tab=testing)，进入“测试”，在已保存／共享测试事件下拉列表选择事件，再点击“测试”执行：

| 已保存事件 | 操作 |
|---|---|
| `check-status` | 查看状态，action=status |
| `manual-start` | 恢复原配置，action=on |
| `manual-stop` | 真实关停，action=off；网站将不可用 |

三个事件通过 Terraform 保存为控制台兼容共享事件，已从 AWS 读回核对映射；仅执行了保存的 check-status，结果 on、快照为空。没有在本次配置入口时执行 off/on。新建共享 registry 与此函数专属 schema，现有业务资源未变；registry 防误删除。用户之后若在控制台编辑这些事件，会与 Terraform 配置产生差异。

### PowerShell 入口

```powershell
# 使用 AWS CLI 在 PATH 中；否则传 -AwsCli D:\software\AWSCLI\aws.exe
./scripts/cost-control.ps1 -Action status
./scripts/stop-aws-services.ps1
./scripts/start-aws-services.ps1
# 账单刚核对过，但 Budgets 数据尚未跟上时：
./scripts/start-aws-services.ps1 -BaselineUsd 12.50
```

恢复还原保存的开关／并发值，不承诺网站健康、运行环境未被其他人改动；CloudFront 恢复也有传播延迟。失败查看控制 Lambda 日志、失败队列、结果邮件，解决后重试。不要在暂停期间对 portfolio/cicd 执行 Terraform apply，否则它可能恢复声明的配置；不要删除状态桶或手工修改快照。已有生产审批关卡均保留。

关停并非发布回滚事务：已经由 CodeDeploy 接受的发布可能继续，脚本不会擅自改变生产版本／流量。关停中止构建可能使正在进行的发布验证失败，需人工检查 CodeDeploy；真实演练选择没有正在发布的窗口。管理员手动构建、其他角色的 Bedrock 调用、HTTP API 直连和持久存储不在硬性封禁范围。

## 分阶段部署与验收

创建、初始化、邮件确认、实际关停／恢复、SNS 已消费告警投递和四档自动接通已完成。下列是部署顺序回顾；真实费用跨档、跨月及在途发布的停止分支仍没有云端测试证据。

1. 审查清单、预算成本定义和新资源费用；确认旧启用 CloudFront 是否也应关闭。填写本地 `.tfvars` 的账号、通知邮箱，使用现有 Terraform backend 桶的独立 key `cost-control/terraform.tfstate`，不改原栈。
2. `terraform init` 后生成并审查 plan。第一次 apply 保持 `arm_notifications=false`，建立预算、SNS、控制 Lambda、状态桶、失败队列、日志和告警；**不会关停现有服务**。
3. 确认结果邮件订阅。等待预算的当前实际费用可查询且与账单一致，再 initialize（本次使用已核对下限 $20）；只消费已经跨过的档位，不能期待已消费档位再次触发。不要随意把 baseline 提高到未跨过的 $25。
4. 本地自动测试已验证状态机。真实验收需要约定短暂网站不可用窗口：手动 off，核对并发 0、角色 Deny、CloudFront 关闭、CI webhook 阻断与流水线停止；若提示在途任务停止中，等待后重试 off。再 on，核对原值和网站健康。不会重启停止的构建或复活旧发布。
5. 先在独立测试资源／测试配置演练 SNS 重复、乱序和 $5→恢复→$10→恢复→$15；不要对真实主题随便 Publish，以免停站。生产账号没有执行此集成测试。
6. 验收通过后审查 plan，以 `arm_notifications=true` 接通四个订阅，检查真实 SNS MessageId 与处理日志。本月前三档保持已消费，$25 未消费；下月重新监控各档位，无需自动开站。

部署前尚需验证真实 IAM、Budgets 数据格式、CloudFront 传播和 webhook 更新；Terraform mock 和本地状态机测试不等于云上验收。预算通知、控制 Lambda、投递失败均有失败队列／邮件路径，仍需确认订阅并监看告警。

参考：[预算更新延迟](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)、[通知规则](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html)、[Lambda 并发归零](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)、[流水线恢复阶段可能继续执行](https://docs.aws.amazon.com/codepipeline/latest/userguide/transitions.html)、[CodeBuild webhook 过滤](https://docs.aws.amazon.com/codebuild/latest/userguide/github-webhook.html)。
