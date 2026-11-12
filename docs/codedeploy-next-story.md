# S3-07：CodeDeploy 真实切流（下一 Story，未实施）

前置结果：S3-06 的执行 c02bc4e6 已由用户完成两道审批并成功结束；生产 live=2，Green=3。该执行没有切流阶段，不能追加步骤后拿旧审批授权新制品。

下一增量验收：

1. Terraform 准备 Lambda 平台的 CodeDeploy application/deployment group、最小权限角色、告警与验证组件；默认关闭。提供实际 plan、费用和资源范围，获批准后创建。
2. 新流水线在同次第二道审批之后执行部署；AppSpec 固定函数、live alias、经过验证的 Blue/Green 数字版本。再校验 Source/SHA/两道审批/报告身份及 live RevisionId，过期证据拒绝部署；不重新构建候选。
3. 拟采用 `CodeDeployDefault.LambdaCanary10Percent5Minutes`：先向 Green 分配 10% 流量，五分钟后转为 100%。仅 CodeDeploy 角色可更新目标 live alias。
4. 低访问量不能依赖自然流量证明成功；部署期间限次数主动验证直接版本和公开 HTTPS API。Lambda 执行错误和 HTTP 5xx 分别观测，避免将业务 5xx 误当作 Lambda Errors 必然触发。
5. 配置部署失败/告警停止后的自动回滚，首次部署还需核实无历史成功 CodeDeploy revision 时的恢复路径。验收必须实际观察切流、公开 API 和可复现失败/恢复演练，不以配置存在代替回滚验证。

范围仅后端。前端 CloudFront 推广/蓝绿和真实 Bedrock 分别后续处理；域名保持不变。

AWS 依据：[Lambda 部署配置](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html)、[告警与自动回滚](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-groups-configure-advanced-options.html)、[Lambda AppSpec](https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-example.html)、[生命周期 Hooks](https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html)。这里是待实现方案，尚无 Terraform 代码、实际计划或云端切流验证。
