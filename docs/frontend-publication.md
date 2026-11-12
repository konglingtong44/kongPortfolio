# S3-08：前后端自动发布已验收

2026-11-12，执行 `5d55596a-4238-4240-bfbf-3e8ae47ee264` 八阶段全部成功，两道生产审批均由用户完成。固定源码 `7a2e1b897848328d112d44e45802849ad52bbd5c`，模式 deploy。

- 后端：Blue7 → Green8，CodeDeploy `d-BIHP8K2EM` 实际观测10%灰度，约五分钟后完成；live=8，无额外权重，报警OK。
- 前端：从 a594e36… 切到 `242f8cb4af0a0ff5fed61f8ae9984f2189c8c912af102e9db531afeb1bd7e481`。公开 version.json 的 sourceDirty=false、源码匹配。
- 独立验收：版本化报告外层SHA与CodeBuild一致；同次执行/源码/发布ID匹配；实际Lambda代码哈希、CloudFront LIVE/DEVELOPMENT模板及路由哈希匹配；6个公开静态文件SHA、首页/深链接、7项API契约通过。生产和CI/CD Terraform plan均No changes。

访问：https://konglingtong44.com ，发布标识：https://konglingtong44.com/version.json 。这轮没有进行浏览器视觉或容器构建验收。

发布流程：Source → BuildCandidate → VerifyStaging → ApproveProduction → VerifyGreen → ApproveTrafficShift → DeployProduction → PublishFrontend。前端只在同一候选的后端成功后发布；rollback_drill模式跳过前端。

静态文件通过If-None-Match条件写入S3 `releases/<releaseId>/`，校验摘要/MIME/cache与公开HTTPS后，测试CloudFront DEVELOPMENT，再发布LIVE路由。HTML/version使用重新校验，资产使用不可变缓存；保留旧发布，无删除/覆盖权限，不需要全站缓存失效。此方式是版本化发布与指向切换；前端流量没有执行双环境渐进灰度。

Terraform管理运行环境、分发配置/关联及IAM；流水线管理Lambda代码、CodeDeploy别名版本/权重和CloudFront函数代码中的发布指向。对应ignore_changes避免Terraform倒退已发布版本，两道人审保持不变。

前次执行2a56d7b1的TestFunction响应解析失败，实际恢复旧DEVELOPMENT，LIVE未切换。已按AWS真实request包装修复，并通过本次云端测试/发布。完整历史和命令见根AWS_EXECUTION_LOG.md第21–26节。

边界：前端LIVE发布后的真实故障回退仍未演练。恢复脚本只回退前端，成功后端不自动倒退，API须兼容旧前端；网络失联/强制终止可能需要人工按ETag/旧发布ID恢复。后端停止触发的自动回滚已验证，报警/应用故障触发路径尚未分别演练。Bedrock当前仍为PREPARING占位。
