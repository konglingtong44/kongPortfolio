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
