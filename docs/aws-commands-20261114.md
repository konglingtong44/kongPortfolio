# 2026-11-13～14 AWS 命令与操作补录

这是实际执行记录的补充索引，覆盖模型选型、费用控制、资源清理和 Qwen 排查。主时间线见 [执行日志](../AWS_EXECUTION_LOG.md) 29–31 章，学习解释见 [学习指南](../AWS_LEARNING_GUIDE.md) 28／30／33／34 节。

命令按用途归并，不假装每次重复查询都是新的部署。带占位符的是脱敏参数；Python SDK 操作按真实 API 名记录，**不是伪装成当时运行过的 CLI**。下列保存计划、删除和停站命令是历史记录，不要整页复制执行。

## 1. 身份与账号

当时使用 `D:\software\AWSCLI\aws.exe`、`D:\software\Terraform\terraform.exe`，profile=`kong-dev`，账号=`561798268037`，业务区域东京。PowerShell 会用参数数组，避免含 `=`／点号的参数被错误拆分。

```powershell
# 实际执行过；不保留一次性授权码／完整授权链接。
& 'D:\software\AWSCLI\aws.exe' sso login --profile kong-dev --use-device-code --no-browser
& 'D:\software\AWSCLI\aws.exe' sts get-caller-identity --profile kong-dev
```

最初 SSO 过期失败，用户完成 device 授权后 STS 成功。角色本身仍为现有 SSO 管理角色，没有创建长期访问密钥。

## 2. 账单与资源取证（只读）

以下 CLI 实际执行过；相同命令的 `--query` 版本用于缩减输出。

```powershell
$aws = 'D:\software\AWSCLI\aws.exe'
& $aws ce get-cost-and-usage --profile kong-dev --time-period Start=2026-11-01,End=2026-11-15 --granularity MONTHLY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE --output json
& $aws ce get-cost-and-usage --profile kong-dev --time-period Start=2026-11-01,End=2026-11-15 --granularity MONTHLY --metrics UnblendedCost --group-by Type=DIMENSION,Key=REGION --output json
& $aws resourcegroupstaggingapi get-resources --profile kong-dev --region ap-northeast-1
& $aws ec2 describe-regions --profile kong-dev
& $aws s3api list-buckets --profile kong-dev
& $aws cloudfront list-distributions --profile kong-dev
& $aws lambda list-functions --profile kong-dev --region ap-northeast-1
& $aws ec2 describe-instances --profile kong-dev --region ap-northeast-1
& $aws ec2 describe-nat-gateways --profile kong-dev --region ap-northeast-1
& $aws elbv2 describe-load-balancers --profile kong-dev --region ap-northeast-1
& $aws ecs list-clusters --profile kong-dev --region ap-northeast-1
& $aws rds describe-db-instances --profile kong-dev --region ap-northeast-1
& $aws batch describe-compute-environments --profile kong-dev --region ap-northeast-1
& $aws batch describe-job-definitions --status ACTIVE --profile kong-dev --region ap-northeast-1
& $aws ec2 describe-vpn-connections --profile kong-dev --region ap-northeast-1
& $aws codebuild list-projects --profile kong-dev --region ap-northeast-1
& $aws codebuild batch-get-projects --names kongportfolio-ci-backend kongportfolio-ci-frontend --profile kong-dev --region ap-northeast-1
& $aws codepipeline get-pipeline-state --name kongportfolio-candidate --profile kong-dev --region ap-northeast-1
& $aws budgets describe-budgets --account-id 561798268037 --profile kong-dev
```

另外实际调用 `budgets describe-notifications-for-budget`、`describe-subscribers-for-notification` 读取既有 Monthly Budget，沿用其唯一邮件地址；输出／输入只保存在 ignored `.local`，不在文档记录私人地址。CodeBuild webhook 返回可能含敏感 payload URL，不复制到文档。

实际 SDK 审计脚本：`python .local/audit_cleanup.py`。该文件是当时的本机取证脚本，不是仓库公共运行依赖。

| SDK 查询 | 用途／结果 |
|---|---|
| S3 GetBucketLocation／Versioning／Logging／Replication／Policy／LifecycleConfiguration／Tagging／Website／ObjectLockConfiguration；ListObjectVersions、ListMultipartUploads 分页 | 识别地区、用途、历史版本和依赖；不是只看当前对象数 |
| Route53 ListHostedZones、ListResourceRecordSets | 正式域名 A/AAAA 和证书验证仍在用；另有失效 testec2 别名 |
| EFS DescribeFileSystems／MountTargets／AccessPoints／BackupPolicy／FileSystemPolicy | 旧 test 文件系统 6144 字节，3 个挂载点、1 个访问点 |
| 17 个已启用区域的 Lambda ListFunctions、ECS ListClusters、EFS DescribeFileSystems、CloudTrail DescribeTrails(includeShadowTrails=false) | 查旧资源使用者和 CloudTrail 写入者；不是全服务全区域穷举 |

账单约 $19.02，其中域名 $16、税 $1.73；保留／删除决策见 [清理记录](aws-resource-cleanup.md)。Cost Explorer 查询本身可能有 API 费。

## 3. 费用控制的 Terraform 实际部署

```powershell
$env:AWS_PROFILE = 'kong-dev'
$tf = 'D:\software\Terraform\terraform.exe'
& $tf '-chdir=infra/terraform/cost-control' init -backend=false -input=false
& $tf '-chdir=infra/terraform/cost-control' init -input=false '-backend-config=bucket=kongportfolio-tfstate-561798268037-ap-northeast-1' '-backend-config=key=cost-control/terraform.tfstate' '-backend-config=region=ap-northeast-1'
& $tf '-chdir=infra/terraform/cost-control' fmt -recursive
& $tf '-chdir=infra/terraform/cost-control' validate
& $tf '-chdir=infra/terraform/cost-control' test
```

`init` 最初只下载 provider；后绑定既有状态桶的独立 key。真实 plan/apply 的实际参数形态如下（各保存文件见表）：

```powershell
# 这是执行形态说明；<当次文件> 不是可直接运行的参数。
& $tf '-chdir=infra/terraform/cost-control' plan -input=false '-var-file=../../../.local/cost-control.tfvars.json' '-out=../../../.local/<当次文件>.tfplan' -no-color
& $tf '-chdir=infra/terraform/cost-control' show -json '../../../.local/<当次文件>.tfplan'
& $tf '-chdir=infra/terraform/cost-control' apply -input=false -no-color '../../../.local/<当次文件>.tfplan'
```

每次都解析 show JSON，按地址核对 create/update/delete 范围后才 apply。最早尚未批准的预览曾用 `plan -lock=false`；后续获批部署使用正常状态锁。不是运行 apply -auto-approve 或重建已有根栈。

| 保存计划名（`.local/`） | 实际 apply 结果 | 内容 |
|---|---|---|
| cost-control-approved.tfplan | 24 create，0 update/delete | 三个预算、SNS、控制 Lambda／IAM、私有快照桶、队列／告警；自动通知未接通 |
| cost-control-live-only.tfplan | 2 update | 退役旧站后，控制 Lambda 和 IAM 只保留正式 CloudFront |
| cost-control-permission-fix.tfplan | 2 update | stage ARN 权限、错误代码和成功恢复清错 |
| cost-control-memory-fix.tfplan | 1 update | 控制 Lambda 256MB、温调用复用 SDK Session／客户端 |
| cost-control-console-events.tfplan | 2 create | 共享事件 registry 与本函数 schema；没有执行 stop/start |
| cost-control-armed25.tfplan | 11 create，2 update，0 delete | $25 预算／主题、四组调用权限和订阅、Lambda 与失败队列策略 |
| cost-control-mantle-stop.tfplan | 1 update，0 create/delete | 仅控制Lambda代码：关停策略同时覆盖Runtime与Mantle；没有执行关停或恢复 |
| bedrock-content-approved.tfplan | 9 create，0 update/delete | 新增私有资料桶及保护配置、公开摘要对象、STG指定版本读取policy；使用独立bedrock-content根栈 |
| profile-import-20261114/import.tfplan | 2 update，0 create/delete | 替换S3对象为从用户DOC整理的脱敏问答资料，STG允许新资料及旧摘要回退版本；不改业务Lambda或模型开关 |
| scope-policy-20261114/content.tfplan | 2 update，0 create/delete | 仅替换资料中的旧通用解题允许条款，STG允许新资料及前两版回退；职业事实、业务函数及模型开关不变 |

各次 apply／plan 输出均保存到同名前缀 `.log`；输入与 plan 含私人通知信息，不提交。最终运行以下实际只读计划，退出码 0／No changes：

```powershell
& $tf '-chdir=infra/terraform/cost-control' plan -input=false -detailed-exitcode '-var-file=../../../.local/cost-control.tfvars.json' -no-color
```

## 4. 资源清理的真实 SDK 操作（不可重跑）

用户先批准删除已确认无用 EFS/DNS/S3，随后明确批准旧站和 2023 CloudTrail 历史日志一起永久清理。先保存配置／版本清单，再按固定 allow-list 操作；**没有用 `aws s3 rb --force` 代替版本删除**。

| 本机实际命令 | SDK 写入／检查与结果 |
|---|---|
| `python .local/cleanup_efs.py` | 查 14 天 CloudWatch AWS/EFS ClientConnections Maximum；无连接、无消费者后 PutBackupPolicy(DISABLED)、DeleteAccessPoint、DeleteMountTarget×3 |
| `python .local/retire_legacy.py` | 保存旧 CF 配置，禁用 E1LUMPY3CCJ918，删除已停用且 Deployed 的 E1B0T7MYZJI753；S3 DeleteBucketReplication、PutBucketLogging({}) 停止旧写入 |
| `python .local/delete_unused_storage.py` | 再核对 EFS 大小／挂载点／访问点后 DeleteFileSystem；逐桶 HeadBucket(ExpectedBucketOwner)、检查对象锁，ListObjectVersions、ListMultipartUploads；AbortMultipartUpload（如有）、DeleteObjects 分批最多1000、DeleteBucket |
| 同一清理脚本中的 Route53 ChangeResourceRecordSets | 先确认 kongalb 为 LoadBalancerNotFound，仅 DELETE `testec2.konglingtong44.com` 的旧 A 别名 |
| 后续单次 Python SDK 命令 | 再查旧 CF E1LUMPY3CCJ918 Enabled=false、Status=Deployed、无自定义域名且 origin 为旧副本，DeleteDistribution(IfMatch=最新ETag) |

四个删除桶／版本数：kong-s3=4、s3-kong-replica=3、s3-log-kong=3684、aws-cloudtrail-logs-561798268037-4c43b622=10，合计3701。保留四个项目桶、正式 zone／证书记录、EFS 既有备份恢复点。清单不含原对象内容，不能用于恢复已删数据。

后验实际 CLI：`efs describe-file-systems` 为空、`s3api list-buckets` 仅剩四个项目桶、`cloudfront list-distributions` 仅正式分配、`route53 get-change --id C00885952FOD6JRL2GH24` 返回 INSYNC。

## 5. 关停／恢复、控制台和 SNS 验收

实际运行过：

```powershell
./scripts/cost-control.ps1 -Action status -AwsCli 'D:\software\AWSCLI\aws.exe'
./scripts/cost-control.ps1 -Action initialize -BaselineUsd 20 -AwsCli 'D:\software\AWSCLI\aws.exe'
./scripts/stop-aws-services.ps1 -AwsCli 'D:\software\AWSCLI\aws.exe'
./scripts/start-aws-services.ps1 -AwsCli 'D:\software\AWSCLI\aws.exe'
python .local/cost_drill_check.py before
python .local/run_cost_drill.py
python .local/cost_drill_check.py after
python .local/replay_consumed_alerts.py
python .local/verify_armed_sns.py
```

initialize 是一次性初始化，**不是日常打开按钮**；20 是当时已核对的费用下限，不是以后应盲填的数值。stop/start 是真实业务操作。PS 包装器实际执行 STS 后 `lambda invoke --invocation-type RequestResponse --cli-read-timeout 360 --payload fileb://<临时文件>`，最后清理本次临时文件。

控制器 SDK 操作：S3 GetObject／PutObject（先存原值）；Lambda Get/Put/DeleteFunctionConcurrency；IAM Get/Put/DeleteRolePolicy（专用 Bedrock Deny）；CodePipeline GetPipelineState／ListPipelineExecutions／DisableStageTransition／EnableStageTransition／StopPipelineExecution；CodeBuild BatchGetProjects／UpdateWebhook／ListBuildsForProject／BatchGetBuilds／StopBuild；CloudFront GetDistributionConfig／UpdateDistribution(IfMatch)；Budgets DescribeBudget；结果 SNS Publish。实际演练无在途任务，StopBuild／StopPipelineExecution 分支没有云上执行证据。

- 第一轮 pipeline 阶段权限失败，先恢复；修复后第二轮完整通过，关停后 API 503、CloudFront 停用 Deployed，恢复后并发5/1、原配置一致、首页/API 200/UP。
- 实际执行 `iam simulate-principal-policy`，核目标 `kongportfolio-candidate/BuildCandidate` 为 allowed，其他管线与 pipeline root 为 implicitDeny；阶段开关需要 stage ARN。
- 控制器128MB接近127MB，一次调用300秒超时并占住唯一并发。改256MB／复用SDK后，6次已消费告警直接重放通过，未修改状态；记录没有把它称为 SNS 投递测试。
- `schemas list-registries` 后，Terraform 创建 `_kongportfolio-cost-control-schema`，`DescribeSchema` 读回 check-status/status、manual-start/on、manual-stop/off；SDK仅执行保存的 status。用户后来通过控制台亲自关闭／打开，当前已恢复。
- `sns list-subscriptions-by-topic` 从 PendingConfirmation 核对到确认 ARN；用户点击了结果邮件确认。
- `verify_armed_sns.py` 通过 SNS Publish 向**已消费**的5/10/15各发一条，用 FilterLogEvents 的 message_id 匹配三个 ignored-consumed。四个订阅、Lambda GetPolicy、预算金额／收件主题、SQS RedrivePolicy 均核对；快照字节不变、失败队列为空。**没有 Publish 到未消费的25**。
- `urllib.request.urlopen` 实查 `https://konglingtong44.com` 与 `/api/health`，恢复后均200，health=UP；这不是浏览器视觉验收。

## 6. Bedrock 选型和最新429

先读取东京的 ListFoundationModels、ListInferenceProfiles、ListServiceQuotas；逐模型执行 GetFoundationModelAvailability。实际 `python .local/audit_all_bedrock.py` 查81个模型，下载区域 Price List；后续本机生成器整理历史清单／工作簿。最初语言筛选已被用户取消，最终清单39个文本模型／41条路由；它是当时快照，不保证当前账号仍有额度。

公开价格来源（实际下载）：`https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/ap-northeast-1/index.json`；当时 publicationDate=2026-11-11T01:30:37Z。基准千次费用按每次2000输入+500输出计算，不含税／重试／其他AWS服务。价格工作簿保存在 outputs，原始查询在 ignored `.local/bedrock-all-*`。

```powershell
# 最新实际执行，均为只读。
& $aws bedrock get-foundation-model --model-identifier qwen.qwen3-235b-a22b-2507-v1:0 --profile kong-dev --region ap-northeast-1
& $aws bedrock get-foundation-model-availability --model-id qwen.qwen3-235b-a22b-2507-v1:0 --profile kong-dev --region ap-northeast-1
& $aws service-quotas get-service-quota --service-code bedrock --quota-code L-3875BCCF --profile kong-dev --region ap-northeast-1
& $aws service-quotas get-service-quota --service-code bedrock --quota-code L-548A1A32 --profile kong-dev --region ap-northeast-1
& $aws service-quotas list-service-quotas --service-code bedrock --profile kong-dev --region ap-northeast-1
& $aws service-quotas get-aws-default-service-quota --service-code bedrock --quota-code L-3875BCCF --profile kong-dev --region ap-northeast-1
./scripts/check-bedrock-access.ps1 -ExpectedAccountId 561798268037 -AwsExecutable 'D:\software\AWSCLI\aws.exe'
```

最新模型 ACTIVE/ON_DEMAND／访问正常，但实际账号 TPM/RPM=0；公开默认TPM=1亿，不可代替账号值。凌晨账号快照确为正值，变化原因未知。

`python .local/qwen_runtime_smoke.py` **实际只执行一次**：SDK Converse，maxTokens=128、temperature=0.1、total_max_attempts=1、connect_timeout=10、read_timeout=60，虚构资料，无简历。返回429 ThrottlingException / Too many tokens；requestId=`3ae65457-5c33-4700-943e-4213c2d2cded`。没有成功回答／usage，未偷偷切区域或模型。此诊断脚本不应作为日常自动重试脚本。

当前公共脚本改为检查真实配额并在0时停止；本地 PROD/STG 权限草稿改为精确 Qwen ARN，仍默认false、未apply；Java线上仍PREPARING。[Support草稿](bedrock-quota-support-draft.md)尚未提交；提交属于向AWS发消息，等待用户明确授权。

补文档时再次运行两个合法GetServiceQuota，仍为0；只读执行以下命令，返回SubscriptionRequiredException，未创建case、未升级套餐：

```powershell
& $aws support describe-services --language en --profile kong-dev --region us-east-1
```

这是Support API的套餐限制，不等于Basic用户不能通过控制台申请配额。后续核对控制台，不为绕过API限制购买套餐。

用户随后要求暂停，重新列所有有配额的模型。实际执行`python .local/read_current_bedrock.py`，用SDK分页读取新的870条账号配额、81个模型、50个配置文件；结果见[11:33 JST全量重查](bedrock-current-quotas.md)，在线模型级配额无正数。另实际CLI对`amazon.nova-reel-v1:0`、`amazon.nova-sonic-v1:0`分别执行GetFoundationModel／GetFoundationModelAvailability，及配额码L-BD0D28A0／L-FC3AC7EE的GetServiceQuota：残留并发10／20，但精确版本均EOL，不作为可用名单。没有新增推理或支持case。

**11:43 JST补查更正：** 上述零配额不能推导全部入口不可用。官方说明Mantle部分模型不公开账号TPM；Qwen未出现在此前8条Mantle指标里，不能把缺项当0。实际执行`python .local/qwen_mantle_smoke.py`，同账号SSO临时凭证在内存以SigV4 service=`bedrock-mantle`签名：GET `/v1/models`=200、列出41个型号且含Qwen；POST `/v1/chat/completions`，model=`qwen.qwen3-235b-a22b-2507`，max_tokens16／temperature0.1／无重试，返回200／OK，13输入+2输出tokens。没有创建API key、上传简历或改Java／IAM；不是操场UI测试。证据ignored `.local/qwen-mantle-smoke-20261114.json`。此前唯一Runtime调用429保留，不再说“所有入口都不能用”。

## 7. 本地验证、失败命令与没有做的事

实际检查包括 `Get-Content`、`rg`／`rg --files`、`Get-ChildItem`、`git status --short`、`git diff --check`；PowerShell Parser.ParseFile；各root的fmt/validate/mock test；Gitleaks按scripts/docs/infra子目录扫描，全部脱敏输出。没有 commit/push，避免无意触发云CI。

| 验证 | 实际命令／结果 |
|---|---|
| 费用控制 Python | `python -c "...sys.path.insert(0,'.local/cost-sdk'); ...unittest.defaultTestLoader.discover('infra/cost-control')..."`，最新20通过；使用离线Stubber，不调用AWS |
| 费用控制 Terraform | `terraform -chdir=infra/terraform/cost-control test`，2个mock通过；不是云端apply |
| 模型 IAM 草稿 | portfolio fmt/validate/test：5通过；cicd fmt/validate/test：22通过；没有apply |
| 工具依赖 | `python -m pip install --target .local/cost-sdk boto3 --quiet --disable-pip-version-check`，仅本机ignored目录 |
| 扫描 | `D:\software\Gitleaks\gitleaks.exe dir <实际scripts/docs/infra子目录> --redact --no-banner`；`git diff --check`通过 |
| 早期应用检查 | `scripts/check.ps1`在npm ci遇到EPERM；用`npm install --ignore-scripts --package-lock=false`恢复后，单独前端build/64 tests和后端mvn test/9 tests通过；最近运维文档未重跑应用/容器构建 |

已发生且修正的辅助失败（不是云部署成功证据）：PowerShell不支持Bash `{a,b}`路径；`lambda list-policy-statements`不是有效CLI动作，改get-policy（未接通时ResourceNotFound为预期）；旧CLI不接受`get-service-quota --quota-applied-at-level ALL`，改合法单指标查询；未引号的Terraform backend参数被拆分，改参数数组；mock apply随机ARN无效，回到plan并检查可确定的阶段权限结构；AWS CLI日志在GBK终端编码失败，改SDK json ensure_ascii输出。脚本错误未当作AWS配额变化的解释。

原始日志、计划、版本清单、请求证据都在ignored `.local`；不要把目录整体发布。本文没重放删除、关停、推理或预算通知操作。

## 8. Mantle接入前权限与费用保护

本Story验收：确认已有默认项目、单模型权限草稿验证通过且默认关闭、费用控制器覆盖两入口、网站维持开启；Java与简历接入留到下一Story。[用户提供的概述](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html)推荐新应用优先Runtime，并未说Serverless没有限流；结合端点／配额文档与真实Mantle成功证据继续选定Qwen。

实际执行`python .local/verify_mantle_permissions.py`：SSO临时凭证SigV4签名GET `https://bedrock-mantle.ap-northeast-1.api.aws/v1/organization/projects`，确认本账号东京已有`project/default`；SDK `iam.simulate_custom_policy`验证单模型／项目allowed、五种越界implicitDeny，以及控制器生成的Runtime／Mantle Deny均explicitDeny，共8项通过。没有调用CreateProject、PutRolePolicy或模型推理；没有给业务角色新增授权。

以下为本次实际保存、审查、应用与收尾命令，变量与私有输入处理同第2节；plan/show/apply输出保存在ignored文件，未打印完整敏感计划：

```powershell
./scripts/cost-control.ps1 -Action status -AwsCli 'D:\software\AWSCLI\aws.exe'
& $tf '-chdir=infra/terraform/cost-control' plan -input=false '-var-file=../../../.local/cost-control.tfvars.json' '-out=../../../.local/cost-control-mantle-stop.tfplan' -no-color
& $tf '-chdir=infra/terraform/cost-control' show -json '../../../.local/cost-control-mantle-stop.tfplan'
& $tf '-chdir=infra/terraform/cost-control' apply -input=false -no-color '../../../.local/cost-control-mantle-stop.tfplan'
python .local/verify_mantle_deployment.py
& $tf '-chdir=infra/terraform/cost-control' plan -input=false '-var-file=../../../.local/cost-control.tfvars.json' -detailed-exitcode -no-color
```

show JSON逐项断言仅`aws_lambda_function.controller` update后才apply，结果0新增／1更新／0删除。部署核对脚本使用GetFunction读取State/LastUpdateStatus与签名下载地址，下载zip并校验CodeSha256及controller.py与本地一致；只Invoke action=status，再读S3状态、业务Lambda并发、CloudFront以及正式站HTTP health。结果Active/Successful、mode=on、resources=[]、consumed=[5,10,15]、并发5/1、CloudFront Enabled/Deployed、首页200及health200/UP；费用$19.021。最终真实plan退出0／No changes，原四档通知仍接通。证据`.local/mantle-permission-verification.json`、`.local/mantle-deployment-verification.json`及`.local/cost-control-mantle-stop-*.log`。

本轮辅助核对首次误写PROD函数名`kongportfolio`，GetFunctionConcurrency返回ResourceNotFound；读现有Terraform确认`kongportfolio-prod`后修正脚本并通过，不是业务故障。PowerShell下rg通配路径参数未展开／猜测outputs.tf不存在，改读已存在main.tf；没有因这些只读失败执行写操作。跨摘要查询旧进程ID失效，改读取已落盘apply日志并核对真实部署。模型授权两根栈未apply；本轮未再执行off/on，也未验证真实角色调用或再次停站。

## 9. Java有界接入与价格复核

价格实际使用Python urllib重新GET东京AmazonBedrock公开offer JSON，保存ignored `.local/qwen-current-price-verification.json`，publicationDate=2026-11-11T01:30:37Z。对model精确筛选，再区分`mantle-input-tokens-standard`／`mantle-output-tokens-standard`：每1K输入$0.00027、输出$0.00106，折算百万$0.27/$1.06。最初宽搜索还命中其他235型号／SKU，未用于报价。计算例8000入＋2000出时千次$4.28；不含税和其他服务。

实际实现：AWS Java SDK 2.59.0 auth/http-auth-aws及SSO/STS依赖，现代AwsV4HttpSigner；固定东京Mantle、Qwen与Standard档位。默认关闭，限制请求体／问题／输出／响应体／网络时间／单进程并发和滑动频率；只读固定公开资料摘要，访客问题不写回、不跨请求携带。保留空POST的原PREPARING探测，避免发布检查付费。[完整接口与边界](bedrock-java.md)。

实际验证命令（完整输出保存ignored日志）：

```powershell
& 'D:\software\apache-maven-3.9.11\bin\mvn.cmd' -B -ntp -f backend/pom.xml clean verify
& 'D:\software\apache-maven-3.9.11\bin\mvn.cmd' -B -ntp -f backend/pom.xml -Plambda clean verify
node scripts/test-lambda-package.mjs
# 工作目录frontend，未改前端源码或依赖：
npm.cmd run build
npm.cmd test
```

真实Java诊断只做一次：`AWS_PROFILE=kong-dev`，从本轮`test-lambda-package.mjs`解压出的`.local/lambda-package-*/lib/*`作为classpath，执行`java -Ddebug=false --class-path <该lib目录/*> .local/MantleJavaSmoke.java`。该程序直接使用新MantleGateway，16输出tokens上限、20秒、无重试、仅测试短句，不发送公开摘要／个人简历；返回OK、30输入＋2输出tokens，stdout仅成功标识及usage，证据`.local/bedrock-java-live-smoke.log`。Java使用缓存SSO临时凭证，没有创建API key或导出凭证。

只读云端预检使用SDK STS/GetFunctionConfiguration/ListRolePolicies，证据`.local/bedrock-java-cloud-preflight.json`：PROD/STG Active、timeout28、BEDROCK_ENABLED均未设置（默认false），没有Qwen inline调用策略。没有Terraform apply、代码上传、关停、生产发布或commit/push。完整简历、真实Lambda角色调用、三语质量及公开滥用控制尚未验收。

本轮辅助失败保留：首次未clean构建遇到target里旧Profile.class缺失，clean verify后解决；新增请求体签名测试最初将Flow的ByteBuffer与List<ByteBuffer>类型混用，修正适配后验证。核对中猜测backend.tf／infra/cicd路径不存在及一次rg引号解析失败，改读已有api.tf／infra/terraform/cicd与准确路径，没有修改云端。没有把这些失败算作通过。

## 10. 因费用选择简历全文方案，新增私有S3资料存储

用户明确选择便宜方案并要求写入学习指南，取舍与Lambda／ECS对应：普通私有S3＋Lambda实例内缓存＋逐次全文输入，当前不创建知识库、向量数据库、Embedding流水线或OpenSearch。不把AWS Assistant的$975作为通用知识库费用，也不承诺全文在所有用量下都最便宜。缓存减少S3读取，每次模型输入仍收费。

本地代码：新增S3／URL Connection SDK依赖和ApprovedFacts，允许20,000 Unicode码点／80KiB资料；懒读取固定对象版本、校验SHA-256和严格UTF-8、缓存只读资料，不缓存访客聊天；缺失／超限／版本或摘要错误返回FACTS_UNAVAILABLE，模型不调用。配置只存bucket/version/hash/owner，不存简历正文。新增4个资料读取测试和1个模型前置失败测试。

新增独立根栈infra/terraform/bedrock-content，复用已有State桶、key=bedrock-content/terraform.tfstate。本轮实际命令（仓库根目录，变量$tf沿用前文；本地输入／计划及输出均ignored）：

```powershell
$env:AWS_PROFILE = 'kong-dev'
& $tf '-chdir=infra/terraform/bedrock-content' fmt
& $tf '-chdir=infra/terraform/bedrock-content' init '-backend-config=../../../.local/bedrock-content.backend.hcl' -input=false -no-color
& $tf '-chdir=infra/terraform/bedrock-content' validate -no-color
& $tf '-chdir=infra/terraform/bedrock-content' test -no-color
& $tf '-chdir=infra/terraform/bedrock-content' plan -input=false '-var-file=../../../.local/bedrock-content.tfvars.json' '-out=../../../.local/bedrock-content-approved.tfplan' -no-color
& $tf '-chdir=infra/terraform/bedrock-content' show -json '../../../.local/bedrock-content-approved.tfplan'
& $tf '-chdir=infra/terraform/bedrock-content' apply -input=false -no-color '../../../.local/bedrock-content-approved.tfplan'
& $tf '-chdir=infra/terraform/bedrock-content' output -json application_environment
& $tf '-chdir=infra/terraform/bedrock-content' plan -input=false '-var-file=../../../.local/bedrock-content.tfvars.json' -detailed-exitcode -no-color
```

STS核对561798268037；ListRolePolicies核对STG目标新策略名尚不存在。show JSON检查9个精确地址全部create、账号正确、reader仅STG后apply；随后`python .local/review_bedrock_content_plan.py`再次严格复核保存计划，证据`.local/bedrock-content-plan-review.json`。真实apply 9新增／0更新／0删除，最终plan退出0／No changes；没有修改已有根栈、应用Lambda配置、PROD角色、审批或费用开关。

新桶kongportfolio-content-561798268037-ap-northeast-1，固定approved/facts.txt，Block Public Access四项true、AES256、BucketOwnerEnforced、TLS-only、Versioning Enabled、非当前版本90天过期。对象源是仓库已有公开摘要（623码点／1135字节），**没有上传完整简历**。STG策略只允许GetObjectVersion＋精确对象ARN＋批准版本条件，不授予列表／写入／删除／最新读取；旧版本用于回滚时须保留在rollback_version_ids，生产读取权限另审。

实际`python .local/verify_bedrock_content.py`：SDK GetBucketPolicyStatus/GetPublicAccessBlock/GetBucketVersioning/GetBucketEncryption/GetBucketOwnershipControls/GetBucketLocation/GetObject核对安全和数据摘要；GetRolePolicy／SimulatePrincipalPolicy验证目标版本allowed，其他版本／key、PutObject、DeleteObject、GetObject、ListBucket均implicitDeny，共7项。PROD无新policy，两业务Lambda未设置资料env、模型开关默认false／模型授权仍未开；保留并发5/1、费用status=on/resources=[]/consumed=[5,10,15]，actual19.021，首页／health200/UP。证据`.local/bedrock-content-verification.json`。

真实Java读取一次：从本轮Lambda ZIP解压lib作为classpath、AWS_PROFILE=kong-dev运行`java -Ddebug=false --class-path <该lib目录/*> .local/FactsJavaSmoke.java`；读取Terraform输出的bucket/version/hash/owner，返回Java S3 facts PASS codepoints=623 cacheReused=true modelInvoked=false。内容不输出日志，没有推理。证据`.local/bedrock-content-java-live.log`。

本地实际`mvn -B -ntp -f backend/pom.xml clean verify` 29通过，`-Plambda clean verify` 3通过，`node scripts/test-lambda-package.mjs`真实ZIP运行通过（38.6MiB／解压库43.1MiB），Terraform 4个mock通过。前端未修改，本增量未重复跑其测试；未做容器构建、业务角色真实S3读取或模型问答／线上UI验收。没有commit/push或应用上传。

辅助失败已修正：初始HCL单行嵌套block及跨行条件缺括号导致fmt/init前解析失败，未apply；mock apply之后再测source=null触发已有对象prevent_destroy，调整负例顺序后4项全通过；内联计划检查出现Windows引号相关SyntaxWarning，另存脚本严格复核通过；一次文档补丁标题未匹配未应用，读准标题后重做。失败没有算成功或绕过对象删除保护。

## 11. 用户履历DOC读取、脱敏和私有S3导入

用户提供本机DOC用于既定简历问答方案。只读确认OLE2格式、文件72,192字节；本机未找到PATH中的转换器，采用Apache POI HWPF解析。先从Maven Central读取poi-scratchpad元数据确认release=6.0.0，再在ignored `.local/doc-reader`准备独立辅助POM／Java程序；没有往应用pom加入Word解析依赖，也没有把文档发给转换网站或模型。

以下为实际执行形态，原始文件路径在公开索引中脱敏，真实路径只保存在本机／用户提供的上下文；不是可复制批量上传原文件的教程：

```powershell
mvn.cmd -B -ntp -f .local/doc-reader/pom.xml dependency:copy-dependencies '-DoutputDirectory=lib'
java --class-path '.local/doc-reader/lib/*' .local/doc-reader/ReadDoc.java '<用户指定的本地DOC>' '.local/profile-import-20261114'
python .local/doc-reader/prepare_facts.py
python .local/doc-reader/validate_profile_import.py
git check-ignore .local/profile-import-20261114/public-facts.md .local/profile-import-20261114/raw.txt
```

提取246段／10张表，原始文本、段落编号、表格结构及源文件SHA-256只存在ignored目录。按段落来源保留7段职业项目、技能、学业及资格取得记录；由用户确认现任／项目未变及资格未续情况，区分取得历史和当前有效状态。删除非必要个人字段、雇主实名和内部项目名，不添加转职动机或经验。资料统一UTF-8/LF，6,875码点／17,433字节，独立记录provenance；原DOC哈希未变。21个问答验收样例仅准备，未执行模型。

通过已有Lambda包的实际ApprovedFacts.validate进行Java本地校验（ignored .local/ValidateProfileFacts.java），验证资料满足20,000码点／80KiB；没有修改应用代码，无需重复前后端／容器构建。更新ignored live tfvars的approved_text_path为`.local`内脱敏资料，并将旧对象版本加入rollback_version_ids；旧环境指针归档previous-environment.json。

```powershell
$env:AWS_PROFILE = 'kong-dev'
& $tf '-chdir=infra/terraform/bedrock-content' plan -input=false '-var-file=../../../.local/bedrock-content.tfvars.json' '-out=../../../.local/profile-import-20261114/import.tfplan' -no-color
& $tf '-chdir=infra/terraform/bedrock-content' show -json '../../../.local/profile-import-20261114/import.tfplan'
python .local/doc-reader/review_import_plan.py
& $tf '-chdir=infra/terraform/bedrock-content' apply -input=false -no-color '../../../.local/profile-import-20261114/import.tfplan'
& $tf '-chdir=infra/terraform/bedrock-content' output -json application_environment
python .local/doc-reader/verify_profile_import.py
& $tf '-chdir=infra/terraform/bedrock-content' plan -input=false '-var-file=../../../.local/bedrock-content.tfvars.json' -detailed-exitcode -no-color
```

show严格断言仅aws_s3_object.approved[0]及STG reader inline policy两项update，账号正确、reader仅STG、原DOC不在source、旧版保留后apply。实际0新增／2更新／0删除。SDK下载新旧对象核对内容／hash，BPA及Versioning不变；真实IAM模拟8项通过：新资料和旧摘要allowed，其他版本／key、Put/Delete/GetObject最新/ListBucket implicitDeny。PROD无新读取授权，应用环境和模型开关／权限未变，费用状态on／consumed=[5,10,15]、网站及health200/UP。最终真实plan退出0／No changes。

从既有解压Lambda包的lib运行ignored `.local/ProfileFactsSmoke.java`，使用本地SSO和新version/hash读取S3：Imported profile Java S3 PASS codepoints=6875 cacheReused=true modelInvoked=false。当前环境指针与前一版本指针均存ignored目录，不进入Git。完整证据`.local/profile-import-20261114/{source-manifest,facts-provenance,validation,plan-review,cloud-verification,environment,previous-environment}.json`和各日志；此处不发布正文／原始提取物。

辅助问题保留：终端默认GBK无法打印日文符号，转用UTF-8读取预览；DOC软换行由控制字符表示，整理时按段落编号保留并归一化；Windows默认CRLF使首轮Java字节／码点数与Python规范化文本不一致，上传前明确UTF-8/LF并按原始字节重新验证hash。所有问题在上传前修正，未把不一致文件当作正确版本。没有执行推理、发送SNS／邮件、启用网站问答、应用部署或commit/push。

## 12. 严格白名单与范围拒绝

用户提供Amazon AI建议，并明确只开放本人相关问答；异步选项确认采用严格白名单：提供可问问题和常见表达，未识别即提示范围，不用模型付费判定。参考官方Denied Topics说明（不建议“All except…”反向规则）及ApplyGuardrail接口说明；本增量不创建Guardrails／分类模型／SageMaker等服务。

新增QuestionScope版本portfolio-scope-v1，17个审核主题、51个日中英标准问句及有限别名。NFKC、大小写／空白／标点归一化后完整匹配，不按“孔令通／简历”等关键词放行。QuestionService在并发／频率保护之后、facts.get与gateway.answer之前检查；通过后只发服务端固定模板，不传访客原文。范围外返回HTTP200、REFUSED／OUT_OF_SCOPE、三语固定提示、可选问题、modelInvoked=false及0 usage；拒绝也占本地次数。新增GET /api/bedrock/questions，不依赖S3／模型。审计仅记决策／规则版本／固定主题ID，不记原文；ALLOW只代表范围匹配。

实际本地验证：

```powershell
mvn.cmd -B -ntp -f backend/pom.xml clean verify
mvn.cmd -B -ntp -f backend/pom.xml -Plambda clean verify
node scripts/test-lambda-package.mjs
```

后端57/57，包括19类无关／夹带任务拒绝、51标准问句完整匹配、格式归一化、同名诱导、真实HTTP不读取资料／不调用模型、审计不含提问。Lambda4/4，新问题目录可在模型关闭时返回；ZIP真实运行通过，38.6MiB／解压库43.1MiB。前端没改，本增量未重复跑前端测试；原页面仍是准备状态，没有伪记新问答UI已上线。

私有资料原版本含“可解释一般算法／数学”一句，按新范围仅替换该条，职业事实不变；生成ignored `.local/scope-policy-20261114/facts.md`，6,943码点／17,637字节。实际`python .local/scope-policy-20261114/prepare_facts.py`保留上一版环境指针、更新live私有tfvars并将上一版加入rollback_version_ids。没有把正文加入Git。

```powershell
$env:AWS_PROFILE = 'kong-dev'
& $tf '-chdir=infra/terraform/bedrock-content' plan -input=false '-var-file=../../../.local/bedrock-content.tfvars.json' '-out=../../../.local/scope-policy-20261114/content.tfplan' -no-color
& $tf '-chdir=infra/terraform/bedrock-content' show -json '../../../.local/scope-policy-20261114/content.tfplan'
python .local/scope-policy-20261114/review_plan.py
& $tf '-chdir=infra/terraform/bedrock-content' apply -input=false -no-color '../../../.local/scope-policy-20261114/content.tfplan'
& $tf '-chdir=infra/terraform/bedrock-content' output -json application_environment
python .local/scope-policy-20261114/verify_cloud.py
& $tf '-chdir=infra/terraform/bedrock-content' plan -input=false '-var-file=../../../.local/bedrock-content.tfvars.json' -detailed-exitcode -no-color
```

严格show检查仅对象＋STG reader两项update、账号和source正确、旧版保留后apply，实际0新增／2更新／0删除。真实SDK读取hash及IAM模拟5项通过（当前／上版allowed，未知版／写／最新读取implicitDeny）；只允许既有精确对象的三版approved versions，PROD无读取策略，两业务模型权限及开关关闭，资料env未部署，费用状态on／consumed=[5,10,15]、health200/UP，最终plan No changes。

实际从最新解压Lambda lib运行ignored `.local/ScopeFactsSmoke.java`：读取云端固定版本与本地完全相等，6,943码点、cacheReused=true、modelInvoked=false；并导出51个标准问题到qa-cases.json，标注not_model_executed。旧21个宽范围样例仍作历史记录，不继续用“通用算法应回答”作为新验收标准。当前私有环境指针已更新，先前指针留在本轮previous-environment.json。证据`.local/scope-policy-20261114/{provenance,plan-review,cloud-verification,environment,previous-environment,qa-cases}.json`及日志。

用户随后“继续”，恢复读取已完成云端核查证据并补齐文档；旧PTY session ID已失效，改读落盘结果，没有重新推理、发布或重复apply。此轮没有模型调用／收费Guardrails创建／应用上传／生产切流／SNS消息／commit/push。新增接口及Java白名单尚未部署，STG还要验证policy版本、范围拒绝及模型调用质量；原PREPARING探测不足以验收这些功能。
# 13. STG Bedrock 发布与真实验收

验收：仅 STG 开启指定 Qwen 模型；固定脱敏资料版本；三语范围拒绝不调模型；三语正常问答实际调用；生产 live 版本及两道审批保持不变。原始简历、私有资料和测试回答不入 Git。

实际先恢复过期 SSO：`aws sso login --profile kong-dev --no-browser --use-device-code`，用户完成登录，STS 核对账户。只读预检保存 `.local/bedrock-stg-preflight.json`：无在途流水线，生产 live=18，两道人工审批存在，Source DetectChanges=false。

新增 STG-only 环境开关、固定资料参数和模型 IAM 依赖；共享 HTTP 合约增加问题目录，真实问答六项只放在 STG 验证，不进入生产 Green 的无推理合约。报告只存决策与 token 指标，不保存回答正文。

实际本地执行：

```powershell
node scripts/test-staging-contract.mjs
node scripts/test-green-contract.mjs
node scripts/test-deployment.mjs
node scripts/test-frontend-release.mjs
terraform.exe -chdir=infra/terraform/cicd fmt
terraform.exe -chdir=infra/terraform/cicd test -no-color
python .local/prepare-bedrock-stg.py
terraform.exe '-chdir=infra/terraform/cicd' plan '-input=false' '-no-color' '-var-file=../../../.local/bedrock-stg.tfvars.json' '-out=../../../.local/bedrock-stg.tfplan'
terraform.exe '-chdir=infra/terraform/cicd' show -json '../../../.local/bedrock-stg.tfplan'
python .local/review-bedrock-stg-plan.py
terraform.exe '-chdir=infra/terraform/cicd' apply '-input=false' '-no-color' '../../../.local/bedrock-stg.tfplan'
```

Node 合约通过，Terraform 25/25。首次测试把 map 与 object 直接比较导致一项断言失败，改用 tomap 后通过。首次辅助脚本误读费用状态键 status（实际 mode），且 PowerShell 未引用带点路径的 CLI 参数导致 plan 报错；未产生变更，修正后重新执行。实际费用 mode=on、consumed=[5,10,15]。保存 plan 严格核对：仅创建 STG 模型内联策略、更新 STG Lambda 环境；并发、运行时、代码及生产资源未纳入变更。实际 apply 1新增／1更新／0删除；私有启用参数保存到 ignored `infra/terraform/cicd/bedrock.auto.tfvars.json`，保留原有 live tfvars。随后的真实 plan No changes。

按明确文件范围暂存（排除 outputs／私有资料／.local／state／tfvars），Gitleaks目录、提交及完整历史扫描通过；提交并 push 到练习分支 `feat/aws-serverless-ci`，源码 `bd46abafcafcd0310f03c7ec48efb398ad9a01a7`。费用控制、S3资料及此前Java增量一并纳入版本控制，但没有再次部署这些根栈。实际 SDK 通过 `start_pipeline_execution` 并使用 COMMIT_ID 固定该源码，execution=`7ac11129-a64d-42fa-b9ff-77659e52c447`。启动前误用生产函数简称 `kongportfolio` 的只读检查得到NotFound，按实际 `kongportfolio-prod` 修正；未修改生产。

AWS candidate build `882deddf-9d51-4bc6-a5de-41f6385b4eec` 成功。STG build `cabe327a-1f2a-481f-b0c8-f98c6c51cee5` 发布版本22：8项HTTP合约、3条三语拒绝通过，实际日语自我介绍回答触及1024输出tokens上限，truncated=true，严格验收因此失败，没有生成passed报告／进入审批。模型调用及资料读取已打通，但不能称问答验收完成。保留完整结束断言和1024硬上限，在服务端提示词增加最多4短段／约200英文单词或400日中文字符、自我介绍只用一段、不重复整份履历的要求，准备通过AWS重新构建验证。日志读取曾遇本机GBK输出失败，改PYTHONIOENCODING=utf-8后成功；云端构建本身不受此编码问题影响。

修复提交／push源码`2a88cafc007e64768b8efae9127e56bb18c3b576`，再次通过Gitleaks hooks。实际Git操作使用明确pathspec暂存本轮backend／docs／infra／scripts及根目录log／learning／README／.gitignore，未用git add .，outputs仍未跟踪；提交／发布命令如下。最终文档提交另用docs标题，不再次启动流水线。

```powershell
git diff --cached --check
node .githooks/check-staged-paths.mjs
git commit -m 'feat: bound Bedrock portfolio questions and enable staging verification'
git push origin feat/aws-serverless-ci
git add -- backend/src/main/java/dev/kongortfolio/bedrock/QuestionService.java docs/aws-commands-20261114.md
git commit -m 'fix: keep portfolio model answers within the staging output budget'
git push origin feat/aws-serverless-ci
```

以下ignored助手保存本次证据，不是仓库公共脚本；SDK沿用SSO，不在脚本写入密钥。

```powershell
python .local/start-bedrock-stg.py
python .local/poll-bedrock-stg.py
python .local/fetch-bedrock-stg-report.py
# 等前一批六次请求离开60秒限流窗口
python .local/bedrock-stg-quality.py
python .local/verify-bedrock-stg-final.py
terraform.exe '-chdir=infra/terraform/cicd' plan '-input=false' '-no-color' '-detailed-exitcode'
python .local/check_aws_docs.py
git diff --check
```

实际SDK：`get_object`读取费用状态；`get_alias`／`get_function_configuration`／`get_role_policy`核对环境；`start_pipeline_execution(sourceRevisions=COMMIT_ID)`固定源码；`get_pipeline_execution`／`list_action_executions`／`batch_get_builds`／`get_log_events`跟踪结果；S3 `get_object`下载该次报告，核对commit／execution／摘要；`lambda.invoke`只调用STG发布版本23，保存私有回答并做事实抽查；最后HTTPS GET生产health。没有调用生产审批或生产部署API。

第二轮execution=`6c2aa1d9-f520-44fc-ae71-7ee7f3cfc3f3`，candidate build=`950a7e57-30fb-40fb-ba61-6b45ee24cc08`，STG build=`e9c05569-2c30-4614-ba6c-459e1186cdf5`。AWS构建通过前端64／后端57／Lambda 4项、ZIP真实运行及发布保护合约；ZIP38.6MiB／解压43.1MiB。STG23／release=`3796747ae3f8a3fdbdb39262ad6857f388291092cf3a47b24dd943e6e6d8a98d`／backend SHA256=`e5dd2041e5083fc2f37a1ef8370361e35ed8cbbc9c52bcad8bd48d306863ebdd`，与本次候选一致。

STG报告8项HTTP通过；三语范围拒绝均无模型调用／0 tokens，三语正常回答均未截断。补充6项：当前项目、SAP未续、转职理由未给、团队成果归属、伪造新技能被拒绝、后续技能回答未采用该断言；5条模型输出完成事实抽查、1条固定拒绝通过。补充调用约1.0–3.6秒／条，均为热环境样本，不代表公网延迟或冷启动SLA。一条中文用繁体及日文职称，记录风格限制；没有覆盖51问的全部模型输出。

8次成功推理总41,563输入／2,059输出tokens，按输入$0.27／百万、输出$1.06／百万估算$0.013405；平均千次短回答约$1.68，非固定报价，另计首次截断调用、税／CodeBuild／Lambda等费用。09:58 UTC核对：生产live=18且RevisionId／路由不变、功能仍关闭、health200/UP；费用mode=on／consumed=[5,10,15]。流水线等待第一审批，第二审批仍存在，Green／切流／前端发布均未执行。最终真实cicd plan No changes。前端未改，没有公网STG页面、知识库或Guardrails。

证据：`.local/bedrock-stg-{preflight,run,run-first,report,progress,final-verification}.json`、`bedrock-stg-{plan,apply,final-plan}.log`、`bedrock-stg-quality/`及AWS构建日志。报告取回曾早于CodePipeline更新状态而断言“未成功”，等待状态传播后成功，没有重跑模型。文档补丁曾因上下文不匹配被原子拒绝，核对原文后重做，无改动丢失。最终文档提交不启动新候选流水线、不推进生产审批。

# 14. 个人问答前端（本地增量）

用户继续后，验收范围为三语问题选择／回答／范围提示／等待和错误处理，兼容现有生产PREPARING；桌面与手机弹窗可用。实际读取AGENTS、BedrockController、既有入口／Modal／语言／CSS与手机布局约定；本地实现[前端说明](bedrock-frontend.md)，不部署AWS。

```powershell
git status --short
rg --files -g AGENTS.md -g '*Bedrock*' -g '*bedrock*' frontend docs
python .local/update-qa-entry-copy.py
# 以下在frontend目录执行
npm test -- --reporter=dot
npm run build
npm run dev
# 以下在仓库根目录执行
node .local/qa-frontend-browser.mjs
python .local/check_aws_docs.py
git diff --check
gitleaks dir --redact --no-banner frontend/src
gitleaks dir --redact --no-banner docs
```

新增API解析／三语文案文件，替换BedrockEntry与专用CSS；更新App卡片状态及旧准备文案。目录GET8秒、问答POST32秒，只发message／language；429显示Retry-After倒计时，504超时，503暂不可用，未知或畸形响应失败，不展示服务器内部详情。不自动重试；关闭／语言变化取消等待，旧响应不写回；回答作为文本呈现。UI只提供后端审核问题的选择，Java仍完整校验白名单。

验证：前端73/73＋生产构建通过。第一次App测试保留旧文案断言，更新后通过。最初Playwright缺少捆绑Chromium，改用已安装Chrome channel，没有另装浏览器；复用现有WebKit。首次浏览器检查发现焦点恢复失败：Modal清理时先调用原生close释放top layer，再恢复焦点；入口点击显式focus兼容WebKit；补齐jsdom原生close模拟。修正长回答左对齐、字号与吸顶关闭栏后，Chrome桌面／两手机宽度和WebKit竖横屏共15组三语通过。每组验证17目录选项、主动提交前零POST、单次提交字段、长回答无横溢、父弹窗／焦点／页面滚动恢复，无pageerror。所有API均Playwright route fixture，示例回答明确说明没有调用模型。

证据脚本与报告／截图：ignored `.local/qa-frontend-browser.mjs`、`.local/qa-frontend-browser/report.json`及15张png；仅本地UI证据，不能当作真实STG浏览器或iPhone真机验收。首次文件搜索的PowerShell通配符写法和不存在的拆分tsconfig路径报错，随后按实际目录与tsconfig.json读取；一次过宽.local搜索产生无关浏览器缓存文件列表，改为顶层定向查找。替换文件的初次补丁因同路径删除／新增被工具拒绝，分开执行成功；没有丢失用户文件。

本轮未改变后端／Terraform／AWS资源，未做新模型调用、后端／容器重测、commit／push或AWS发布／审批。旧待审批候选不含本地新UI；下一轮必须从新源码构建并验证，不把批准旧候选当作新UI发布。

最终检查19份文档、92个相对链接、28个脚本引用通过；前端源码、docs及根目录log／learning／README经Gitleaks扫描无泄漏（根目录三文件使用`Get-Content -Raw -Encoding UTF8 ... | gitleaks stdin --redact --no-banner`）。git diff --check通过，模拟报告15/15通过且modelCalled=false。验证完成后Ctrl+C停止本轮启动的Vite，未停止其他服务；预览截图仍保留。私有文档检查器的一次内联Python更新因PowerShell转义报SyntaxError，改用apply_patch后成功，没有影响产品代码或报告。

# 15. 公开入口限流／费用关停核对（配置与修复尚未部署）

验收：只读检查网关、并发、逐请求限制、费用关停覆盖及生产状态；形成最小计划并验证，不推进审批。读取AGENTS／api.tf／Controller／QuestionService／MantleGateway／成本控制源码与相关测试，核对官方HTTP API限流、路由优先级、Lambda并发作用范围及Budgets数据延迟；结论见[检查说明](bedrock-public-readiness.md)。

```powershell
aws.exe sts get-caller-identity --profile kong-dev --region ap-northeast-1 --query Account --output text
python .local/audit-bedrock-public.py
python .local/verify-public-cost-wiring.py
terraform.exe '-chdir=infra/terraform/portfolio' fmt '-no-color'
terraform.exe '-chdir=infra/terraform/portfolio' test '-no-color'
terraform.exe '-chdir=infra/terraform/portfolio' plan '-input=false' '-no-color' '-out=../../../.local/bedrock-public-throttle.tfplan'
terraform.exe '-chdir=infra/terraform/portfolio' show -json '../../../.local/bedrock-public-throttle.tfplan'
python .local/review-public-throttle-plan.py
mvn.cmd -B -ntp -f backend/pom.xml '-Dtest=BedrockEnabledApiTest#nonCanonicalPathsCannotReachModelService' test
mvn.cmd -B -ntp -f backend/pom.xml clean verify
mvn.cmd -B -ntp -f backend/pom.xml -Plambda clean verify
node scripts/test-lambda-package.mjs
python .local/verify-public-http.py
node scripts/test-staging-contract.mjs
node scripts/test-green-contract.mjs
node scripts/test-deployment.mjs
node scripts/test-frontend-release.mjs
```

CLI实际路径沿用D:/software工具目录，Terraform明确AWS_PROFILE=kong-dev，Maven前加载scripts/tools.ps1。ignored助手操作：STS身份、API get_apis/get_stage/get_routes/get_integrations；Lambda配置／别名／URL与策略读取；IAM两业务角色策略读取；控制Lambda get_function后下载临时签名URL的ZIP，仅比对controller.py字节（不打印URL）；S3只读费用状态；Budgets四档描述／通知／订阅者读取；SNS只列控制器订阅；CodePipeline读取两审批；CloudFront读取配置及API缓存策略。IAM simulate_principal_policy核对控制器仅能写两指定角色策略，simulate_custom_policy核对双Bedrock入口Deny。没有put/update/apply/invoke控制器／publish SNS操作。

19:40 JST审计：PROD live18／模型关闭／无新增模型和资料权限，STG权限存在；并发5/1、28秒、无Function URL。默认API1请求秒／突发5、无问答覆盖项，execute-api仍公开。费用on／consumed=[5,10,15]，下一档25，四预算实际费用仍为延迟数据$19.021。预算通知实际采用100%预算金额（$5/$10/$15/$25），与四对应SNS和已确认Lambda订阅、来源调用权限一致。部署控制器与本地源码hash一致，Runtime／Mantle均Deny模拟通过；对两个目标角色可PutRolePolicy、无关角色implicitDeny。不执行真实停站、跨档或SNS投递。

Terraform仅添加`POST /api/bedrock`及route_settings目标0.1请求秒／突发1／detailed_metrics=false，默认资料限流不变。首次测试误把未设置／computed字段按false和整对象比较而失败，改为只断言审查字段并显式关闭详细指标，6/6通过。真实保存plan严格检查仅1create路由／1update stage，其他API设置、代码／环境／IAM／别名均无变化；未apply。第一次内联Python计划检查被PowerShell引号转义破坏，改ignored review脚本后通过。

路径防绕过测试最初在`/api/bedrock;alias=1`实际返回mock模型回答200，未记为通过。Controller改为先检查原始URI精确等于/api/bedrock，再处理功能开关／请求；7种路径参数、编码、重复斜线、尾斜线／点段写法不再调用service。Lambda5项和实际ZIP验证两种变体返回400／INVALID_PATH且raw URI保留，规范空POST仍200／PREPARING；后端58/58、ZIP38.6MiB／解压43.1MiB通过，均无真实模型调用。路径修复后重复全量测试用于验证最终代码。

只读HTTPS：CloudFront和直连API的health均200/UP且no-store，空POST生产返回PREPARING；CloudFront两API行为CachePolicy TTL0、允许POST、HTTPS。生产alias RevisionId／18版本不变，新route_settings仍未应用。助手首次误用CloudFront返回字段OrderedCacheBehaviors，改SDK实际CacheBehaviors后通过；费用助手先误把默认PERCENTAGE阈值当绝对值、又忽略IAM聚合ResourceSpecificResults，按实际结构修正后核对通过，不修改预算或权限。若干猜测文件名不存在的读取已用rg定位实际api.tf及src/lambda目录；文档补丁上下文不符时原子拒绝，核对后重做。

证据：ignored `.local/bedrock-public-{audit,cost-verification,http-verification,plan-review}.json`、`bedrock-public-throttle.tfplan`及plan JSON／日志、Terraform测试日志、path-probe失败／path-fixed／backend／lambda日志。本轮未commit/push、未新建收费服务、未apply／SNS／关停／模型生成／生产审批；未重复未改前端或容器测试。限流是否返回真实429、冷请求总耗时及新版本STG验收仍待后续。

收尾追加只读核对四个SNS topic的budgets.amazonaws.com发布策略、账号条件与来源ARN，及四预算MONTHLY／COST／无服务过滤／含税不含credit-refund，均通过。计划检查另核新路由复用现有integration并指向生产live：先误按直接Lambda ARN判断，实际为API Gateway包装后的invoke URI，按明确两种合法格式校验后通过，未修改integration。

最终`terraform fmt -check`／`validate`、20份Markdown／100相对链接／28脚本引用、git diff --check通过；backend/src、portfolio Terraform、docs、根log／learning／README与LambdaPackageSmoke经Gitleaks扫描无泄漏。前端上一Story73项及15组浏览器证据保留，本轮未重跑未改前端。没有把本地修复记作STG23或生产已部署。

# 16. 应用问答网关限流并验证（未开启生产模型）

用户继续授权应用两项网关配置；验收为新route_settings实际生效、空POST可观察429、普通资料及health正常、代码／环境／并发／live／费用状态不变、不推进审批。使用原live tfvars，不覆盖其他配置。

```powershell
aws.exe sts get-caller-identity --profile kong-dev --region ap-northeast-1 --query Account --output text
python .local/prepare-throttle-deploy.py
$env:AWS_PROFILE = 'kong-dev'
terraform.exe '-chdir=infra/terraform/portfolio' plan '-input=false' '-no-color' '-out=../../../.local/bedrock-throttle-deploy/deploy.tfplan'
terraform.exe '-chdir=infra/terraform/portfolio' show -json '../../../.local/bedrock-throttle-deploy/deploy.tfplan'
python .local/review-public-throttle-plan.py .local/bedrock-throttle-deploy/plan.json .local/bedrock-throttle-deploy/plan-review.json
terraform.exe '-chdir=infra/terraform/portfolio' apply '-input=false' '-no-color' '../../../.local/bedrock-throttle-deploy/deploy.tfplan'
python .local/verify-throttle-deploy.py
python .local/diagnose-throttle-routes.py
python .local/finalize-throttle-deploy.py
python .local/record-throttle-pipeline-state.py
terraform.exe '-chdir=infra/terraform/portfolio' plan '-input=false' '-no-color' '-detailed-exitcode'
python .local/sync-throttle-status-docs.py
python .local/check_aws_docs.py
git diff --check
```

plan-review助手新增可选输入／输出参数，保留上一Story证据；新before快照防覆盖。严格检查plan只有POST /api/bedrock路由create与stage update，新路由复用原integration／生产live，默认路由限流／日志设置不变，无Lambda／IAM／alias变更。实际apply：1新增／1更新／0删除，配置rate0.1、burst1、DetailedMetrics=false；API自动部署状态DEPLOYED。

实际SDK只读getStage／getRoutes／getDeployment、Lambda配置／并发／别名、S3费用状态hash、CodePipeline配置／执行状态；HTTP只发送空正文POST和GET profile／health，不发送简历或问题。第一遍检查器错误假设profile包含locale字段，四条POST已执行后抛KeyError；改为按真实role字段验证。正式小批：直连第一批全200，第二批200／200／429／429，profile均200；CloudFront两批8条全200，有限测试因此失败，未弱化断言写成通过。

读取API访问日志确认16条探测都命中POST专用路由，排除落入ANY路由或未部署；保持rate／burst原值，针对CloudFront用一条复用连接补测，最多12次、观察到429即停，实际首条429，随后profile200。含首次错误检查4条在内，共21个空POST；追加日志核对，17条已保存requestId全匹配，含CloudFront429。证明有限样本出现网关节流，不证明严格6次/分钟或固定比例；记录全200样本。HTTP／Lambda请求仍可计费，模型生成次数0。

两入口health200／UP／no-store，PROD/STG校验code hash／环境／Role／Timeout／Memory／RevisionId／并发均与before相同，生产live版本18及alias RevisionId／RoutingConfig一致，生产模型仍关闭，费用状态hash一致。最终真实plan No changes，不重跑本轮未改Java／前端／容器。没有IAM写、SNS投递、off/on、CodeBuild或新候选启动、审批／切流。

旧流水线只读检查的“等待第一审批”断言失败；查询实际记录后确认execution6c2aa1d9-f520-44fc-ae71-7ee7f3cfc3f3已Stopped，源码2a88caf，第一审批19:05成功、Green19:06成功，无DeployProduction／PublishFrontend动作。此前当前状态描述沿用18:58记录，本轮已纠正；不推断谁批准／停止，也不复用旧审批。当前两道人审定义保留，下一次新候选需重新审批。一次内联Python把$default传给PowerShell导致stage字段读取为空，改文件脚本后正确读取；未执行任何对应写操作。

证据：ignored `.local/bedrock-throttle-deploy/{before,plan-review,http-progress,cloudfront-followup,route-diagnosis,verification,pipeline-status}.json`、保存plan／plan JSON／plan.log／apply.log／final-plan.log。第一次和后续失败检查均保留，不以删除失败样本方式宣称通过。新界面和Java路径修复仍为本地改动，下一步准备生产权限／固定资料环境与新候选。

收尾证据检查通过：两入口429、17/17日志、live18／应用配置／费用状态未变、旧执行Stopped及最终No changes。20份Markdown／101相对链接／28脚本引用和git diff --check通过；docs、根log／learning／README经Gitleaks扫描无泄漏。没有为了检查重放apply或模型请求。

# 17. 准备生产模型／资料权限及LATEST参数

用户继续；验收为仅指定模型／资料版本可读、参数有界、live18和版本数量不变、版本发布仍经过首道人审。本轮不做新生产模型调用。原publish=true会在环境更新时发布版本，因此新增pipeline_owns_lambda_versions及只读既有live alias数据源；生产采用publish=false，只配置LATEST，首道人审后由CodeBuild发布候选Green。默认首次建站路径仍沿用原publish=true。

```powershell
terraform.exe '-chdir=infra/terraform/portfolio' fmt '-no-color'
terraform.exe '-chdir=infra/terraform/portfolio' test '-no-color'
terraform.exe '-chdir=infra/terraform/bedrock-content' test '-no-color'
node scripts/test-green-contract.mjs
node scripts/test-staging-contract.mjs
node scripts/test-deployment.mjs
node scripts/test-frontend-release.mjs
node --check scripts/verify-green.mjs
python .local/prepare-bedrock-prod.py
$env:AWS_PROFILE = 'kong-dev'
terraform.exe '-chdir=infra/terraform/bedrock-content' plan '-input=false' '-no-color' '-var-file=../../../.local/bedrock-prod-config/content.tfvars.json' '-out=../../../.local/bedrock-prod-config/content.tfplan'
terraform.exe '-chdir=infra/terraform/portfolio' plan '-input=false' '-no-color' '-var-file=../../../.local/bedrock-prod-config/portfolio.tfvars.json' '-out=../../../.local/bedrock-prod-config/portfolio.tfplan'
# 对两个保存plan分别show -json后进行严格审查
python .local/review-bedrock-prod-plans.py
terraform.exe '-chdir=infra/terraform/bedrock-content' apply '-input=false' '-no-color' '../../../.local/bedrock-prod-config/content.tfplan'
terraform.exe '-chdir=infra/terraform/portfolio' apply '-input=false' '-no-color' '../../../.local/bedrock-prod-config/portfolio.tfplan'
python .local/verify-bedrock-prod-config.py
terraform.exe '-chdir=infra/terraform/bedrock-content' plan '-input=false' '-no-color' '-detailed-exitcode' '-var-file=../../../.local/bedrock-content.tfvars.json'
terraform.exe '-chdir=infra/terraform/portfolio' plan '-input=false' '-no-color' '-detailed-exitcode'
python .local/sync-prod-config-docs.py
```

prepare助手只读核对账户、别名／live环境、已发布版本列表、并发、费用状态hash，下载现有固定S3版本校验hash（不打印正文），保留原live内容输入，生成两个私有输入。首次把approved_text_path相对路径按仓库根解析导致FileNotFound，改为按bedrock-content根栈解析后通过；未重写资料。测试中对测试变量的引用产生弃用警告，显式声明测试账号；各test文件显式关闭生产启用参数，避免真实auto.tfvars影响安全默认值测试。最终portfolio13／资料5项通过。

计划审查只允许：精确对象GetObjectVersion、现有当前／两个审核回滚版本的生产reader策略create；生产模型策略create（Mantle、东京default、单Qwen条件）；Lambda环境及publish=false update。其他runtime／handler／memory1024／timeout28／并发5／code hash相同，alias无变更。实际apply资料1新增／0更新，portfolio1新增／1更新，0删除；没有S3对象更新或代码上传。随后复制私有content输入到原.local/bedrock-content.tfvars.json，复制生产增量输入到ignored infra/terraform/portfolio/bedrock.auto.tfvars.json，保留原terraform.tfvars。git check-ignore确认两者私有。

真实SDK验证：get_alias/get_function_configuration逐字段对比live18、get/ListVersions确认新增版本0、LATEST code hash相同而固定环境已就绪；10次SimulatePrincipalPolicy覆盖允许与拒绝边界，SimulateCustomPolicy合并实际Allow与费用Deny仍explicitDeny；读取费用S3状态hash不变，GET公开health200/UP，两道人审定义保留。IAM模拟不是实际生产角色S3／模型调用；后者待新Green验证。本轮没有lambda.invoke、PublishVersion、SNS、模型生成或审批。verification.json记录11:44 UTC，即20:44 JST。两根栈最终No changes。

Green脚本离线增量：requireProductionConfig校验固定资料、最多1024／15秒；requireReviewedBedrockRelease核对同候选STG真实问答报告、三条零token拒绝及三条生成证据；第一审批后、发布Green后先调用日语问答并获取Invoke Tail，提取真实REPORT冷／执行时间合计<28秒，再验证剩余五条，不先health预热。日志和report只存安全指标，正文留构建临时文件。冷记录缺失／样本过慢失败；复用已热版本不能算冷验证。Node测试使用合成REPORT验证多行日志、热调用、超时边界，没有实际模型调用。真实冷请求不是已完成项，样本也不能保证所有公网时延。

新代码尚未commit/push，未启动AWS候选；新前端／路径修复仍本地。证据为ignored `.local/bedrock-prod-config/{before,plan-review,verification}.json`、两个tfplan／plan JSON、content／portfolio plan／apply／final-plan日志，原私有内容输入备份保留。没有更改简历事实、创建API key／知识库或付费新服务，未重跑未改应用／容器测试。

收尾补齐执行状态保护：requireApprovedContext要求当前执行InProgress，Stopped旧执行不能复用审批；最初部署／前端测试fixture未带status而失败，按真实API字段补齐后相关Node合约全通过。持久化生产auto.tfvars后再次跑portfolio13项确认测试不受live启用参数影响；validate／fmt-check通过。文档检查21份／108相对链接／28脚本引用、git diff --check及portfolio／资料／scripts／docs／根log-learning-README的Gitleaks无泄漏。未把脚本离线测试称为真实生产冷问答通过。

# 18. 新源码候选构建与STG验收（已通过，等待第一审批）

用户继续授权提交新源码并运行AWS候选，到第一道生产审批即停。新助手`.local/bedrock-candidate-run.py`分为preflight／start／poll／report：使用SSO，只显式启动一次指定COMMIT_ID的新执行，不调用任何审批API，不写生产代码。预检无在途候选、live18／无权重、公开模型关闭，LATEST和STG资料／输出上限一致，费用状态on，Source分支feat/aws-serverless-ci且DetectChanges=false，两道人审在。

```powershell
python .local/bedrock-candidate-run.py preflight
python .local/check_aws_docs.py
git diff --check
# 明确pathspec暂存frontend/src、三个backend改动、docs、两个根md及README、相关infra和六个scripts；不包含outputs／.local／tfvars
git commit -m 'feat: stage profile Q&A UI and production release guards'
git push origin feat/aws-serverless-ci
python .local/bedrock-candidate-run.py start
python .local/bedrock-candidate-run.py poll
# STG完成且等待第一审批后取同次报告
python .local/bedrock-candidate-run.py report
```

开始前21份文档／108链接／28脚本引用及diff检查通过。本地应用／Terraform检查沿用前几Story已通过结果，新的完整构建、前端73／后端58／Lambda5及实际ZIP验证交给AWS运行；不预先宣称云上通过。构建完成后另补源码／执行／制品／STG版本与token指标。私有旧run文件不覆盖，证据在ignored `.local/bedrock-release-20261114/`。

实际按明确pathspec暂存39个文件，Git hooks路径检查及staged扫描、pre-push58提交全历史扫描无泄漏；commit978a636dd9029cfdebec9d43ce4cf50a1b1ff7c9推送练习分支。未加入outputs／私有材料／tfvars／state。新执行61bcc02c-2138-44fd-9a9e-ed78443f6851由StartPipelineExecution的sourceRevisions COMMIT_ID固定该源码，启动前比对remote分支head与本地commit一致；Source DetectChanges=false，没有依赖自动触发。

AWS candidate build=kongportfolio-candidate:5f7c67c8-88b4-44c0-8bca-84c363ff70da；sourceDirty=false，前端73、后端58、Lambda5、实际ZIP及Node发布守卫通过。STG build=kongportfolio-stg:9e63671f-11f0-47a6-a6ff-1cfa41104391，通过并发布24；8项HTTP合约及6条范围请求通过。三语生成分别5184入／429出、5195入／176出、5204入／269出tokens，未截断；三语范围拒绝各0 tokens／modelInvoked=false。下载同次StagingReport zip，仅读取report.json，核对execution／gitCommit／release及实际已发布CodeSha256。release=be998dc666b8d709c4a2638d9a6da92669f1149146d02a6035dbfa239dd7612a，backend SHA256=b1f8af77d8109997c591efc90f443cbda957a91da0db4f63f5cea4e06178ce75。

追加实际命令：`python .local/verify-candidate-stg-extra.py`，以SDK lambda.invoke仅调用STG24：空正文POST两种路径变体返回400／INVALID_PATH，GET日中英目录各17项，所有响应no-store；不发新生成问题，不消耗额外模型tokens。再次核对生产别名、LATEST配置、费用状态hash和health正常，执行当前仅到第一审批，未有VerifyGreen／第二审批／DeployProduction／PublishFrontend动作。3次生成合计15,583入／874出，按当日已核对Mantle单价估算$0.00513385，另有构建／Lambda／税等费用，非账单总额。

本轮未apply／发布生产版本／执行审批／发送SNS或关停。只有STG后端版本部署，新界面是同次候选的校验产物，没有独立公网STG网页，浏览器到真实模型E2E未做。按AGENTS保留两道人工审批，准备[本次审批说明](bedrock-candidate-approval.md)：用户第一审批后才运行Green发布／真实角色三语问答与冷记录验证，不直接切流。

补录阶段仅改文档，另以docs提交推送，不新启候选；源码仍固定978a636，新docs HEAD不能替代当前候选身份。私有状态同步助手一次因过时文案断言中止，已保留此前已完成的文档更新、改成可重复同步并核对实际文本后完成，产品代码未改。SDK/helper日志只打印状态和安全指标，不打印简历／模型回答／审批token。

同SHA的独立CI项目也核对成功：frontend fe892cb4-ed12-48b4-8ed4-ce5d00176139、backend f0e0e4e7-6d7d-4f0d-8d6c-ef9ae6b17e2c。STG代码由CI拥有，cicd根栈最终真实plan No changes，未apply。收尾22份文档／119相对链接／28脚本引用、diff检查及扫描通过；未再跑已通过的模型测试或新启流水线。

# 19. 用户第一审批后的Green复核及第二审批交接

用户OK后先查询实际状态，确认第一审批成功才观察Green。验收为同一源码／制品、真实生产角色问答和冷启动通过，live18与费用状态保持不变，停在第二审批。助手不调用PutApprovalResult，不重复模型测试。

```powershell
python .local/bedrock-candidate-run.py poll
python .local/review-current-green.py
python .local/check_aws_docs.py
git diff --check
# 明确暂存本次8份文档，执行提交／推送hooks扫描
git add -- AWS_EXECUTION_LOG.md AWS_LEARNING_GUIDE.md README.md docs/aws-commands-20261114.md docs/bedrock-candidate-approval.md docs/bedrock-frontend.md docs/bedrock-production-config.md docs/bedrock-public-readiness.md
git commit -m 'docs: record Green validation and second approval handoff'
git push origin feat/aws-serverless-ci
```

只读SDK使用get_pipeline_execution／list_action_executions、CodeBuild list_builds_for_project／batch_get_builds、CloudWatch get_log_events、S3 get_object读取同次GreenReport zip、Lambda get_alias／get_function_configuration和GET公开health。构建最初运行中，等待其自然完成；助手另按execution环境变量定位构建，保存完整构建元数据与日志到ignored目录，仅打印安全检查指标。执行仍61bcc02c-2138-44fd-9a9e-ed78443f6851，源码978a636dd9029cfdebec9d43ce4cf50a1b1ff7c9，没有start_pipeline_execution或本机上传生产代码。

Green build=kongportfolio-green:e542f5cf-2e0f-43cd-b4be-9c086bf3475d，SUCCEEDED，生产新版本20。下载GreenReport仅包含report.json，核对execution／source／release／backend SHA／实际Lambda hash与候选及STG24完全一致，第一审批action ID存在。8项HTTP、3语回答和3语拒绝通过；REPORT冷启动init4722.55ms＋duration6360.09ms＝11082.64ms。日语5184／411、中语5195／164、英语5204／273输入／输出tokens，拒绝各0且modelInvoked=false，总15,583／848，按已核对单价估算$0.00510629，未含税及其他AWS费用。

21:37 JST核对live仍18、RevisionId与权重不变，Green20角色／超时／内存／资料及其他环境均匹配审核快照；费用状态字节hash不变、health200／UP。实际ReleaseMode=deploy，ApproveTrafficShift当前InProgress，尚无DeployProduction／PublishFrontend动作。下一步由用户进入ApproveTrafficShift → ApproveBlueGreenDeployment → Review，审查Blue18／Green20／源码978a636后批准；这会授权真实10%五分钟后全量切流和后端成功后同候选网页发布。项目AGENTS两道人工审批要求保留，不用“OK”代发批准API。

证据：ignored `.local/bedrock-release-20261114/{green-build,green-report,green-verification}.json`和green.log。另一次rg把Windows通配文件名作为路径而读取失败，改目录＋-g过滤后完成只读检索，未影响AWS操作。文档提交只同步执行记录／学习／README与当前审批说明，不改变固定候选源码；没有新收费服务、apply、SNS或off/on。单次冷样本不保证所有时延，未把报告合约检查当作所有问句零幻觉或公网浏览器真实E2E。
