# S3-07R：受控停止与自动回滚演练

目标：沿现有 AWS 流水线发布健康候选，在观察到10%权重后主动停止，验证 CodeDeploy 自动恢复本次 Blue。最终继续使用演练前的稳定版本；不发布坏代码、不修改生产告警状态，不宣称覆盖告警触发路径。

执行参数 `ReleaseMode=rollback_drill`，默认正常发布仍 `deploy`。模式在第二道人工审批中显示，并与 GetPipelineExecution 返回的 resolvedValue 核对；未知/不一致模式拒绝执行。两道审批仍由用户在 AWS 完成，旧审批不复用。

流程：Candidate → STG → 人审1 → Green验证 → 人审2（明确演练模式）→ Blue-only基线 → 10%canary → `StopDeployment(autoRollbackEnabled=true)` → 独立自动回滚部署。

成功必须同时满足：观察到10%权重；请求停止本次部署；原部署终态；AWS返回 rollbackDeploymentId；该回滚部署属于相同app/group且 Succeeded；live恢复Blue/无权重；公开health/profile通过。报告明确 `mode=rollback_drill`、`outcome=automatic-rollback-verified`。原canary通常为Stopped，流水线演练任务可以成功；不把原canary误称为正常发布成功。

缺回滚ID、回滚失败、健康检查失败或错过灰度窗口，均不报告演练成功。错过窗口时可按正常恢复逻辑将Green恢复Blue，但仍判演练失败；演练停止后不靠额外手工部署伪造“自动回滚”证据。网络失联/强制终止仍需从真实CodeDeploy ID核对和恢复。

范围：只更新已有pipeline，0新增/0删除，不扩IAM权限。复用现有CodeBuild/CodeDeploy/Lambda/告警，按已有分钟、请求和日志计费；没有新增常驻资源。候选与Green仍需新执行两道人审。应用正常CI及16项Terraform模拟计划、Node演练成功/缺ID/失败/错过窗口/模式不一致测试；真实停止/自动回滚尚待审批后验证。

参考：[StopDeployment](https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_StopDeployment.html)、[自动回滚](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html)、[执行变量](https://docs.aws.amazon.com/codepipeline/latest/APIReference/API_ResolvedPipelineVariable.html)。全部操作记录根日志第18节。
