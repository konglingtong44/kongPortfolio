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
# 13. STG Bedrock 发布与真实验收（进行中）

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
