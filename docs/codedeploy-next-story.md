# S3-07：CodeDeploy 真实切流（基础设施已创建，待人工审批）

**当前：修复后的新执行 `98380c85-fbbc-4b50-9416-7f10ddccdc0c` 停在第一道审批。** 源码 c0a0a2c 的 AWS CI/GitHub statuses 全成功；Candidate/STG 成功，STG **版本6** 七项通过；版本化报告与实际代码/审批变量已独立复核。Release a578af2edc0269822612dce35ff921efbc4595f33552999bdf5c40a57da13fe8。请在控制台核对新执行98380c85/STG6，然后 ApproveProduction→ApproveGreenCreation 手动批准。旧执行f2ed11c5已失败，不要批准旧执行；当前生产仍live2/无权重/health UP。后面的记录为历史阶段，首次真实canary/回滚仍未完成。

**最新运行结果：首次 Blue2→Blue2 基线 `d-0XJZB7ZDM` 已成功，后续校验停止，尚未切流。** GetDeployment 返回 AppSpec 哈希、不含 content；原代码按 content 校验而拒绝继续。现改为严格匹配完整 Blue-only AppSpec SHA256 和成功状态/app/group/type，真实返回 fixture 与负例测试通过。旧执行 f2ed11c5 的 DeployProduction Failed，线上仍2/无权重、health UP。修复源码须启动新执行并重新人工审批两次，不重用旧审批。下文“待第二道审批”是旧执行阶段历史；真实 canary/回滚仍待验证。

**当前停在第二道审批。** 用户已完成本次第一道审批；Green 生产**版本4**七项检查通过，独立核对报告及实际代码成功，线上仍 Blue**版本2**、原 RevisionId/无权重、health UP。执行 `f2ed11c5…` 的 **ApproveTrafficShift / ApproveBlueGreenDeployment** 等待用户。此次审批后将真实执行 CodeDeploy：首次 Blue 基线注册成功后，10%/五分钟→100%；失败恢复逻辑启用但真实运行仍待验收。生产 Terraform plan No changes，CodeDeploy 当前尚无部署。下文为准备/阶段历史。

最新：2026-11-12 用户已批准，实际 apply **9 新增/2 更新/0 删除**；后续 plan No changes。七阶段 pipeline version4 与告警/回滚配置已从 AWS 核对；新执行 `f2ed11c5-c7bc-49ca-a44f-1f9fb5a10466` 固定源码 `ff77d627f3a5182bac6872375dcd828199e1e57a`。当前先验收到人工审批 1；尚未执行 CodeDeploy 发布，生产仍 live2。下文“待批准创建”为准备阶段历史，不代表还需重复批准这次已授权资源。

本次 Candidate、STG 均成功，STG **版本5** 七项通过。Release `6af4a796faf697721d69148c95d9e81cd96abc2a0bf15e29b09de1eddc3d5910`；报告对象版本/外层 SHA、源码/执行/后端哈希、实际 Lambda 和审批导出变量已独立交叉核对。现在 **ApproveProduction / ApproveGreenCreation InProgress**，整体 InProgress。请在 [AWS 流水线](https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/kongportfolio-candidate/view?region=ap-northeast-1) 核对执行 `f2ed11c5…`、STG5 后手动批准。第一道批准只运行 Green 验证；第二道批准后将真实执行 CodeDeploy。当前 list-deployments 为空、生产 live2/无权重、health UP、告警 OK。日志第13节。

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
