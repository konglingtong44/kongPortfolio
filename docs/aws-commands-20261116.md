# 2026-11-16 AI问答面板发布记录（执行中）

用户确认新进度条与固定阅读／输入布局，明确要求上线。验收：新源码通过AWS构建、独立STG及既有两道人审流程；使用同次制品发布，公开version／资源／health与报告一致。前端79项、构建及17组浏览器模拟已在前一轮通过，本轮不把本地样例当成生产验收。

23:59 JST开始只读发现，但STS前凭证刷新失败，SSO token已过期；没有读到新的生产或管线状态，没有AWS写入。启动CLI设备登录并通过异步问题给用户发恢复链接，等待登录期间整理提交与新helper；设备码不写入Git。本轮跨入11月16日，使用独立ignored目录`.local/qa-panel-release-20261116/`。

```powershell
git status --short
git log -4 --oneline
Get-Content AGENTS.md -Encoding utf8
python .local/inspect-qa-panel-before.py
& 'D:\software\AWSCLI\aws.exe' sso login --profile kong-dev --no-browser --use-device-code
python .local/prepare-qa-panel-candidate.py
```

新候选helper复用既有带保护的发布入口：记录当前实际live基线而不硬编码旧23；确认无在途候选、无附加权重、资料pin／上限一致、费用on、两道人审和DetectChanges=false。显式COMMIT_ID，start前重新核对生产／费用快照、干净已跟踪工作区及远端源码。报告验证8HTTP／6范围＋4事实展示、semantic-v2、真实usage、实际STG版本hash和生产／费用未变。不调用审批API；已有候选须先看实际阶段再处理，尚未执行停止或新管线启动。

当前只完成发布准备；恢复登录及实际AWS结果后补。私有资料／回答／.local及用户outputs不提交，不改IAM、S3资料版本或费用开关。

先独立完成本地受控提交；恢复登录核对当前管线后再push并启动，避免盲目重复已有执行。前端代码与上一轮79项／17组验证时相同，新增文档记录已获用户上线授权。

```powershell
. ./scripts/tools.ps1
python .local/check_aws_docs.py
git diff --check
$panelPaths = @(git diff --name-only)
$panelPaths += @('docs/aws-commands-20261116.md','docs/bedrock-qa-panel-release.md')
git add -- $panelPaths
node .githooks/check-staged-paths.mjs
git diff --cached --check
git commit -m 'feat: add compact AI answer panel and waiting progress'
```

实际本地提交80918df（13文件），staged Gitleaks通过；28份文档／181相对链接／29脚本引用及diff通过。尚未push，CLI设备登录仍等待用户完成，未能读取新AWS状态或启动发布。此后续记录留本地待发布收尾同步，不把登录等待算作已上线。

## 登录恢复与实际生产24基线

用户确认登录后SDK已可用。读取实际7e728e3d执行，全部阶段Succeeded，两道人审成功；下载同次STG／Green／部署／前端报告并核对source b8ca8b0、passed及execution一致，生产live24实际CodeSha256与报告ba8caf35…一致、无权重。公开version=b8ca8b0／release4fa9c776…、sourceDirty=false，health200／UP。旧Green冷问答4859.31＋3366.30＝8225.61ms仅是旧版样本，不算新面板验收。此前“生产23／等首审批”的文档快照不能当作当前状态。

新预检无在途候选、费用on、两道人审／Source DetectChanges=false、资料pin及输出1024一致、prod模型HTTP15／STG20秒。新before.json、public-before.json和accepted-prior-release.json保留实际基线；不需停止任何旧执行。capture辅助脚本输出的production23是旧固定提示文字，实际JSON与断言已是动态线上基线；已修正提示，不重复覆盖已记录的基线。

```powershell
python .local/inspect-qa-panel-before.py
python .local/qa-panel-candidate-run.py preflight
python .local/capture-qa-panel-public-before.py
python .local/review-qa-panel-baseline.py
```

下一步只提交SSO／基线文档，应用代码仍与80918df一致；push后显式COMMIT_ID启动新候选，实际源码／执行ID及AWS结果后补。不得复用已完成7e728e3d审批，新面板按新候选两道人审。没有新模型调用、S3资料／IAM／费用开关修改或生产写入。

## 面板新候选：AWS构建／STG通过

应用80918df后只提交4份登录／基线文档，08731dc7696c3a4223743e7b9b046f9569ffc371；git diff 80918df…HEAD仅Markdown。71提交全历史扫描通过，push后显式COMMIT_ID启动fdde9128-4fc1-4e5b-bf53-a22ad6728805，没有自动触发第三执行或复用旧审批。

```powershell
git commit -m 'docs: record production24 baseline for panel release'
git diff --name-only 80918df HEAD
git push origin feat/aws-serverless-ci
python .local/qa-panel-candidate-run.py start
python .local/qa-panel-candidate-run.py poll
python .local/typed-build-status.py .local/qa-panel-release-20261116
python .local/qa-panel-candidate-run.py report
python .local/inspect-qa-panel-candidate.py
python .local/record-qa-panel-staging.py
```

candidate bc68e220-6459-4928-aed5-2a8b30846f6d通过79／41／5和ZIP；STG 7e6b98e2-c140-4e50-a1d3-6866c81fa7ee发布31，8HTTP／三语回答拒绝及70秒后的4条自然问法／事实检查通过。源码08731dc／执行fdde9128-4fc1-4e5b-bf53-a22ad6728805通过AWS构建和STG31，正在第一审批。生产仍24／无权重、公开b8ca8b0／release4fa9c776…及health200／UP未变，费用state hash未变。 逐项核对同次source／execution／release、实际版本CodeSha256、prod alias／LATEST／已发布版本列表和费用快照；没有新增生产Green或发布写入。release b7bd2bcb37038a7d9f67c38d620e2e2a242353557c16f4b6d06158928474321b，backend 392b392d03875a7f363f71f052e82b3e984148040daec2e9ca04fa9b10c8a7dd。

STG10次真实Qwen 50,709输入／673输出，沿用已核对东京Mantle单价估算模型费$0.01440481，非账单、未含税／其他AWS费用。安全报告无问答正文。第一道人审入口已向用户发出，引用AGENTS保留两道人审，不调用审批API；后续Green／切流和公开浏览器验收须以本次实际阶段继续，不能套旧24或本地17组模拟。

## 首审批通过／Green25验收

第一审批实际Succeeded，助手未发送审批结果。green e92dda01-2355-442d-9c81-7ff876c3ec5e已通过，新Green25通过8HTTP、三语回答／拒绝，真实冷问答3755.54＋3397.29＝7152.83ms；生产仍24／无权重，网页和费用快照未变，正在第二审批。 SDK下载同次Green报告，与STG31、源码08731dc、release b7bd2bcb…、backend392b392d…绑定一致；实际Green25 CodeSha256、Role／Environment／Memory／Timeout与审核配置相符。live alias版本／RevisionId／权重、前端version及费用state hash与预检一致，health200／UP。

```powershell
python .local/qa-panel-candidate-run.py poll
python .local/qa-panel-phase-logs.py VerifyGreen
python .local/inspect-qa-panel-stage.py green
python .local/record-qa-panel-green.py
```

Green本轮6次模型30,387输入／313输出，三语拒绝也计费；真实冷问答总7.15283秒低于28秒，仅本次样本，不外推全部请求。新Green实际验证不能用旧24或本地SSO样本代替。第二审批ApproveTrafficShift入口已发给用户；批准后才金丝雀切流和同候选网页发布，不使用原b8ca8b0的旧审批或代批。

## 第二审批、金丝雀及新面板公开验收

第二审批实际Succeeded，助手未调用批准API。deploy ef78be33-3ea5-44d6-ace2-399288a9a230按真实CodeDeploy配置LambdaCanary10Percent5Minutes执行，d-BJ3DCQAGM观察到live24＋25权重0.1，最终live25／无权重、Succeeded；部署报告含蓝基线d-DHCA2WAGM及实际金丝雀d-BJ3DCQAGM，不把基线当成新部署。frontend 3a68b8e3-98f3-456e-87c5-eb2b124fd14c随后成功，同次不可变资源／路由／公开HTML-version-assets-API均通过。管线8阶段全部Succeeded，用户亦确认本番已上。

```powershell
python .local/qa-panel-candidate-run.py poll
python .local/qa-panel-phase-logs.py DeployProduction
python .local/qa-panel-canary-status.py
python .local/qa-panel-phase-logs.py PublishFrontend
python .local/inspect-qa-panel-stage.py final
. ./scripts/tools.ps1
node .local/qa-panel-public-browser.mjs
python .local/finish-qa-panel-release-docs.py
python .local/check_aws_docs.py
git diff --check
```

final-inspection下载同次四份报告并核对passed／source／execution／release／hash，STG31／Green25／live25真实CodeSha256一致，部署outcome=deployed及CodeDeploy实际Succeeded，两审批Succeeded；公开version源码08731dc／release b7bd2bcb…／sourceDirty=false，health200／UP。费用state字节hash未变；prod角色／环境／内存／超时与预检一致。仅alias／代码及同次前端由已批准流水线按预期更新，不修改资料对象／权限／费用开关。

公开浏览器使用真实URL，未mock网络：Chrome1366×900仅打开面板，0模型请求；WebKit390×844仅一次技能问题POST，返回ANSWER／semantic-v2／modelInvoked=true及5094输入／160输出，Java标记与纯中文通过。MutationObserver记录进度条节点，返回正文top229.375低于feed底581.828、scrollTop0、标题焦点，发送按钮底771低于844屏高；关闭及页面错误检查通过。已查看真实手机模拟答案截图。不是iPhone真机／软键盘或所有模型回答质量证明。

本次STG10＋Green6＋公开1共17次，86,190输入／1,146输出，按此前核对输入$0.27／百万、输出$1.06／百万估算模型费$0.02448606，未含税／其他AWS费用，非账单。公开helper写attempt标记限制重放，未循环请求取好答案；真实正文及截图仅ignored .local，报告／Git只安全指标。SSO登录及源码提交／旧24基线、STG与Green／两道人审的各阶段均在本页记录，不复用旧审批。

当前发布页面、前端／手机／README／学习／架构／Java／资料／范围等说明已同步25及实际源码身份。后续仅文档收尾，不启动第三候选、重跑模型／容器、改S3资料／Terraform或发送SNS。用户outputs未暂存。

最终28份文档／189相对链接／29脚本引用及diff通过。仅暂存12份Markdown，收尾命令`git commit -m 'docs: record production25 panel release and public verification'`、`git push origin feat/aws-serverless-ci`，由既有hooks执行staged／全历史Gitleaks和私有路径检查。Source DetectChanges=false，文档HEAD不是另一个部署源码，实际发布始终固定08731dc；本轮不再启动管线或模型请求。
