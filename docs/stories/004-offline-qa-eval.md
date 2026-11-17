# Story004：离线问答契约评估

2026-11-17。状态：本地完成，待评审。

## 验收标准

- 合成、版本化评估集可重复运行；覆盖三语、预设拒绝／未知事实、语言错误及畸形响应。
- 通过内存假gateway驱动真实Java服务，不启动Spring，不创建AWS客户端或调用真实模型。
- 脱敏报告关联样本和服务摘要；错误期望让Maven失败，失败／未完成报告不复用旧成功。
- 补充学习记录，运行完整后端检查及文档／秘密检查。

## 实现与验证

数据位于`backend/src/test/resources/qa-eval/`，17个合成样本；运行器为`OfflineQaEvaluationTest`。复用既有服务的包内构造器，未修改业务代码或增加依赖。每个样本隔离服务实例，校验单次假调用、结果及服务端拒绝文本；报告在ignored `backend/target/qa-eval/report.json`。

定向评估首次17/17通过。负向控制使用ignored样本副本，将首个期望反转：Maven失败且报告16/17、passed=false。完整`clean verify`通过45项JUnit测试，其中本评估记为1项。日志位于ignored `.local/story-004-backend.txt`。

另提供损坏JSON副本：Maven失败，旧成功报告被覆盖为STARTED／passed=false。最后恢复默认定向评估，17/17通过。独立检查报告仅含规定的摘要字段，生产JAR不含评估集或runner。`node scripts/check-docs.mjs`通过79份Markdown；`git diff --check`及Gitleaks扫描通过。未提交或推送。

本轮未改前端，不重复前端测试；未执行Lambda、容器、浏览器、AWS CI／部署或真实推理。这个增量是离线响应契约回归，不能作为真实模型语义、未知事实或防注入验收。学习过程见[08章](../learning/08-offline-qa-eval.md)。
