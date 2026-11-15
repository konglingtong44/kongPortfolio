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
