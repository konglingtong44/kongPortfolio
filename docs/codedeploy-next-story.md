# S3-07：CodeDeploy 真实切流（代码已准备，待批准创建）

前置结果：S3-06 的执行 c02bc4e6 已由用户完成两道审批并成功结束；生产 live=2，Green=3。该执行没有切流阶段，不能追加步骤后拿旧审批授权新制品。

下一增量验收：

1. Terraform 准备 Lambda 平台的 CodeDeploy application/deployment group、最小权限角色、告警与验证组件；默认关闭。提供实际 plan、费用和资源范围，获批准后创建。
2. 新流水线在同次第二道审批之后执行部署；AppSpec 固定函数、live alias、经过验证的 Blue/Green 数字版本。再校验 Source/SHA/两道审批/报告身份及 live RevisionId，过期证据拒绝部署；不重新构建候选。
3. 拟采用 `CodeDeployDefault.LambdaCanary10Percent5Minutes`：先向 Green 分配 10% 流量，五分钟后转为 100%。仅 CodeDeploy 角色可更新目标 live alias。
4. 低访问量不能依赖自然流量证明成功；部署期间限次数主动验证直接版本和公开 HTTPS API。Lambda 执行错误和 HTTP 5xx 分别观测，避免将业务 5xx 误当作 Lambda Errors 必然触发。
5. 配置部署失败/告警停止后的自动回滚，首次部署还需核实无历史成功 CodeDeploy revision 时的恢复路径。验收必须实际观察切流、公开 API 和可复现失败/恢复演练，不以配置存在代替回滚验证。

范围仅后端。前端 CloudFront 推广/蓝绿和真实 Bedrock 分别后续处理；域名保持不变。

AWS 依据：[Lambda 部署配置](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html)、[告警与自动回滚](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-groups-configure-advanced-options.html)、[Lambda AppSpec](https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-example.html)、[生命周期 Hooks](https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html)。

## 本次准备结果

实际计划 **9 新增、2 更新、0 删除**：新增 CodeDeploy app/group、服务角色及 policy、live Lambda Errors 告警、部署 CodeBuild/角色/policy/七天日志；更新 pipeline 与启动部署构建的权限。默认 `enable_deployment=false` 时 No changes；未 apply。CodeBuild 最多十五分钟、并发一、不自动重试。只有 CodeDeploy 服务角色有目标函数别名更新权限，构建角色没有 UpdateAlias、UpdateFunctionCode 或审批权限。StopDeployment 不支持 IAM 资源约束，需 `Resource=*`，控制器调用前核对部署的 app/group/本次执行描述；GetDeployment 已限制到生产部署组。[IAM 依据](https://docs.aws.amazon.com/service-authorization/latest/reference/list_codedeploy.html)

`scripts/deploy-production.mjs` 校验四份同次制品、两道成功审批、Green SHA 和原 live RevisionId。无可信成功基线时，先提交 Blue→Blue 的 AllAtOnce 基线并等待成功；服务若拒绝此同版本部署或未能记录正确 AppSpec，则在切流前失败。该首次路径仍需真实 AWS 验证。基线成功后才允许五分钟 10% canary；脚本轮询必须观察到 10% 权重及最终 Green 全量，持续验证公开 health 和轮换的三语言 profile。部署不会更改域名。

异常时请求 CodeDeploy stop + auto rollback，并核对恢复到 Blue 和公开 health。如果 HTTP 失败发生在 CodeDeploy 已成功之后，仅在稳定 Green、无权重且没有自动回滚 ID 时，通过 CodeDeploy AllAtOnce 恢复已批准的 Blue。任一失败都保持构建失败，即使恢复成功。报告分别记录恢复请求与实际恢复证据。已有执行描述拒绝重放；终止信号尝试停止自身部署。CodeBuild 被强制终止/网络完全失联不保证脚本能清理，CodeDeploy 是独立服务，需从部署 ID 检查状态；不能把构建结束等同于切流已停止。

本地 Terraform 16 个 mocked plans、Node 审批/过期证据/基线/HTTP失败/成功后恢复/超时路径通过；真实 IAM、基线接受、权重、告警触发、回滚和公开 API 发布验证均未完成。没有故意发布坏代码到生产来冒充回滚演练；真实受控演练仍需后续验收。

费用示例（仅新增部署阶段）：20 次/月 × 8 分钟 ×（CodeBuild $0.005 + V2 action $0.002）+ 1 个标准告警约 $0.10 ≈ **$1.22/月**，另有少量 S3/日志/API 调用，未扣账号共享免费额度。不是全站总费或账单上限，实际按东京费率、时长与账号额度结算。[CodeBuild](https://aws.amazon.com/codebuild/pricing/)、[CodePipeline](https://aws.amazon.com/codepipeline/pricing/)、[CloudWatch](https://aws.amazon.com/cloudwatch/pricing/)。

批准创建后将启动固定新 SHA 的执行，重新由用户完成两道审批；第二道审批文字明确授权真实切流及恢复。旧执行 c02bc4e6 已结束，它的审批不会被拿来触发这次部署。

源码 `0add5d0` 已推送；现有 AWS frontend/backend CI 与 GitHub statuses 全 success。前端 40 tests/build、后端 9+3 tests/ZIP smoke，部署纯逻辑测试也在 AWS Linux 通过。运行时 IAM、首次 baseline、真实 CodeDeploy/HTTP/回滚验收仍待批准后执行。
