---
name: portfolio-release-review
description: Review kongPortfolio AWS release evidence and diagnose a pipeline handoff using a fixed commit, candidate, execution, and stage reports. Use for release readiness, approval preparation, or deployment failure diagnosis.
---

# 审阅 kongPortfolio 发布证据

先读[部署入口](../../../docs/deployment/README.md)，按需要查[日常操作](../../../docs/learning/06-operations.md)。纯审阅／诊断以读取为范围；用户要求实际部署时沿用本次会话授权，不把审阅请求自行扩为发布。

- 以本次完整 SHA 和 CodePipeline execution 为索引；核对 CodeBuild `resolvedSourceVersion`、候选 manifest／摘要以及 STG、Green、部署、前端报告的关联。旧报告不能替代本次证据。
- 第一审批前检查 STG 报告；第二审批前核对同次 Blue／Green、ReleaseMode 和 Green 报告。两道 AWS 审批保持真实顺序，不用手改 alias 或直接上传绕过。
- `deploy` 与 `rollback_drill` 分别解释；演练不推广全量、不发布前端。前端指向恢复与后端 CodeDeploy 回滚分别核验。
- 失败先查最早失败阶段和原始错误。缺少 report.json 时不能只把制品上传失败当作根因，也不能补造成功报告。
- 输出：本次身份／版本、通过的阶段、失败或缺失证据、当前生产影响和下一步。没有实时查询时明确写“仓库保存记录”，不能宣称实时生产状态。

需要云端构建、付费推理或新资源时，先形成具体范围／预算并遵循已有用户授权；登录恢复不等于部署授权。持久化证据只保存脱敏摘要，不把私有资料正文、凭证、State 或计划写入 Git。
