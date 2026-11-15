# 2026-11-15：VerifyGreen失败诊断与修复

用户报告VerifyGreen失败。先恢复已过期的CLI SSO，仅作登录；没有把登录当作部署批准。只读检查执行16a8e52c…、Green构建58799f74…及生产alias／公开version／health。

诊断：Green22前五条检查通过，英文AI回答触发`AI answer adds an unsolicited experience disclaimer`。失败后没有生成report.json，随后UPLOAD_ARTIFACTS因无匹配文件失败；主因是回答检查，非制品上传。生产live20／无权重，公开网页仍978a636／be998dc6…，health200／UP，没有DeployProduction或PublishFrontend动作。

```powershell
aws.exe sso login --profile kong-dev --no-browser --use-device-code
python .local/typed-fix-candidate-run.py poll
python .local/diag-green-20261115.py
python .local/repro-green-en-20261115.py
```

只作一次固定版本22英文复现，HTTP200且没有命中该限制模式，输入5506／输出260 tokens；说明输出存在波动，不能证明原触发一定误判。原失败正文仅在构建临时文件、未被共享日志／报告保存，无法重建具体触发句，不循环调用直到通过。私有证据`.local/green-failure-20261115/`，不上传Git。

修复：新增QuestionFacts，仅对AI主题从已校验固定资料中选择相关原文，保留项目标题和工作／学习语句，排除资料规则、个人网站部署段及责任对照注释；其他主题全文不变。当前实际资料6943→773码点，私有选取结果通过本机Java校验，不新增事实或更改S3。AI回答要求工作任务／工具使用／学习技术三段并在学习段结束，原风格检查保留。

Green主验证流程新增失败报告：passed=false、当前检查、Green版本、已完成指标和当前调用usage，只允许已知安全的错误原因；没有回答正文、原始错误或私有资料。共享校验对passed=false仍拒绝提升。成功报告格式及两道人审不变。原Green22已热，不能把直接重试当新的冷启动验收，改用新源码候选。

```powershell
. ./scripts/tools.ps1
mvn.cmd -f backend/pom.xml test -B -ntp *> .local/green-failure-20261115/backend-final-test.log
node --check scripts/verify-green.mjs
node scripts/test-green-contract.mjs
node scripts/test-staging-contract.mjs
node scripts/test-deployment.mjs
node scripts/test-frontend-release.mjs
javac -encoding UTF-8 -cp backend/target/classes -d .local/green-failure-20261115 .local/green-failure-20261115/QuestionFactsSample.java
java -cp 'backend/target/classes;.local/green-failure-20261115' dev.kongortfolio.bedrock.QuestionFactsSample .local/scope-policy-20261114/facts.md .local/green-failure-20261115/selected-ai-private.md
python .local/prepare-green-repair-run.py
python .local/green-repair-candidate-run.py preflight
```

本地后端61项通过（新增3项主题证据测试），Node守卫和失败报告不泄露正文测试通过；前端未改，不重复本地76项／15组浏览器。真实资料匹配与选择在本地完成，不等于新代码模型质量已验收。新预检live20／无权重、无在途候选、费用on，固定资料及上限一致，两道人审保留；新证据目录`.local/green-repair-release-20261115/`。没有重试旧Green、apply、更新资料、创建新收费服务、SNS或off/on。

接下来明确暂存修复代码及文档，hooks扫描后push，显式COMMIT_ID启动新候选。AWS完整构建／STG及后续Green结果后补；助手不调用任何审批API。

## 新候选实际结果

明确暂存13文件并提交`fix: isolate AI career evidence and retain safe Green failure diagnostics`，源码78ac795344c46f39a97ec7bb4b843111b62d2f09；staged及64提交全历史Gitleaks通过，推送feat/aws-serverless-ci。`python .local/green-repair-candidate-run.py start`显式COMMIT_ID启动c4801ece-4249-4e79-9732-4456d1272b76。candidate kongportfolio-candidate:8bed06b0-1d8b-498d-ba5d-18d8a691e72b通过76／61／5及实际ZIP；STG kongportfolio-stg:540b6c1d-d831-4a57-86f2-6a6325ee24da发布27并通过8HTTP／6范围／2事实展示检查。

```powershell
python .local/green-repair-candidate-run.py poll
python .local/typed-build-status.py .local/green-repair-release-20261115
python .local/prepare-green-repair-reviews.py
python .local/inspect-green-repair-final.py
python .local/green-repair-style-review.py
python .local/finish-green-repair-docs.py
python .local/sync-green-repair-docs.py
python .local/check_aws_docs.py
git diff --check
```

只读inspection下载同次STG报告并验证实际CodeSha256、固定来源执行／commit、生产alias、费用状态和公开version／health。release bfea6640ec45cc3e99ef4090d8fe476f11b63ce0fc80ae94b0f4b8229a2ade23，backend bc39c4cdad8be92cfcfcb86604c80f34ec3d5f505dad0d01829594b94fc79959。追加三语私有STG27样本，attempt文件防止重放；第二窗口原有2条加此3条共5条，不超应用6/min。三语原限制性说明及个人网站历史段未出现；输入1315／1218／1192、输出211／145／169，人工复核范围仅这些样本。

新STG5次生成14,736／884 tokens，补查3725／525，合计8次18,461／1,409，模型费用按此前核对单价估算$0.00647801。另一次旧Green诊断5506／260；原失败Green3次生成未完整留tokens，排除估算，不当成免费。税、构建／Lambda等另计。其他主题仍全文，AI选择不减少首次S3完整快照读取，减少的是送模型的相关内容。

15:26 JST核对首审批InProgress、live20／无权重、生产alias及LATEST与预检相同、费用hash未变、公开网页仍978a636且health200／UP。没有新生产Green验收、切流或前端发布。原失败Green22资料及日志在旧目录保留，新修复目录有run／report／final-inspection／style-safety／semantic-review／usage-summary。失败报告安全性在Node单测验证，没有故意制造云上故障验证该分支；不承诺已在生产修复。当前候选见[交接说明](bedrock-typed-release.md)。

文档收尾24份／145相对链接／28脚本引用及diff通过。命令为`git add -- AWS_EXECUTION_LOG.md AWS_LEARNING_GUIDE.md README.md docs`、`git commit -m 'docs: record Green repair staging evidence and approval handoff'`、`git push origin feat/aws-serverless-ci`；仅12份文档，hooks扫描，不包含私有资料／报告／outputs，不再运行start或模型测试。候选源码仍固定78ac795。

## 用户另启执行后的成功发布复核

用户OK后原c4801ece查询到ApproveProduction Failed。读取审批摘要Rejected，列最近执行发现530833d0-8539-4c94-a71c-fc8b9b210d30已Succeeded，源码为当时分支最新76f04a816f35c74a754422feb3809a7c1f353d5c。没有重试被拒绝的旧执行，也未推断其为新的模型故障。

```powershell
python .local/green-repair-candidate-run.py poll
python .local/diag-approval-20261115.py
python .local/review-user-release-20261115.py
python .local/write-accepted-release-docs-20261115.py
python .local/check_aws_docs.py
git diff --check
```

只读SDK：get_pipeline_execution／list_action_executions／list_pipeline_executions，按成功执行的outputArtifacts位置S3 get_object读取四份report.json；Lambda get_alias／get_function_configuration，费用S3状态hash，以及公开GET version／health／三语目录。git diff --name-only 78ac795…76f04a8仅Markdown，应用代码一致；仍严格按本次源码、执行、release和实际hash验收，不能拿旧报告代替。

STG28，Green23，live23无权重；backend SHA-256=22352c625e146eb0de42060fb66bcf4d0123ee153ea53892cb79e14fa1bf12cf，release96f5109b01bc947421118c96dcd8082e309274cc85a897052dbdec77112aab2e。Green8HTTP、三语回答／三语拒绝passed，冷问答3710.62＋4447.76＝8158.38ms。CodeDeploy d-UBZGH91GM outcome=deployed，20→23；同次前端报告passed，包含immutable-assets／development-routing／live-html-version-assets-api。两道审批均Succeeded，助手未执行批准。

16:20 JST公开version=76f04a8／同次release／sourceDirty=false，health200／UP，日中英问题目录各17项enabled=true；角色／配置／资料pin符合原审核值，费用状态hash未变。本轮0新模型生成、0新部署／配置写入，未重复已通过的应用／容器测试或新增浏览器交互。新手动输入已随网页上线，但不称为iPhone真机或新增浏览器到生产模型E2E已测。私有证据`.local/accepted-repair-release-20261115/{VerifyStaging-report,VerifyGreen-report,DeployProduction-report,PublishFrontend-report,verification}.json`。

同步当前发布文档，保留旧失败与拒绝执行历史。后续资料维护应更新其他主题的个人项目状态；本轮不修改职业事实或S3资料版本。文档提交不会自动启动候选（Source DetectChanges=false），不复用旧审批。

最终24份文档／153相对链接／28脚本引用及diff检查通过。文档命令：`git add -- AWS_EXECUTION_LOG.md AWS_LEARNING_GUIDE.md README.md docs`，`git commit -m 'docs: record accepted production23 release and execution identity'`，`git push origin feat/aws-serverless-ci`。仅12份文档，经hooks扫描，不重新部署或生成模型回答；私有报告／配置与用户outputs未暂存。

## 首屏AI／内容占位／自然提问：本地Story

用户授权将表达式白名单替换为一次提示词语义判断。先读取AGENTS及现有App／Gallery／问答、测试、STG／Green守卫、已批准私有资料与发布／学习文档，git status初始只有用户outputs未跟踪。无子代理。实现与验收范围见[本地增量](bedrock-natural-questions.md)。

修改：新增ProfilePending及CSS；App保留加载／失败时的正式外框和技术栈占位，超时8→20秒，10秒慢提示、15秒接近末端的非定量进度，失败手动重试。首屏增加单个三语AI按钮，去掉工具区about嵌套入口。QuestionScope成为18项示例目录；QuestionService传访客原文，单次Qwen返回严格JSON，Java检查两字符串字段、决定、尾随／重复内容、空答案、截断及usage，坏响应502不重试。拒绝附真实tokens，日志只记录决定与策略。原输入／限流／超时保护保留。所有问句使用职业事实并排除旧政策、过期Q&A未公开备注和未经询问的责任注释；S3对象／版本／SHA／权限不变。STG补技能口语及要件定义笔误样本，语义拒绝验收不再认零tokens，生产两道人审保留。

工具／命令（PowerShell，helper与真实回答留ignored .local）：

```powershell
git status --short
rg --files frontend/src
rg -n 'gallery-pin|gallery-body|gallery-controls' frontend/src/mobile.css frontend/src/intro.css
. ./scripts/tools.ps1
python .local/app-loading-hero-edit.py
python .local/make-semantic-catalog.py
python .local/semantic-service-edit.py
python .local/semantic-ci-edit.py
npm --prefix frontend test
npm --prefix frontend run build
node scripts/package-frontend.mjs
mvn.cmd -f backend/pom.xml test dependency:build-classpath '-Dmdep.outputFile=D:/study/kongPortfolio/.local/semantic-classpath.txt' -B -ntp
mvn.cmd -f backend/pom.xml test -B -ntp
mvn.cmd -f backend/pom.xml -Plambda clean verify -B -ntp
node scripts/test-lambda-package.mjs
node --check scripts/verify-staging.mjs
node --check scripts/verify-green.mjs
node scripts/test-staging-contract.mjs
node scripts/test-green-contract.mjs
node scripts/test-deployment.mjs
node scripts/test-frontend-release.mjs
npm --prefix frontend run dev
node .local/semantic-ui-browser.mjs
node .local/semantic-error-browser.mjs
& 'D:\software\AWSCLI\aws.exe' sts get-caller-identity --profile kong-dev --query '{Account:Account}' --output json
$env:AWS_PROFILE='kong-dev'
$env:AWS_REGION='ap-northeast-1'
$semanticCp = 'backend/target/classes;' + (Get-Content .local/semantic-classpath.txt -Raw).Trim()
javac -encoding UTF-8 -cp $semanticCp -d .local .local/SemanticModelSmoke.java
java -cp ($semanticCp + ';.local') dev.kongortfolio.bedrock.SemanticModelSmoke
java -cp ($semanticCp + ';.local') dev.kongortfolio.bedrock.SemanticModelSmoke .local/semantic-review-20261115/final
java -cp ($semanticCp + ';.local') dev.kongortfolio.bedrock.SemanticModelSmoke .local/semantic-review-20261115/verified
node .local/review-semantic-results.mjs
python .local/write-semantic-docs.py
python .local/finish-semantic-docs.py
```

所有后续小修使用apply_patch：共享Gallery标题／提示／控制区使加载前后尺寸一致；更新Lambda目录18项断言；严格JSON重复字段检查；语义提示修正和过期备注过滤；输入示例、HTTP／隔离／usage／错误保护测试。helpers不是可反复执行的部署脚本；实模helper校验资料hash并拒绝重放已存在的报告。每轮超过6次时等待65秒换窗口，无自动重试、无并行调用。

遇到的问题与修复：首次Maven未给-D属性加引号被PowerShell拆解，报`.outputFile=D`插件不存在，正确引用后通过。Lambda专用测试仍期待17项，改为18／semantic-v2后通过。浏览器先发现手机加载／正式高度差22px、WebKit英文控制区差约10px，补齐同样的标题提示及控制结构后15组通过。错误场景初始被开发StrictMode双挂载的第二次成功fixture覆盖；fixture改为点击重试前全部503，再允许恢复，6组通过，不当成产品自动重试漏洞。

实模第一轮9次，转职动机被错误REFUSED；增强“缺少事实仍ANSWER且未确认”。第二轮12次决定／结构通过，但人工复核发现需求回答推测Jira／Confluence用途、非功能流程，AI经历复述旧未公开备注，未知答案还提来源。未把该轮标为最终质量通过：保留原样本，增强具体项目证据／不推测工具用途／直接未知说明，固定排除过期备注，再测试最终源码。最终12次全部按预期：技能口语、要件定义笔误、日英具体做法、天气、夹带快排、记忆新技能、再次技能、转职未知及三语AI经历；9条ANSWER沿用发布风格检查通过。人工复核最终要件动作可在审核原文找到依据、未知动机直接未确认、未复述旧未公开或职责免责声明，后续未采用secret-rocket-X。模型仍可能误判／幻觉，不保证全部未来问句。

最终前端78项／构建及静态制品、后端41项、Lambda5项／ZIP 38.6MiB实际运行、Node STG／Green／部署／前端守卫通过。后端测试由原61→41主要因为取消问句完整匹配及19种确定性拒绝参数用例；新的传递／单次调用／结构失败／usage／限流／隔离／日志保护测试和实模样本分别验证，不能宣称仍有硬白名单的确定性语义保证。浏览器Chrome1366×900／390×844／320×568，WebKit390×844／844×390三语15组通过，加载前后章节及主体区域高度差不超过2px；Chrome／WebKit320×568三语错误与手动恢复另6组高度一致。查看桌面及WebKit手机首屏、占位和错误截图。不是iPhone真机、浏览器到真实模型或新Lambda生产角色验收。

实模证据`.local/semantic-review-20261115/{model-report.json,final/,verified/,summary.json}`；各轮9／12／12次，输入43,812／59,298／60,162，输出663／1,020／1,036，共33次163,272输入／2,719输出。复用当日官方东京价格精确Mantle Standard核对，输入$0.27／百万、输出$1.06／百万，模型费估算$0.04696558，失败样本也计入；不含税和其他服务、非账单。最终每次输入约5,007～5,021、输出10～183，仅本组样本；长问题及后续补资料会增加。没有知识库／向量／Embedding／Guardrail／第二次分类调用费。

AWS只读STS确认账号，模型经现有Mantle端点、本机SSO真实调用；无新资源、资料上传、IAM／Terraform、SNS／费用off/on、管线启动、审批或生产部署。本轮代码未发布，线上基线仍76f04a8／live23。学习、log、README、范围／前端／Java／资料／架构／发布及手机文档已标本地新策略与历史生产的差别。私有资料／回答／.local及用户outputs不入Git，待本轮评审后再进入新AWS候选。

收尾追加Green守卫：同次STG必须包含技能口语、要件定义笔误、未知转职动机及团队贡献四条presentationChecks，逐条成功且有真实usage；缺少或失败的任意一条均拒绝发布。Node守卫及部署／前端回归通过，不新增模型调用。补充DESIGN_NOTES首屏／占位当前说明。

```powershell
python .local/check_aws_docs.py
node .githooks/check-staged-paths.mjs --all
git -c core.safecrlf=false diff --check
& 'D:\software\Gitleaks\gitleaks.exe' dir --redact --no-banner .
```

当前文档链接／脚本路径、私有跟踪路径、diff及Gitleaks通过，无泄漏。浏览器模拟完成后通过Get-NetTCPConnection获取5173所属PID，再用Get-CimInstance确认命令行同时属于本仓库frontend与vite，仅Stop-Process结束本轮启动的Vite PID34388；未停用户其他服务。没有commit／push，保留工作区供评审。

## 自然问答候选：启动预检

用户明确“开始”，授权进入AWS现有候选流程。新建ignored helper semantic-candidate-run.py与独立semantic-release-20261115目录，保留旧发布身份／失败证据。SDK只读预检STS账号、成本state、管线和动作定义、prod live／LATEST／版本及STG配置：live23无权重、无在途候选、费用on、相同资料pin及输出1024、prod模型HTTP15／STG20秒、两道人审、Source分支与DetectChanges=false均符合。新helper报告核对四条presentationChecks、同次commit／execution／实际不可变版本hash、生产与费用快照不变；不发审批结果。

```powershell
git status --short
git branch --show-current
git log -3 --oneline
git config --get core.hooksPath
python .local/prepare-semantic-candidate.py
python .local/semantic-candidate-run.py preflight
git -c core.safecrlf=false diff --check
```

接下来明确暂存本Story已审阅的已跟踪改动与三个新文件，经过hooks扫描后commit／push；显式COMMIT_ID启动一次候选。AWS构建、STG及第一审批交接结果后补，不沿用旧审批或自动部署生产。用户outputs与私有资料／回答不暂存。

## 首次AWS结果与中文语言修复

明确暂存40文件，经staged及67提交全历史Gitleaks通过，提交163c270fdd4fff8ee741332b8b2bfb2c2933d56d并push。显式源码启动c1a531aa-2a2d-4815-8a44-37fe0432897f。candidate cb30b004-86b7-4ae4-8fb8-6a099212285f通过前端78、后端41、Lambda5、实际ZIP及Node守卫。STG b11e2b2a-7e09-47de-81f1-18ea6c5e160f发布29，8HTTP／三语语义拒绝／三语AI回答通过；70秒窗口后首条skills-colloquial-zh触发Chinese answer contains Japanese prose，VerifyStaging失败，后续未到审批／Green／生产。原脚本未在失败时写report，UPLOAD_ARTIFACTS也失败；这不是主要失败原因。7次模型请求已发生，但未留usage报告，不能算免费或给精确费用。

未放宽假名检查，也未重复旧STG29直到得到好答案。增强zh最终指令为纯简体、不含平假名／片假名，将职称／业务术语译中文，英文字母技术名保留；日英有各自语言指令。STG增加passed=false安全报告，逐步保存check与usage，失败也能上传report，不含问题、回答、资料或原始错误；本地测试验证安全字段和失败值，未故意云端注入故障。旧失败正文未保存，不能精确指出当时哪一个假名词。

```powershell
. ./scripts/tools.ps1
$storyPaths = @(git diff --name-only)
$storyPaths += @('docs/bedrock-natural-questions.md','frontend/src/ProfilePending.tsx','frontend/src/profile-pending.css')
git add -- $storyPaths
node .githooks/check-staged-paths.mjs
git diff --cached --check
git commit -m 'feat: add natural portfolio Q&A and loading states'
git push origin feat/aws-serverless-ci
python .local/semantic-candidate-run.py start
python .local/semantic-candidate-run.py poll
python .local/typed-build-status.py .local/semantic-release-20261115
python .local/prepare-semantic-inspection.py
python .local/capture-semantic-public-before.py
node --check scripts/verify-staging.mjs
node scripts/test-staging-contract.mjs
node scripts/test-green-contract.mjs
node scripts/test-deployment.mjs
node scripts/test-frontend-release.mjs
mvn.cmd -f backend/pom.xml test -B -ntp
$env:AWS_PROFILE='kong-dev'
$env:AWS_REGION='ap-northeast-1'
$localeCp = 'backend/target/classes;' + (Get-Content .local/semantic-classpath.txt -Raw).Trim()
javac -encoding UTF-8 -cp $localeCp -d .local .local/SemanticLocaleSmoke.java
java -cp ($localeCp + ';.local') dev.kongortfolio.bedrock.SemanticLocaleSmoke
node .local/review-semantic-locale.mjs
python .local/prepare-semantic-locale-run.py
python .local/semantic-locale-candidate-run.py preflight
python .local/capture-semantic-locale-public-before.py
```

公开基线读取首次按本地version字段commit取值报KeyError；核对线上固定结构为gitCommit后正确重读，只读无写入。公开version仍76f04a8／release96f5109b…、health200／UP。新独立目录semantic-locale-release-20261115预检仍live23／无权重、费用on、两道人审、无在途候选、资料及上限一致；旧semantic-release-20261115失败证据保留。

修复后后端41项／Node守卫通过，6次本机SSO真实Qwen（技能／需求定义／未知动机中文、AI日中英）及现有风格检查通过；30,484输入／619输出，模型费估算$0.00888682，未含税／其他AWS费用，不是STG角色验收。回答私存semantic-locale-review-20261115；没有重测未改动的前端浏览器／容器，也未改职业事实、资料版本或模型权限。接下来提交此修复并走新候选，结果后补。

## 语言修复新候选：STG通过、停在首审批

提交`fix: enforce localized Q&A output and preserve staging failures`，源码b8ca8b0d3b655b41be9ac9ec3ad62cd1d56815f8，10文件经hooks及68提交全历史扫描推送。显式COMMIT_ID启动7e728e3d-42fb-4043-acf8-1c2f0b47c20f；本轮未重试旧失败STG29。源码b8ca8b0／执行7e728e3d-42fb-4043-acf8-1c2f0b47c20f通过AWS构建及STG30：8HTTP、三语回答／拒绝与4条自然问法／事实展示全部通过，正在第一审批。生产live23／无权重、公开76f04a8／release96f5109b…及health200／UP未变，费用state hash未变；没有新Green／切流／前端发布。

```powershell
git add -- $localePaths
git commit -m 'fix: enforce localized Q&A output and preserve staging failures'
git push origin feat/aws-serverless-ci
python .local/semantic-locale-candidate-run.py start
python .local/semantic-locale-candidate-run.py poll
python .local/typed-build-status.py .local/semantic-locale-release-20261115
python .local/semantic-locale-candidate-run.py report
python .local/inspect-semantic-locale-candidate.py
python .local/finish-semantic-staging-docs.py
python .local/check_aws_docs.py
git diff --check
```

SDK下载同次StagingReport并核对passed、策略semantic-v2、8HTTP／6范围＋4事实展示，所有10条modelInvoked=true且usage>0；STG30实际CodeSha256与报告backend SHA一致，固定execution／commit／release不能替换。release 4fa9c776bee0f3d26bb51c7db04c18a9e7ab6a380b09d81405cd1f5327db4693，backend ba8caf355735637b4dfb29cf0a5d7ef34303cd3e8d3fea22bb5c2b6dfbeddabc。prod alias版本／RevisionId／权重、LATEST配置／代码、已发布版本列表均与本轮预检一致；费用state字节hash未变，公开version与前置快照一致。未调用批准API或新增生产版本。

本次STG10次Qwen 50,709输入／629输出，模型费估算$0.01435817，含3次语义拒绝；未含税／其他AWS费用、不是账单。首轮失败7次无usage不可纳入精确总计，本机语言6次另$0.00888682。未增加STG样本抽查或重复模型请求；三语语言／来源／职责提示及两种用户自然问法／未知动机／团队归属由既有发布检查验收，正文不进入报告或Git。

前端78、后端41、Lambda5／ZIP由本轮AWS构建验证；未新测Docker镜像、浏览器到真实模型、iPhone真机或新生产角色／冷启动，后两项应在首审批后Green完成。安全失败报告只作本地Node测试，没有云端故障注入。私有证据semantic-locale-release-20261115，旧失败证据semantic-release-20261115保留。

更新README／学习／log及范围、前端、Java、资料、架构、当前候选等文档；文档收尾不启动第三个候选、不改变固定源码b8ca8b0，用户outputs及私有资料／回答不暂存。接下来用户在AWS第一审批审核本次执行；Green成功后还有第二审批，助手不代批。

文档收尾26份／169相对链接／29脚本引用及diff通过。仅暂存11份Markdown，`git commit -m 'docs: record semantic staging approval handoff'`、`git push origin feat/aws-serverless-ci`经hooks扫描；Source DetectChanges=false，不启动第三轮。提交后只读poll复核同次执行仍等首审批，源码固定b8ca8b0，不与文档HEAD混淆。
