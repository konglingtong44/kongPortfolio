# 部署入口

适用于已有环境的日常应用发布。首次搭建走[学习02](../learning/02-first-site.md)与[03](../learning/03-delivery.md)；不要重放历史命令日志。

```text
固定源码 SHA → AWS CI → BuildCandidate → VerifyStaging
→ ApproveProduction ① → VerifyGreen
→ ApproveTrafficShift ② → CodeDeploy 10% / 5分钟 → 100%
→ PublishFrontend → 公开版本 / health / 功能验收
```

阶段定义以 [candidate-pipeline.tf](../../infra/terraform/cicd/candidate-pipeline.tf) 为准。[buildspec](../../codebuild/) 调用 [scripts](../../scripts/)；STG、Green、生产复用同一个候选，不重新构建。

## 日常操作

1. 本地执行 `scripts/check.ps1`，审查差异和秘密扫描结果，明确选择文件提交。`git commit` 仅在本地；推送后才运行 AWS CI。
2. 确认目标完整 SHA 的 `ci/frontend`、`ci/backend` 均成功，核对 CodeBuild 的实际源码版本。不能把历史构建当成本次通过。
3. 需要发布且已获本次发布授权时，在仓库根目录用以下命令固定源码启动流水线：

```powershell
$releaseSha = git rev-parse HEAD
aws codepipeline start-pipeline-execution --name kongportfolio-candidate --source-revisions "actionName=GitHub,revisionType=COMMIT_ID,revisionValue=$releaseSha" --variables "name=ReleaseMode,value=deploy" --region ap-northeast-1
```

4. 第一审批核对 execution、SHA、候选摘要与 STG 报告，允许创建／验证生产 Green；第二审批核对同次 Blue/Green、报告和 ReleaseMode，允许切流及同候选前端发布。每次新 execution 保留两次新审批。
5. 核对同次部署／前端报告、公开 `version.json`、`/api/health` 与实际功能。只看 health 不能证明版本、问答语言或 UI 正确。

认证、精确命令与排错见[学习06](../learning/06-operations.md)。本页面不表示本轮已执行发布。Terraform 变更先恢复现有 ignored 输入、生成并审查计划；创建付费资源需用户明确批准。

## 回滚与证据边界

`ReleaseMode=rollback_drill` 在观测到 10% 后受控停止，验证 CodeDeploy 自动恢复 Blue，不推广全量、不发布前端。前端恢复旧 release 指向和后端 alias 回滚是两套机制。

已保存的演练证据见[回滚记录](rollback-drill.md)。后端应用故障／CloudWatch 告警触发、前端 LIVE 发布后真实故障恢复等覆盖缺口，沿用记录中的边界，不能因本地脚本通过改称云上验证。

其他文件按原 Story 保留：[CI](aws-ci.md)、[候选](candidate-pipeline.md)、[STG](staging-approval.md)、[Green](green-approval.md)、[前端发布](frontend-publication.md)。[旧部署规划](deployment-plan.md)和[旧 CI/CD 规划](cicd.md)含 ECS 历史方案，当前操作以本入口、代码与本次报告为准。
