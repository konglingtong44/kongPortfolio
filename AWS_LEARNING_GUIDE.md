# kongPortfolio AWS 学习手册

更新：2026-11-14。学习起点：React + Spring Boot代码已经在GitHub，本项目还没有部署到AWS。IAM/SSO的建立过程略过，直接使用你会配置的kong-dev登录。

这是一份按首次搭建顺序重新编排的学习文档。与按发生时间记账的[AWS_EXECUTION_LOG.md](AWS_EXECUTION_LOG.md)不同，这里从第1步开始教你理解和操作。每步区分“人亲手做什么”和“脚本/AWS替你做什么”，保留实际结果和故障。

**使用范围：** 以下搭建过程已经做完，用于学习，不要对现在的环境从头重复创建。<...>要替换；旧计划不能复用。实际起点已有IAM、两个预算和一个旧Route53托管区，所以“从零”指本项目的State、网站、CI/CD尚未建立，不假装当时AWS账号里什么都没有。

## 先看两条路线

访问网站时：

```mermaid
flowchart LR
  U[浏览器] --> D[Route53解析域名]
  D --> CF[CloudFront HTTPS]
  CF -->|静态页面| S3[私有S3里的React文件]
  CF -->|/api路径| A[API Gateway HTTP API]
  A --> L[Lambda live别名]
  L --> J[Spring Boot数字版本]
```

Route53负责DNS解析，HTTP内容本身由CloudFront等服务处理，不经过Route53转发。

发布代码时：

```mermaid
flowchart LR
  G[GitHub源码] --> C[AWS构建候选包]
  C --> S[STG验证]
  S --> P1[人审1]
  P1 --> V[生产Green验证]
  V --> P2[人审2]
  P2 --> CD[CodeDeploy后端灰度]
  CD --> F[S3上传与CloudFront前端发布]
```

| 工具 | 你在哪里使用 | 负责什么 |
|---|---|---|
| Git命令 | 本机PowerShell | 提交、上传代码、确定源码版本 |
| 文件编辑器 | 本机仓库 | 写.tf、Java、TypeScript、脚本和buildspec |
| Terraform | 本机PowerShell | 声明/创建/更新AWS资源及其配置 |
| AWS CLI | 本机或CodeBuild内部 | 直接调用AWS API，查状态、上传包、启动流程 |
| PowerShell/Node脚本 | 本机或CodeBuild内部 | 把校验和多条命令按顺序串起来 |
| 浏览器控制台 | AWS、GitHub | 授权连接、人工审批、查看资源和日志 |
| CodeBuild | AWS临时构建环境 | 运行测试、打包及发布脚本 |
| CodePipeline | AWS | 安排阶段、传递制品、等待审批 |
| CodeDeploy | AWS | 调整Lambda别名权重并执行回滚 |

Terraform和AWS CLI最终都在调用AWS API；脚本是组织操作的方式。看到一条.ps1或.mjs命令，不代表里面没有Terraform/AWS CLI。

## 当前选型中的费用取舍

| 选择 | 为什么这样做 | 后续何时重新考虑 |
|---|---|---|
| 当前后端用API Gateway＋Lambda，暂不部署ECS/ALB | 个人网站访问低且不连续，优先按需执行，减少常驻任务和负载均衡器的费用及维护 | 有持续高流量、长任务或容器运行需求时，再做第36节对照练习 |
| 简历用普通私有S3＋Lambda内存缓存，暂不建Bedrock知识库 | 约5000到一万多汉字、每月最多约1000次访问，先省去额外检索／索引／向量存储组件，减少费用和维护环节 | 全文输入token费用、延迟或资料规模实际增长后，再比较便宜的托管知识库 |

这是按当前规模作出的取舍，不是“知识库最低每月$975”。缓存只避免重复S3读取，每次发送的简历全文仍计模型输入tokens；全文也未必在所有用量下绝对更便宜。详见[简历存储实现与费用理由](docs/bedrock-content.md)。

## 第1步：确认起点与本机工具

**为什么先做：** 避免用错目录、分支、AWS账号。GitHub有代码，只代表源码存好了，不代表网站已经上线。

**方式：本机PowerShell、Git、AWS CLI。** 后续未特别注明时，工作目录都是仓库根目录。

```powershell
Set-Location D:\study\kongPortfolio
$aws = 'D:\software\AWSCLI\aws.exe'
$tf = 'D:\software\Terraform\terraform.exe'
$env:AWS_PROFILE = 'kong-dev'
. ./scripts/tools.ps1
git status --short
git remote -v
& $aws sts get-caller-identity --query '{Account:Account}' --output json
```

| 命令/语法 | 作用 |
|---|---|
| Set-Location | 切到项目目录，避免在terraform-test里改项目 |
| $aws、$tf | 保存本机程序完整路径；不是AWS密码 |
| & $aws / & $tf | PowerShell调用变量中的可执行程序 |
| AWS_PROFILE | 本终端后续AWS/TF使用kong-dev凭证 |
| . ./scripts/tools.ps1 | 在当前终端加载工具PATH/JAVA_HOME和检查函数 |
| git status --short | 看本地是否有未提交文件 |
| git remote -v | 确认origin确实是本项目GitHub仓库 |
| sts get-caller-identity | 只读确认实际AWS账号，预期561798268037 |

如果CLI登录过期，执行 `& $aws sso login --profile kong-dev`，在浏览器完成SSO认证，然后重查STS。只登录AWS网页不一定更新CLI凭证。

**实际发生：** 你最早在D:\software\terraform-test跑init/plan，成功读出账号。当时只有output变化，没创建资源；后续正式目录移到本仓库。

**完成标准：** 仓库/账号正确，CLI认证有效。

## 第2步：先设置Git安全边界

**理由：** State、变量、计划、联系人资料会陆续出现，不能等上传GitHub后才想起排除它们。

**方式：文件编辑器 + 本机Git/Node/Gitleaks。** 对应.gitignore、.githooks/、scripts/install-hooks.ps1。

```powershell
./scripts/install-hooks.ps1
node .githooks/check-staged-paths.mjs --all
gitleaks dir . --redact --no-banner
git diff --check
```

| 命令 | 作用 |
|---|---|
| install-hooks.ps1 | 内部git config core.hooksPath .githooks，让本仓库使用检查钩子 |
| check-staged-paths --all | 检查已跟踪文件中有没有禁止发布的私有路径 |
| gitleaks dir | 扫描工作区疑似秘密；redact隐藏匹配值 |
| git diff --check | 查空白格式错误 |

允许提交：公开源码、.tf、.example模板、.terraform.lock.hcl。
不提交：.env、密钥/证书、.terraform/、State、plan、terraform.tfvars、backend.hcl、.local/。

**实际发生：** 配置了缺少Gitleaks就拒绝提交的钩子；后来还补测Git文件执行权限，解决Windows正常但Linux构建失败的问题。

**完成标准：** 私有路径被忽略，扫描通过，提交/推送会执行钩子。

## 第3步：写Terraform基础配置，弄懂四类文件

**理由：** Terraform要知道“去哪个账号、哪个区域、创建什么、状态存哪里”。

**方式：文件编辑器。** 首先写infra/terraform/bootstrap/，不是去控制台逐个建S3配置。

| 文件 | 内容/目的 |
|---|---|
| main.tf | Provider、变量、S3资源、账号限制 |
| terraform.tfvars.example | 公开输入示例，不放秘密 |
| terraform.tfvars | 本机真实输入，被忽略 |
| backend.hcl | 远程State位置/锁，稍后迁移时使用，被忽略 |
| .terraform.lock.hcl | Provider依赖版本/摘要，保留在Git |

bootstrap的本机输入示例：

```hcl
expected_account_id = "561798268037"
region             = "ap-northeast-1"
state_bucket_name  = "kongportfolio-tfstate-561798268037-ap-northeast-1"
```

**你要理解：** Provider用AWS_PROFILE得到临时凭证，.tf不写Access Key。allowed_account_ids用于防止误操作其他账号。

**实际发生：** Terraform1.17.1、AWS Provider6.72.0；当前文件要求AWS Provider ~>6.0，lockfile锁定具体选择。

## 第4步：创建State bucket

**理由：** Terraform State记录“哪个配置对应哪个AWS资源”；以后网站和CI/CD都需要它。不能先把State存进尚未创建的bucket，因此第一次先使用本地State。

**方式：本机Terraform，内部由Provider调用AWS API。** 下面是首次创建时、尚未加入backend.tf的历史顺序；当前仓库已使用远程backend，不要删现有配置重做。

```powershell
Set-Location D:\study\kongPortfolio\infra\terraform\bootstrap
& $tf init -input=false
& $tf fmt -check
& $tf validate
& $tf plan -input=false '-out=bootstrap.tfplan'
& $tf show bootstrap.tfplan
# 当时审核具体计划并获批准后：
& $tf apply -input=false bootstrap.tfplan
```

| 命令/参数 | 目的 |
|---|---|
| init | 安装Provider、初始化当前root；已有lockfile时可用-lockfile=readonly检查不改版本 |
| fmt -check | 检查.tf格式 |
| validate | 检查配置语法与内部一致性 |
| plan | 对比配置、State和AWS，预览变更；不是部署 |
| -out=... | 将这次审核的计划保存，PowerShell中整个参数加引号 |
| show | 查看保存计划，而非凭记忆判断 |
| apply 计划文件 | 实际执行这份计划，可能创建付费资源 |

**实际发生：** 6新增，实际为1个bucket及5项安全配置：公开访问阻止、禁用ACL、版本控制、AES256、拒绝非TLS策略。不是6个桶。没有DynamoDB锁表、客户管理KMS key。

**鼠标查看：** AWS→S3→上述bucket→Permissions/Properties。

**完成标准：** 私有、版本Enabled、AES256、ownership正确，plan范围与批准一致。

## 第5步：迁移State并验证锁

**理由：** 把State从本机集中保存到S3，避免多人/多终端同时写坏状态。

**方式：编辑backend.tf/backend.hcl + Terraform + AWS CLI。** backend.hcl：

```hcl
bucket              = "kongportfolio-tfstate-561798268037-ap-northeast-1"
key                 = "bootstrap/terraform.tfstate"
region              = "ap-northeast-1"
encrypt             = true
use_lockfile        = true
allowed_account_ids = ["561798268037"]
```

仍在bootstrap目录：

```powershell
& $tf init -migrate-state '-backend-config=backend.hcl'
# 阅读提示，确认复制现有State到S3
& $tf plan -input=false -detailed-exitcode
& $aws s3api head-object --bucket kongportfolio-tfstate-561798268037-ap-northeast-1 --key bootstrap/terraform.tfstate
```

| 操作 | 作用 |
|---|---|
| -migrate-state | 迁移已有资源记录，不能换成空State |
| -backend-config | 读取本机远程后端设置 |
| head-object | 确认远程State对象实际存在/有版本/加密 |
| -detailed-exitcode | 0无差异；2有差异；1执行错误 |

**实际发生：** 迁移成功、No changes；随后第一终端用临时output的refresh-only apply停在确认处持锁，第二终端plan -lock-timeout=3s得到锁错误；第一终端输入no取消，删临时探针后恢复No changes。证明了真实锁竞争，不只是配置写着use_lockfile=true。

**以后分开管理：** 同一bucket中，bootstrap/terraform.tfstate管State桶；portfolio/prod/terraform.tfstate管网站；cicd/terraform.tfstate管流水线。State互相独立。

## 第6步：部署前检查预算和旧资源

**理由：** 避免重复创建预算、覆盖DNS或忽略已有资源。

**方式：回仓库根目录，运行PowerShell包装的只读AWS CLI。**

```powershell
Set-Location D:\study\kongPortfolio
./scripts/aws-preflight.ps1 -ExpectedAccountId 561798268037 -Profile kong-dev -AwsExecutable D:\software\AWSCLI\aws.exe
```

脚本先STS确认账号，再查Budgets、Route53、东京/us-east-1证书、东京ECS/ECR/ELB、CloudFront，全部成功才写.local/aws-preflight.json。没有创建资源。

**实际发生：** 已有USD10/月和Zero-Spend预算，没重复创建；已有旧Route53托管区。当时查询范围内没有本项目网站资源。

**鼠标查看：** AWS搜索Budgets→打开预算→查看额度和提醒。预算提醒不等于消费封顶。

**完成标准：** 知道哪些要新建、哪些复用，不把查询失败当资源不存在。

## 第7步：把Spring Boot适配成Lambda包

**理由：** 本地Spring Boot监听HTTP端口；Lambda接收事件，运行入口与包结构不同。要保留本地模式，同时增加Lambda模式。

**方式：编辑Java/pom.xml + 本机Maven/Node。** 详见[Lambda适配说明](docs/lambda.md)。

```powershell
mvn -B -ntp -f backend/pom.xml clean verify
mvn -B -ntp -f backend/pom.xml -Plambda clean verify
node scripts/test-lambda-package.mjs
```

| 命令/参数 | 目的 |
|---|---|
| mvn ... clean verify | 清理旧target，运行本地HTTP测试并构建 |
| -f backend/pom.xml | 指定后端Maven项目 |
| -B / -ntp | 非交互执行，减少下载进度输出 |
| -Plambda | 激活Lambda构建profile，加入handler/运行依赖并生成ZIP |
| test-lambda-package.mjs | 仅用ZIP内部依赖启动验证，防止发布包缺依赖 |

**实际发生：** 9项HTTP测试、3项Lambda测试、ZIP独立加载通过；生成backend/target/kongPortfolio-lambda.zip。handler为dev.kongortfolio.lambda.PortfolioLambdaHandler::handleRequest，HTTP API payload2.0。

两个模式共用target，切换要clean。Lambda包不等于本地java -jar的可执行Boot JAR。此时未调用AWS/Bedrock，没把Docker镜像部署到Lambda。

## 第8步：冻结第一次要发布的前后端候选

**理由：** 审核和真正上传时必须是同一份文件，不能一边改代码一边部署。

**方式：本机PowerShell调用Maven/Node/Vite。**

```powershell
./scripts/prepare-first-release.ps1
```

这个脚本内部依次做Lambda构建、ZIP smoke、TypeScript/前端40tests、路由测试、Vite版本化构建、计算SHA并生成：

```text
.local/releases/<releaseId>/
  backend.zip
  frontend/...
  manifest.json
```

| 内容 | 作用 |
|---|---|
| releaseId | 识别本次冻结的发布 |
| manifest里的SHA | 上传前后核对文件没被换过 |
| Vite base=/releases/<id>/ | 每个版本使用独立资产路径，避免旧缓存引用错文件 |
| version.json | 在公网查询releaseId、gitCommit、sourceDirty |

**实际发生：** 首次a594e36…是人工审核的本地快照，sourceDirty=true、base commit b2a82d9。它不是干净GitHub提交自动发布；后面才建立那条链。

## 第9步：用Terraform创建第一个网站环境

**理由：** 包已经准备好，现在为它建立运行环境。

**方式：编辑infra/terraform/portfolio/，本机Terraform。** 本机terraform.tfvars填写expected_account_id与第8步实际release_directory；backend.hcl的key为portfolio/prod/terraform.tfstate。

```powershell
& $tf '-chdir=infra/terraform/portfolio' init '-backend-config=backend.hcl' -lockfile=readonly
& $tf '-chdir=infra/terraform/portfolio' fmt -check
& $tf '-chdir=infra/terraform/portfolio' validate
& $tf '-chdir=infra/terraform/portfolio' plan -input=false '-out=first.tfplan'
& $tf '-chdir=infra/terraform/portfolio' show -json first.tfplan |
  Set-Content -Encoding utf8 .local/first.tfplan.json
node scripts/review-first-plan.mjs .local/first.tfplan.json
```

-chdir让Terraform操作指定root，PowerShell仍留在仓库根；show -json把计划变为机器可审查的JSON；review-first-plan检查只含批准的23项创建。

**第一次建立的环境：**

| 类别 | TF资源数 | 配置与理由 |
|---|---:|---|
| S3 | 6 | 私有网站桶、安全策略/加密/版本；只让指定CloudFront读取 |
| CloudFront | 4 | 分发、OAC、SPA函数、缓存策略；给React HTTPS/CDN/前端路由 |
| Lambda | 4 | 函数、live别名、2调用权限；运行Spring Boot |
| IAM | 2 | Lambda角色及日志policy；应用用角色而非密钥 |
| API Gateway HTTP API | 5 | API、integration、2路由、stage；将/api请求转给Lambda |
| CloudWatch | 2 | API/Lambda日志组；排错并限制保留时间 |

函数：Java21/x86_64、1024MB、28秒、reserved concurrency5、DEBUG=false。API payload2.0、限流1rps/burst5。日志保留7天，API不缓存。不建EC2/ECS/ALB/NAT/数据库/ECR。

审核计划并获批准后，实际执行：

```powershell
./scripts/apply-first-release.ps1 -TerraformExecutable D:\software\Terraform\terraform.exe -AwsExecutable D:\software\AWSCLI\aws.exe
```

包装脚本先检查账号、23create、manifest和所有文件SHA，再调用Terraform apply first.tfplan。**首次后端ZIP在这一步由Terraform上传；React文件还没上传。**

## 第10步：上传React，修复首次线上故障

**理由：** 建好S3/CloudFront不等于里面已经有网页；资源创建成功也不等于应用健康。

**方式：本机PowerShell包装AWS CLI + Node HTTPS检查。**

```powershell
./scripts/publish-first-release.ps1 -ExpectedAccountId 561798268037 -ReleaseDirectory '<第8步真实候选目录>' -AwsExecutable D:\software\AWSCLI\aws.exe
node scripts/smoke-first-deployment.mjs https://d4htln25bw5g5.cloudfront.net '<同一个releaseId>'
```

publish脚本先核SHA，再head-object/put-object上传manifest列出的6个公开文件；If-None-Match=*防覆盖，AES256加密，设置正确MIME/Cache-Control。smoke检查首页、资源、三语API、health、错误路由和版本。

**实际故障：** health503，CloudWatch日志显示磁盘检查用了只读/var/task。修改api.tf环境变量MANAGEMENT_HEALTH_DISKSPACE_PATH=/tmp，重新plan，确认只有函数/live别名两项更新，再apply；live到版本2，healthUP。还清理了OAC多余空配置，消除永久plan差异。

**鼠标排错：** Lambda→kongportfolio-prod→Monitor/CloudWatch logs，或CloudWatch→Log groups→/aws/lambda/kongportfolio-prod。不能只刷新首页猜原因。

**完成标准：** HTTPS检查通过、私有S3匿名直读403、最终portfolio plan No changes。这里没有完成浏览器视觉/移动端交互验收。

## 第11步：接自定义域名

**理由：** cloudfront.net可以访问后，再把自己的域名接入，便于分清应用问题和DNS问题。

**方式分开：** 域名注册/注册商NS用AWS CLI；证书、网站DNS、CloudFront绑定用Terraform。

**实际前提：** 旧hosted zone还在，但域名已过期，公共DNS NXDOMAIN；托管区不代表持有域名。重新核报价/可用性、获得明确付费同意和真实资料后才注册。

```powershell
& $aws route53domains check-domain-availability --domain-name konglingtong44.com --region us-east-1
# 下条为当时付费注册的命令形式；当前域名已注册，不重跑：
& $aws route53domains register-domain --region us-east-1 --cli-input-json file://.local/domain-registration-request.json
& $aws route53domains get-operation-detail --operation-id '<返回的OperationId>' --region us-east-1
```

第一条查可用性；第二条提交含真实联系人/隐私/价格同意的本机JSON；第三条跟踪异步注册结果。联系人不写公开文档。实际一年最高USD16未含税、AutoRenew=false，注册成功。

随后用update-domain-nameservers把NS指向原zone，核对公共DNS；确认注册自动生成的新空zone仅NS/SOA后删除重复区，保留原区/testec2。

接网站：

```powershell
./scripts/enable-custom-domain.ps1 -DomainName konglingtong44.com -HostedZoneId Z05184721X76TVPH1GCMX -ExpectedAccountId 561798268037 -AwsExecutable D:\software\AWSCLI\aws.exe -TerraformExecutable D:\software\Terraform\terraform.exe
# 上条只审核计划；当时审核后执行同命令并加 -Apply
```

脚本检查账号/区归属/公开委派，写ignored custom-domain.auto.tfvars.json，生成计划。加-Apply才执行。Terraform申请us-east-1的ACM证书、添加验证CNAME及A/AAAA Alias、更新现有CloudFront域名/TLS。应用仍东京。

**鼠标查看：** Route53→Registered domains看注册和NS；Hosted zones看记录；ACM切us-east-1看证书；CloudFront看域名与证书。

**实际结果：** 5新增/1修改，网站https://konglingtong44.com上线，TLS/DNS/HTTP验收通过。注册与DNS两部分细节见[域名记录](README.md#aws-运行架构)。

## 第12步：建立AWS与GitHub的连接

**理由：** 后面AWS需要能读取仓库；连接不是构建，更不是发布。

**方式：Terraform创建连接 + 你在浏览器授权 + CLI确认。** 新建infra/terraform/cicd/及独立backend key=cicd/terraform.tfstate。

```powershell
& $tf '-chdir=infra/terraform/cicd' init '-backend-config=backend.hcl' -lockfile=readonly
& $tf '-chdir=infra/terraform/cicd' validate
& $tf '-chdir=infra/terraform/cicd' plan -input=false '-out=connection.tfplan'
# 审核仅一个连接创建后：
& $tf '-chdir=infra/terraform/cicd' apply -input=false connection.tfplan
```

初始kongportfolio-github=PENDING。**鼠标操作：**

1. [东京Connections控制台](https://ap-northeast-1.console.aws.amazon.com/codesuite/settings/connections?region=ap-northeast-1)→打开该连接→完成待处理连接。
2. 选择/安装AWS Connector for GitHub，登录你的GitHub账号。
3. Only select repositories→kongPortfolio→授权，再回AWS完成连接。

```powershell
./scripts/check-source-connection.ps1 -ExpectedAccountId 561798268037 -ConnectionArn arn:aws:codeconnections:ap-northeast-1:561798268037:connection/ff3ddf98-05c3-41fa-8bfe-f738a90df1d6 -Profile kong-dev -AwsExecutable D:\software\AWSCLI\aws.exe
```

脚本用STS和codeconnections get-connection核对账号/名称/ARN/provider/status。AVAILABLE后曾用Terraform refresh-only保存外部授权状态，没有替换连接。不要另建连接或用PAT绕过。

## 第13步：把本地AWS代码提交GitHub

**理由：** AWS只能构建已经上传的源码；本地未提交文件不能靠一个Git SHA传过去。

**方式：Git + 安全扫描。** 这是后续AWS改动的提交，不是第1步之前的网站初版提交。

```powershell
git switch -c feat/aws-serverless-ci
# 先git diff审查，再按实际修改的文件明确git add
git diff --cached --check
gitleaks git --pre-commit --staged --redact --no-banner .
git commit -m 'feat: manage serverless deployment and bounded AWS CI with Terraform'
git push -u origin feat/aws-serverless-ci
git rev-parse HEAD
```

| 命令 | 作用 |
|---|---|
| switch -c | 创建并切换功能分支；已有该分支时不能重复-c |
| git add 指定文件 | 决定哪些改动进这次提交 |
| diff --cached | 审核暂存区 |
| commit | 在本地形成一个可识别的版本 |
| push -u | 上传分支并建立上游关系 |
| rev-parse HEAD | 得到完整提交SHA供云端固定源码 |

**实际发生：** 首次AWS配置提交8f4f7f3，使用feat/aws-serverless-ci，未合并main。

## 第14步：建立并手动验证云端CI

**理由：** 先证明AWS确实能拉源码、运行测试，再做自动触发和生产发布。

**方式：编辑build.tf/本机tfvars、Terraform建环境、CLI启动CodeBuild。** tfvars开启enable_ci=true；审核ci.tfplan后apply。

```powershell
& $tf '-chdir=infra/terraform/cicd' plan -input=false '-out=ci.tfplan'
& $tf '-chdir=infra/terraform/cicd' show ci.tfplan
& $tf '-chdir=infra/terraform/cicd' apply -input=false ci.tfplan
& $aws codebuild start-build --project-name kongportfolio-ci-frontend --source-version '<已推送完整SHA>' --region ap-northeast-1
& $aws codebuild start-build --project-name kongportfolio-ci-backend --source-version '<同一完整SHA>' --region ap-northeast-1
```

plan/apply建立8项：前后端项目、各自角色/policy/七天日志组。start-build分别启动指定提交，**不部署网站**。AWS环境Linux small、Node24/Corretto21、15分钟上限、各并发1、无自动重试，buildspec=codebuild/ci.yml。

看结果：

```powershell
& $aws codebuild batch-get-builds --ids '<本次构建ID>' --region ap-northeast-1
& $aws logs get-log-events --log-group-name /aws/codebuild/kongportfolio-ci-frontend --log-stream-name '<本次stream>' --region ap-northeast-1
```

batch-get-builds查状态及resolvedSourceVersion；get-log-events读真实错误。鼠标：CodeBuild→项目→Build history→构建→Build logs。

**实际故障：** hook在Git中100644，Linux不能执行。用 `git update-index --chmod=+x .githooks/pre-commit .githooks/pre-push` 修Git文件模式并加测试；00b64d9重跑两项目成功。前端40tests，后端9+3和ZIP smoke。初时状态回写仍未验收。

## 第15步：让push自动触发CI并回写GitHub

**理由：** 不必每次手动start-build，也让每个提交能看到检查结果。

**方式：Terraform webhook + Git push + 必要的GitHub画面授权。** webhooks.tf、enable_ci_webhooks=true；计划最初2个webhook。

**实际故障与操作：**
1. apply报OAuthProviderException，查默认GitHub源凭证发现为空。
2. Terraform增加source credential引用已有CodeConnection ARN，不是保存PAT。
3. 仍失败；你打开[GitHub installations](https://github.com/settings/installations)→AWS Connector for GitHub→Configure。
4. 确认Only select repositories包含kongPortfolio；Review request→查看并接受新增权限。只点Save仓库选择不等于接受新增权限。
5. 重新plan/apply缺失的webhook，真实push验证成功。

触发限制：你的actor14041257，允许main/feat/feature/fix/hotfix和指定PR事件。CI角色无生产部署权。实际e383673 push触发前后端构建，GitHub ci/frontend、ci/backend成功。

**完成标准：** 构建由本次push触发，SHA匹配，AWS与GitHub均显示真实结果。不是“项目存在就算CI好了”。生产候选流水线仍手动启动。

## 第16步：建立候选发布流水线

**理由：** 后面每一关都要用同一次构建的包，防止STG测试的是A，生产发的是B。

**方式：Terraform + AWS CodePipeline/CodeBuild。** candidate-pipeline.tf，tfvars开启enable_candidate_pipeline=true，candidate_source_branch选择feat/aws-serverless-ci。实际初次审核14项新增后apply。

AWS的codebuild/candidate.yml运行：

```bash
bash scripts/ci.sh all
node scripts/package-pipeline-candidate.mjs
node scripts/verify-pipeline-candidate.mjs .local/pipeline-candidate
```

| 命令 | 目的 |
|---|---|
| ci.sh all | 完整安全/前后端检查 |
| package-pipeline-candidate | 将同一干净Git SHA构建为backend.zip、frontend、manifest、SHA256SUMS |
| verify-pipeline-candidate | 查源码/文件摘要/路径/额外文件/版本前缀，发现不一致即停 |

新增私有版本化artifact bucket，与State/site桶分工。输出报告后续也存在此处。Source使用CodeConnection/full clone，QUEUED，DetectChanges=false。

```powershell
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=<已推送完整SHA>' --region ap-northeast-1
```

这是启动一次实际构建；返回executionId，后面始终跟踪这个ID。网页：CodePipeline→kongportfolio-candidate→Executions→本次执行。

**实际故障：** S3 key前缀被AWS截成kongportfolio-candid/，按完整名称配置的权限失败，按实际前缀修正；CI变量保留方式也修到buildspec env.variables。修复后重新固定源码执行成功，并下载精确版本制品核验摘要。

## 第17步：加入独立STG验证和第一道人审

**理由：** 生产之前先让候选包在真实Lambda runtime跑通。

**方式：Terraform建STG和CodeBuild；AWS内部Node脚本调用Lambda CLI。** 开启enable_staging=true，同时提供staging_bootstrap_zip和staging_bootstrap_sha256，两者必须来自已验证候选。最初8新增/2更新。

STG名kongportfolio-stg，有独立日志/角色、并发1，没有独立公网STG网站。codebuild/staging.yml执行：

```bash
node scripts/verify-staging.mjs
```

内部操作依次是检查同次源码/候选/账号→读取函数配置/已有版本→必要时update-function-code --publish→wait function-updated→invoke数字版本七项契约→生成StagingReport。已有精确匹配版本则复用。

七项为health、日中英profile、POST Bedrock占位、404、405；核对ExecutedVersion和no-store。最早wait-v2权限不合，改配置级waiter，没有扩大IAM。

**鼠标审批1：** CodePipeline→本次execution→ApproveProduction→ApproveGreenCreation→Review/审阅→核对STG报告/源码/release→批准→提交。

**作用：** 允许创建和验证生产Green数字版本，还不允许切live流量。Terraform定义审批关卡，人手批准每次执行，不是每次再apply来批准。

## 第18步：验证生产Green，保留第二道人审

**理由：** STG正确后，再证明同一ZIP在真实生产配置里正确，且老版本仍服务。

**方式：Terraform建Green验证项目并交接代码所有权；CodeBuild内部CLI发布/调用数字版本。** 开启enable_green=true。

codebuild/green.yml→`node scripts/verify-green.mjs`：
- 核对本次候选/STG/第一审批成功。
- get-alias记录live版本/权重/RevisionId为Blue。
- 必要时给kongportfolio-prod update-function-code --publish，生成Green数字版本。
- 直接invoke Green做七项验证。
- 再get-alias，确认live没动，生成GreenReport。

Terraform此后继续管理runtime/role/memory/env，ignore filename/source_code_hash；live的版本/权重交给CodeDeploy，ignore function_version/routing_config。否则后续apply可能把发布改回旧版本。

```powershell
& $aws lambda get-alias --function-name kongportfolio-prod --name live --region ap-northeast-1
```

该只读命令查真正主版本和AdditionalVersionWeights。Blue/Green是角色，数字可以跳号，不是永久名叫blue/green的两台服务器。

**鼠标审批2：** ApproveTrafficShift→ApproveBlueGreenDeployment→Review→核对mode、Blue/Green、源码/release/报告→批准→提交。只有这次批准后才允许真实切流。

## 第19步：CodeDeploy后端10%灰度到全量

**理由：** 逐步切新版本、观测异常，出错能恢复。Lambda原生版本/别名支持这件事，不需要ALB。

**方式：Terraform建CodeDeploy/报警/部署项目，流水线CLI启动部署。** 开启enable_deployment=true；最初9新增/2更新。

建立application kongportfolio、group production、CodeDeploy服务角色、live Errors报警和部署CodeBuild。策略LambdaCanary10Percent5Minutes，失败/报警/请求停止均开启自动回滚。

codebuild/deployment.yml运行 `node scripts/deploy-production.mjs`。脚本先核两道人审/同候选/当前Blue/无并行部署，再生成AppSpec并执行：

```text
aws deploy create-deployment --cli-input-json file://<脚本生成的请求>
aws deploy get-deployment --deployment-id <本次ID>
aws lambda get-alias --function-name kongportfolio-prod --name live
```

| 请求 | 作用 |
|---|---|
| create-deployment | 让CodeDeploy服务角色按AppSpec改live权重，构建角色不直接改alias |
| get-deployment | 查状态/失败原因/回滚关联 |
| get-alias | 查实际流量指向，结合公开health/profile观测 |

先建立Blue→Blue成功基线，保证有上一成功部署可回滚。曾遇GetDeployment只返回AppSpec digest，原解析器期待content而失败；修为精确摘要匹配。

**实际成功：** 首次live2→5，d-K1QJSA0EM；后来完整版本live7→8，d-BIHP8K2EM，确实观测10%后全量成功。不是只创建了CodeDeploy资源。

**鼠标查看：** CodeDeploy→Applications→kongportfolio→production→Deployments；CloudWatch→Alarms看kongportfolio-prod-live-errors；Lambda→Aliases→live看指向。

## 第20步：练习真实自动回滚

**理由：** 能上线不代表恢复链可用，必须实际观测恢复。

**方式：固定源码启动rollback_drill，仍由人完成两道审批；CodeBuild在观察到10%后调用停止。**

```powershell
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=<本次已审核SHA>' --variables 'name=ReleaseMode,value=rollback_drill' --region ap-northeast-1
```

ReleaseMode明确这次是演练，不是正常全量上线。内部执行 `aws deploy stop-deployment --deployment-id <自己本次ID> --auto-rollback-enabled`，由AWS创建自动回滚部署，再验证关联/实际live/健康/报告。

**实际结果：** execution96861976…，Blue5/Green6，d-2OPWFF0EM在10%时Stopped，AWS创建d-M40WD11EM并Succeeded，live恢复5/无权重。没有上传坏代码或假造报警。只证明“请求停止”路径，不能说报警/应用失败触发已各自演练。

## 第21步：让React也由流水线自动发布

**理由：** 前面后端已经自动部署，但前端还停在首次本地快照，需要接上同一候选。

**方式：Terraform新增发布CodeBuild/IAM/日志并更新pipeline；AWS内部Node调用S3/CloudFront CLI。** 开启enable_frontend_release=true，最初4新增/2更新；CloudFront code交给流水线，Terraform ignore code，保留runtime/分发/关联管理。

codebuild/frontend-release.yml→`node scripts/publish-frontend.mjs`：
1. 查同execution候选/STG/Green/两审批/后端成功报告和实际live。
2. put-object条件上传6个版本化文件，HEAD/公开HTTPS校验全部摘要。
3. get-function/describe-function读取LIVE/DEVELOPMENT代码、配置和ETag。
4. update-function更新开发态，test-function跑7种路由，正确才publish-function。
5. 查公网version/首页/深链接/health，写FrontendReport；失败尝试恢复旧前端指向。

| CLI/机制 | 为什么需要 |
|---|---|
| s3api put-object + If-None-Match | 新版本独立key，禁止覆盖旧对象 |
| Cache-Control与版本前缀 | 资产可长期缓存，HTML/version重新校验 |
| ETag + If-Match | 避免覆盖别人的并发路由改动 |
| test-function | 测新路由不会把API/缺失资产错误重写成首页 |
| publish-function | 真正把测试过的开发态发布到LIVE |
| 公网SHA/version检查 | 证明用户取到的是同一候选，而非仅控制台“成功” |

没做全站缓存失效；没给DeleteObject/UpdateDistribution/直接改alias权限；rollback_drill跳过前端发布。

**实际故障：** TestFunction返回request.uri，旧代码读顶层uri而失败；后端已到7、前端LIVE仍旧版，开发态恢复。修解析与测试后全新执行、重新两次审批。

**最后成功：** execution5d55596a…，源码7a2e1b8，STG9/Green8，后端7→8，前端release242f8cb4…，sourceDirty=false。6文件公开SHA、首页/深链接、7API、LIVE/DEV路由、制品摘要均通过，两个TFplan No changes。

## 第22步：以后你日常怎样发一次版

资源搭建完成后，常规应用发布按这张清单，不重复前面的bootstrap/注册域名/建连接。

| 顺序 | 你亲手做什么 | 目的 |
|---|---|---|
| 1 | 改代码，运行相应检查，完整入口./scripts/check.ps1 | 本地先排除应用/包/秘密问题 |
| 2 | 审diff，指定git add，commit、push允许分支 | 发布一个明确源码版本 |
| 3 | AWS/GitHub核ci/frontend和ci/backend | 本次SHA的真实CI通过 |
| 4 | git rev-parse HEAD，手动启动pipeline/mode=deploy | 固定上线源码，push本身不自动生产发布 |
| 5 | STG成功后第一道Review | 授权Green验证 |
| 6 | Green成功后第二道Review | 授权灰度和同候选前端发布 |
| 7 | 看CodeDeploy、前端阶段和报告 | 确认两个部分都完成 |
| 8 | 查公网version/health，记日志 | 记录用户实际拿到什么 |

常用命令（恢复第1步变量；SHA与executionId填当次值）：

```powershell
git rev-parse HEAD
& $aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions 'actionName=GitHub,revisionType=COMMIT_ID,revisionValue=<已推送完整SHA>' --variables 'name=ReleaseMode,value=deploy' --region ap-northeast-1
& $aws codepipeline list-action-executions --pipeline-name kongportfolio-candidate --filter 'pipelineExecutionId=<返回的executionId>' --region ap-northeast-1
Invoke-RestMethod https://konglingtong44.com/version.json
Invoke-RestMethod https://konglingtong44.com/api/health
```

list-action-executions查每个阶段实际结果；version.json识别前端发布来源；health检查后端。公网检查不替代完整报告/功能验收。

如果改基础设施才走Terraform fmt/validate/test→plan保存→show审核→获相应变更授权→apply→plan。新机器需恢复原有ignored变量/候选，不能让默认false导致提议删除现有CI。当前main仍旧基线，日常练习分支是feat/aws-serverless-ci。

## 查问题时去哪里

| 要查什么 | 文件/画面 |
|---|---|
| 所有操作历史与原始命令 | [AWS_EXECUTION_LOG.md](AWS_EXECUTION_LOG.md)，第27章为完整复盘 |
| 首次State迁移/锁 | [EXECUTION.md](infra/terraform/EXECUTION.md) |
| 首次23资源/上线故障 | [DEPLOYMENT.md](infra/terraform/portfolio/DEPLOYMENT.md) |
| 本机包装命令内部做什么 | scripts/*.ps1、scripts/*.mjs |
| AWS实际跑哪些命令 | codebuild/*.yml及scripts/ci.sh |
| CI失败 | CodeBuild→本次构建→Build logs，核resolvedSourceVersion |
| 哪次审批/阶段 | [CodePipeline](https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/kongportfolio-candidate/view?region=ap-northeast-1)→指定execution |
| 当前前端发布 | [version.json](https://konglingtong44.com/version.json) |
| 当前后端主版本/权重 | lambda get-alias，不能只看历史deployment target快照 |

## 后续学习与新增实践

准备手动补练习时，先看[手动 CI/CD 故障演练](docs/manual-cicd-exercises.md)：区分已有证据与待演练场景，先完成一场审批拦截，再逐项准备真实故障回退。尚未执行的方案不记为通过。

### 23. 前端发布后的真实故障回退演练

### 24. 应用失败触发的后端自动回滚

### 25. CloudWatch报警触发的后端自动回滚

### 26. 浏览器、移动端与多语言端到端验收

### 27. GitHub PR、分支保护与合并main

### 28. Bedrock模型选择与访问配置

**目标：** 先证明选定模型能在本账号／东京实际调用，再接入Java。不要把模型目录存在、IAM允许、正数默认配额或操场能选中，当作账号真实可用的证明。

**已选模型：** Qwen3 235B A22B 2507，`qwen.qwen3-235b-a22b-2507-v1:0`，`ap-northeast-1`，非流式 Converse。它是AWS托管基础模型，不需要自己创建GPU或市场端点；模型ID传给API，Lambda将来用执行角色认证。

在仓库根目录运行下面的**只读**检查（本轮实际运行过）：

```powershell
$aws = 'D:\software\AWSCLI\aws.exe'
& $aws sts get-caller-identity --profile kong-dev
./scripts/check-bedrock-access.ps1 -ExpectedAccountId 561798268037 -AwsExecutable $aws
```

脚本内部使用的命令与目的：

| 命令 | 检查什么 |
|---|---|
| `bedrock get-foundation-model --model-identifier <精确ID>` | 版本是ACTIVE、支持ON_DEMAND |
| `bedrock get-foundation-model-availability --model-id <精确ID>` | 区域、授权、权益、协议是否就绪 |
| `service-quotas get-service-quota --service-code bedrock --quota-code L-3875BCCF` | 本账号的Qwen TPM（每分钟token） |
| 同上，quota code=`L-548A1A32` | 本账号的Qwen RPM（每分钟请求） |
| `service-quotas get-aws-default-service-quota` | 公开默认值，仅用于对比，不能当账号实际额度 |

以上内部CLI另带profile/东京区域；完整实际命令见[操作补录](docs/aws-commands-20261114.md)。

**2026-11-14 双入口结果：** Runtime模型ACTIVE／访问正常，但实际TPM/RPM为0；一次128输出上限的Converse返回429。随后11:43 JST用同一东京账号和同一Qwen，Mantle Chat Completions一次16输出上限的请求返回200／OK、13输入+2输出tokens。**Qwen经Mantle已证明连通，Runtime仍受阻；不是所有Serverless都没有配额，也不能由Runtime失败推导所有入口不可用。**

**权限与部署：** PROD/STG Terraform使用Mantle `CreateInference`，精确限定本账号东京`project/default`及`bedrock-mantle:Model=qwen.qwen3-235b-a22b-2507`。代码默认false；STG实际调用成功，生产角色随后已获指定模型与资料权限，仅$LATEST准备配置，live18环境仍关闭。最初mock测试portfolio5个／cicd22个；新增STG配置验收后cicd25/25，真实IAM模拟8项仍保留为权限边界证据。

**接入前保护已补齐：** 费用控制Lambda单项更新已部署，关停策略同时Deny `bedrock:*`和`bedrock-mantle:*`；20个Python测试及双入口IAM拒绝模拟通过。没有执行off/on，当前仍on、consumed=[5,10,15]、下一档$25，网站health正常。具体命令和验证见[操作补录](docs/aws-commands-20261114.md)。

**下一步：** STG实际问答已完成小样本验收；下一Story接前端可选问句／回答／拒绝提示，并检查公共入口限流，再按两道审批审查生产发布。Runtime的[Support草稿](docs/bedrock-quota-support-draft.md)继续暂停。[双入口证据](docs/bedrock-access.md)保留边界。

11:33 JST[全量配额记录](docs/bedrock-current-quotas.md)中Runtime及已列少数Mantle指标无正数，但**不包含Qwen未公开的Mantle额度**。原“没有任何可用模型”的概括已在11:43成功调用后更正。两个旧语音／视频型号EOL仍不能作替代。Support继续暂停。

### 29. Spring Boot接入真实Bedrock问答

**最新源码／AWS验收：** 已提交978a636并显式固定COMMIT_ID启动新执行61bcc02c…；AWS前端73／后端58／Lambda5及ZIP运行通过，STG24完成8项HTTP、三语问答＋三语零token拒绝；补查两种路径变体400、三语目录17项通过。用户第一审批后，流水线发布Green20：生产角色三语回答／三语拒绝、8项接口全部通过，首次冷问答初始化＋执行合计11.08秒。生产live18未变、网页未发布，现停在第二审批；批准才会10%观察5分钟后切至100%，后端成功后发布同候选网页。见[本次候选审批说明](docs/bedrock-candidate-approval.md)。

**生产配置后续：** 生产角色指定模型及审核版本资料读取已授权，固定资料version／hash、1024输出tokens、15秒模型HTTP；live仍18、环境与流量不变。`pipeline_owns_lambda_versions=true`关闭Terraform自动发布版本，配置准备新增版本0；后续Green20由第一审批后的AWS流水线发布。配置阶段两根栈共2新增策略／1配置更新、最终No changes，10项IAM模拟和费用Deny覆盖通过。Green实测新增3次模型生成，共15,583入／848出tokens，约$0.005106（未含税与其他AWS费用）；三条范围拒绝不调用模型。一次冷样本不代表所有请求延迟，三语小样本也不保证零幻觉；详见[生产配置](docs/bedrock-production-config.md)。

**已部署至STG版本23，生产尚未开启。** Java通过AWS SDK现代SigV4 signer调用东京Mantle选定Qwen，不使用API key；代码默认关闭，空POST仍为不调用模型的PREPARING探测。启用后接收message/language，限制输入、输出、超时和频率，访客内容不写回资料。详见[接口、价格与验证边界](docs/bedrock-java.md)。

已从用户提供的旧版DOC整理并导入脱敏履历资料，涵盖7段职业项目经历等；原始DOC未改动或上传，正文仅在本地ignored目录和私有S3，不加入Git。本人确认当前任职／项目未变、资格未续情况后，按事实区分取得历史与当前有效状态，不编写转职理由。STG三语问答通过，补充检查未续证SAP、当前工作、转职动机缺失及团队贡献均符合资料。仅小样本，不保证零幻觉；生产仍PREPARING。

**因为费用，暂不使用知识库：** 用户已选择普通私有S3保存资料、Lambda内存缓存、逐次全文交给Qwen。独立bedrock-content根栈首次9新增／0更新／0删除；随后履历导入仅2更新（资料对象和STG版本权限），旧623码点摘要版本保留回退。Java真实读取、SHA-256校验及缓存复用通过；资料上限20,000 Unicode码点／80KiB。STG资料已实际使用，生产角色和$LATEST也已准备固定资料配置，live18环境未改。更新／回滚流程见[资料方案](docs/bedrock-content.md)。

**最新范围限制：只接受本人相关的审核问句。** 用户选择严格白名单，`portfolio-scope-v1`提供17主题／51个三语标准问句及有限别名；只对整条问句归一化后完整匹配，含有“孔令通／简历”不代表放行。通过后向Qwen发送对应服务端固定模板，不传访客原文。未知问法／夹带解题任务直接返回REFUSED、三语范围提示和可选问题，modelInvoked=false、usage=0；拒绝也计入频率保护。API Gateway／Lambda／日志仍可能计费，不能称整个请求免费。

AWS构建通过前端64项／后端57项／Lambda 4项和ZIP运行；资料6,943码点／17,637字节，固定版本并保留旧版。STG验收8项HTTP合约、3语拒绝＋3语正常回答；补充6项事实与注入检查通过。访客新增技能断言被拒绝，后续回答未采用该内容。51标准问句全部做过匹配测试，未全部做模型质量测试；旧21个宽范围样例不作新标准。旧执行6c2aa1d9…现已Stopped，第一审批及Green验证成功、未切流，STG23／生产18，前端未开放问答；详见[范围设计](docs/bedrock-scope.md)及[命令第13节](docs/aws-commands-20261114.md)。

### 30. 输入输出限制、请求节流与调用成本控制

**公开入口检查及部署：** 核对真实API限流、PROD/STG并发5/1、四档预算→SNS→控制器及Runtime／Mantle拒绝权限后，已apply目标0.1请求/秒／突发1的独立问答POST路由，1新增／1更新。空请求在直连API及CloudFront均观察到429，普通资料200、两入口health200／no-store，最终plan No changes。部分小批次全部放行，不能称严格每10秒一次。Java规范路径修复已到STG24，两种绕过写法实测400；本地验证覆盖7种变体不进入模型服务。网关检查阶段没有生成模型回答；后续配置、新候选和Green真实角色／冷问答已通过，公开切流与网页发布仍待第二人审。见[公开入口检查](docs/bedrock-public-readiness.md)。

**前端本地增量：** 已接问题目录及问题选择、纯文本回答、REFUSED／准备中／429／超时／截断提示。打开不生成回答，点击后只传当前问题及语言；不自动重试。73项前端测试、构建和15组三语Chrome／WebKit模拟检查通过，没有真实模型调用或新AWS发布。前端禁用按钮不是安全边界，Java白名单和限流仍生效。旧候选不含新UI，后续必须重新AWS构建验证；见[前端验收与边界](docs/bedrock-frontend.md)。

**账号费用保护与STG Java逐请求限制已部署。** 请求体8KiB、问题1000码点、资料20,000 Unicode码点／80KiB；STG输出硬上限1024 tokens，代码允许配置至2048；模型HTTP最多20秒，S3另有4秒SDK预算。每进程1在途、6次/分钟、60次/小时，重启／扩容重置，不能当账号全局硬限额。首次自我介绍截断导致验收失败，增加聚焦主题与长度提示后重建通过，未放松截断检查。公开启用前仍需核对网关、冷启动／凭证解析与Lambda28秒总超时、滥用控制。

**真实token费用：** 本轮成功的8次模型调用共41,563输入＋2,059输出tokens，按当前单价约$0.013405；平均折算约$1.68／千次短回答，不是固定单次报价。另有首次截断调用及税／构建／Lambda等费用。每次资料全文仍计入约5,200输入tokens；S3内存缓存只减少重复读S3，不等于模型提示词缓存。

**如何避免无关问题消耗整份简历tokens：** 先在Java确定性白名单拒绝，再加载资料／调用模型。只写“与本人无关就拒绝”的System Prompt仍会产生输入费；Bedrock Denied Topics也不是“默认拒绝、例外放行”的许可表。当前不增加收费语义分类／Guardrails，后续如果放开自由问法，再单独比较语义检查费用、误判和防绕过效果。

预算采用整账号、所有区域、包含税和域名等费用的实际成本，排除credits/refunds。月度$5/$10/$15/$25四档均已接通，不是Bedrock专属预算，也不是新增充值余额。东京Mantle Standard价格已核对为输入$0.27／百万、输出$1.06／百万tokens；每次8000入＋2000出时千次约$4.28，未含税和其他AWS服务。

```mermaid
flowchart LR
  Budget[AWS Budgets 实际费用超档] --> SNS[SNS 对应档位主题]
  SNS --> Control[费用控制 Lambda 并发1]
  Control --> Snapshot[私有S3 原配置及已消费档位]
  Control --> Stop[暂停CloudFront 后端与CI]
  Control --> Email[SNS 结果邮件]
```

**实际搭建过程：** 独立`infra/terraform/cost-control`根栈；初次24新增、通知未接通；用户确认结果邮件，完成真实off/on演练，修复阶段ARN和控制函数内存问题；最后新增$25并接通四组通知，计划11新增/2更新/0删除。每次保存plan、show审范围、apply指定计划，再plan确认No changes。

**控制台怎样手动执行：** 东京Lambda → `kongportfolio-cost-control` → 测试 → 选择已保存共享事件 → 点击测试。

| 事件 | 输入 | 真实行为 |
|---|---|---|
| `check-status` | `{"action":"status"}` | 查看状态，不改变开关 |
| `manual-stop` | `{"action":"off"}` | 真实关停，网站将不可用 |
| `manual-start` | `{"action":"on"}` | 按快照恢复，并消费已跨过的档位 |

“测试”是同步调用按钮，不是沙箱。CLI等价入口（这些脚本也实际运行过）：

```powershell
./scripts/cost-control.ps1 -Action status -AwsCli $aws
# 以下两条是业务写操作，只有确实需要时才选一条执行：
./scripts/stop-aws-services.ps1 -AwsCli $aws
./scripts/start-aws-services.ps1 -AwsCli $aws
```

**为什么刚打开不会被旧告警再关闭：** S3保存本月consumed，恢复前发布的旧通知会忽略，已消费档位不再执行；消息重复投递也不会当成新档位。本月consumed=[5,10,15]，下一点是$25；下月按UTC月份重新监控，但不会自动开站。若恢复时已经超过$25，四档都消费，本月之后没有更高档。

**实际验收：** 关停后并发0/0、API503、CloudFront停用Deployed；恢复后并发5/1、全部原配置一致、首页/API200。向已消费5/10/15主题实际Publish，逐MessageId看到ignored-consumed，快照不变、失败队列为空。没有往未消费的$25发测试，以免停站。真实账单跨档、跨月、停止在途发布尚无云上证据。

预算数据有延迟，关停时费用可已超阈值；S3存储、DNS等仍可能收费。SNS是消息分发，本项目配置Lambda和邮件，没有配置短信。完整边界见[费用控制说明](docs/aws-cost-control.md)，实际命令／失败修复见[操作补录](docs/aws-commands-20261114.md)。

### 31. CloudFront双环境与前端渐进发布

### 32. SSM Parameter Store业务配置

### 33. 旧Lambda版本与S3发布制品清理

本章的Lambda旧版本／当前发布制品生命周期清理**尚未实施**，没有删除当前版本或回滚制品。2026-11-14另外完成的是旧练习资源清理：无用EFS、四个旧S3桶及3701个历史版本／删除标记、两个旧CloudFront、失效testec2 DNS别名。操作先核消费者、日志／复制、对象锁／版本清单，经用户授权后按固定名单删除；详见[清理记录](docs/aws-resource-cleanup.md)与[SDK操作补录](docs/aws-commands-20261114.md)。

清理时保留正式Hosted Zone／证书验证、网站／制品／Terraform状态／费用控制四个桶；后续简历方案另新增一个私有资料桶，目前五个项目桶。EFS既有备份恢复点也保留。不要把旧练习桶删除脚本当日常制品清理脚本重跑。

### 34. 告警通知与日常费用复盘

**已完成：** 结果邮件经用户确认；四个预算通过SNS连接控制Lambda；失败事件保留14天进入SQS队列，CloudWatch队列告警发往结果邮件；日志保留14天，配置快照版本保留规则见Terraform。没有发送故障测试到未消费$25，也没有验收所有故障通知路径。

日常查看（前两条只读；最后一条是Cost Explorer查询，可能有API费）：

```powershell
./scripts/cost-control.ps1 -Action status -AwsCli $aws
& $aws budgets describe-budgets --account-id 561798268037 --profile kong-dev
./scripts/get-aws-costs.ps1 -AwsCli $aws
```

**要理解返回值：** mode=on/off是脚本记录的管理状态，CloudFront还需传播；consumed记录本月已消费的费用档位，不代表执行过几次关停。错误／失败队列非空时先核实际开关，再决定重试；费用关停不是代码版本回滚，不会重启被停止的旧发布。

本月约$19.02大部分来自域名$16和税$1.73，并非全部是服务器常驻费。费用／清理／配额是不同问题，预算恢复不会给Bedrock增加服务配额。[当前费用来源](docs/aws-cost-control.md)与[历史原ECS预算](docs/aws-cost.md)要分开阅读。
### 35. Docker镜像构建与ECR

### 36. ECS与ALB蓝绿部署对照练习
