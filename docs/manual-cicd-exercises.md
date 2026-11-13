# 手动 CI/CD 故障演练

本轮先补一次小 Story：审批①拒绝，验证问题候选不能进入生产。本文是操作方案，不是执行成功记录。

## 已有证据与待补练习

依据 `docs/rollback-drill.md`、`docs/frontend-publication.md`、`AWS_EXECUTION_LOG.md`；当前线上状态仍需操作前重新核对。

| 场景 | 已有证据／下一步 |
|---|---|
| 健康候选 10% 后受控停止 | 已验证 CodeDeploy 自动回滚，重做属于复习 |
| 审批①／②拒绝 | 补充手动拦截练习，区分阻断与回滚 |
| 后端实际应用故障 | 待演练；先确定不会在 STG／Green 被提前拦住的受控触发设计与隔离范围 |
| CloudWatch 告警触发 | 配置存在，真实触发恢复待单独演练；人为设置告警状态不能算应用错误指标已验证 |
| 前端 LIVE 后故障恢复 | 待演练；已发生的 DEVELOPMENT 检查失败没有覆盖 LIVE 后恢复 |

## 本次：审批①拒绝

验收：本次 ApproveProduction 被拒绝，后续 VerifyGreen／ApproveTrafficShift／DeployProduction／PublishFrontend 没有为本执行启动；生产 live 数字版本及附加权重、前端 releaseId/sourceCommit 与开始前一致，公网功能仍正常。

1. 东京区域，先检查 candidate 是否有 InProgress／排队执行。若有，先明确其用途，本练习不取消、批准或重试其他执行。
2. 记录生产 Lambda `live` 的数字版本／权重、`/version.json` 的发布标识与源码，并检查 health 和三语 profile。
3. 从已推送、同 SHA 的 CI 已通过的正常源码启动一次新 candidate。固定完整 SHA 并记录 execution ID；使用正常源码即可，不需要制造 Bug。ReleaseMode 明确为 `deploy`，本次在审批①拒绝，不继续批准。
4. 等本执行 BuildCandidate、VerifyStaging 成功后，进入 ApproveProduction → Review，核对同一 execution ID／SHA／STG 报告。
5. 选 Reject，理由填写“学习演练：验证审批①拒绝能阻断生产发布”，提交。
6. 查看本执行的动作明细：审批失败是本次预期；后续没有属于本执行的新动作。不要把画面上其他历史执行的成功状态当成此次运行。
7. 再次核对第 2 步的生产值与公网接口。保存本执行 ID、SHA、拒绝结果和前后对比。

本练习会消耗现有 CodeBuild／STG 调用，不创建资源、不改 Terraform，也不修改生产 alias。按上述停止点完成后暂停复盘；不要直接重试被拒绝的审批来继续发布。

## 后续真实 Bug 回退的边界

构建／STG／Green 能检测到的 Bug 应当被前置拦截，这不能算生产回滚演练。后续需单独准备受控触发、明确的恢复基线和清理步骤，同时保留两道生产审批。直接修改生产 alias 不能冒充 CodeDeploy 自动回滚；恢复成功要有回滚 deployment ID、Succeeded、live 权重恢复及公网验收证据。
