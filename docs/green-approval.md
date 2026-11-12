# S3-06：生产 Green 验证（待创建批准）

验收：同一次流水线完成 STG、人工审批 1 后，发布同一候选 ZIP 为生产函数的独立版本；直接调用验证七项 API 合约，核对 `live` 版本、修订号和权重未变，生成 GreenReport，停在人工审批 2。

流程：Source → BuildCandidate → VerifyStaging → ApproveProduction → VerifyGreen → ApproveTrafficShift。当前 Story 没有流量切换阶段；CodeDeploy、自动回滚、前端正式推广属于后续增量。Green 通过版本号直接调用，没有独立浏览器入口，因此不代表 API Gateway/CloudFront 端到端验证。

用户已经批准旧执行 `1222a3dd-3302-4943-b992-8f9f2d2c087e`，该执行已成功结束；它当时没有 Green 阶段。新源码需要新执行和新的人工审批 1，不能复用旧审批。

## 待审基础设施与管理边界

- CICD 实际计划：4 新增（Green CodeBuild、IAM role、inline policy、七天日志组），2 更新（pipeline 及其启动项目权限），0 删除。默认 `enable_green=false`，当前实际环境计划无变化。
- 生产 Terraform：继续管理函数运行时、环境、角色、内存；代码由发布流水线管理，`live` 的版本/权重由后续经两次审批的 CodeDeploy 管理。忽略这两个发布字段是明确交接，避免 Terraform 将发布代码恢复为 bootstrap 或将别名误指向新 Green。生产实际计划无变化；本次尚未创建新版本。
- Green role 仅更新指定生产函数代码、发布/调用版本、读取同次审批和 STG 证据。不能更新别名、配置或自行审批。`GetAlias` 使用函数 ARN 授权。一次构建最多十分钟、并发一、无自动重试。
- Green 发布会更新生产 `$LATEST`，现有公开 API 调用已发布的 `live` 版本，不会随 `$LATEST` 更新。

费用例子：新增 Green 阶段每月运行 20 次、每次按 2 分钟计，按 CodeBuild small 每分钟 $0.005、V2 action 每分钟 $0.002 估算，约 $0.28/月，另加少量 Lambda 调用、版本存储、S3 和日志。这只是新增阶段的计算示例，不是全站账单或上限；免费额度按账号共享，不保证剩余额度。来源：[CodeBuild](https://aws.amazon.com/codebuild/pricing/)、[CodePipeline](https://aws.amazon.com/codepipeline/pricing/)。

验证：Terraform mocked plans 及 Node 失败路径测试；实际账号计划。真实 Green CodeBuild、多输入制品、IAM、生产版本调用、第二道审批仍待批准创建后验证。所有操作见根目录 `AWS_EXECUTION_LOG.md` 第 8 节。
