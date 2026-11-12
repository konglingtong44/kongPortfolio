# S3-07：CodeDeploy 灰度与受控自动回滚已验证

2026-11-12 已完成真实后端切流：执行 `98380c85-fbbc-4b50-9416-7f10ddccdc0c`、源码 `c0a0a2ce2e8f1018e30b968fa6e40e5969792a75`，两道审批均由用户在 AWS 完成，整条流水线 Succeeded。

| 项目 | 实际验证结果 |
|---|---|
| CodeDeploy | `d-K1QJSA0EM` Succeeded，10%/五分钟后转100% |
| 发布版本 | Blue2 → Green5，最终 `live=5`、无附加权重 |
| 候选 | release `a578af2edc0269822612dce35ff921efbc4595f33552999bdf5c40a57da13fe8`，STG6/Green5代码一致 |
| 观察 | 独立读取真实10%权重；DeploymentReport 15次观察含10%与最终全量 |
| 公开 API | HTTPS health、ja/zh/en profile、Bedrock占位、404/405共七项通过 |
| 告警 | 观察期间OK，未触发自动回滚 |
| Terraform | 创建9新增/2更新/0删除；切流后生产和CICD计划均No changes |

基线 `d-0XJZB7ZDM` 已成功。首次构建因 GetDeployment 只返回AppSpec哈希而保守停止；修复后按固定Blue-only AppSpec精确SHA核对。失败与修复完整保留在根日志第15节，成功证据在第17节；不掩盖旧执行失败。

只由CodeDeploy服务角色改生产别名。发布控制器核对同次源码、候选/STG/Green证据、两道成功审批及live快照，观察实际权重与公开API；异常请求CodeDeploy停止/恢复，构建不能直接UpdateAlias或自行审批。旧审批不授权新制品。

后续受控停止→自动回滚已真实通过：[演练结果](rollback-drill.md)。灰度Green6在10%停止，AWS自动回滚成功，线上恢复Blue5；未单独演练应用故障/CloudWatch告警触发路径。前端CloudFront推广/蓝绿、真实Bedrock仍属后续增量；未更新前端静态包，Bedrock仍为PREPARING占位，没有真实模型调用。浏览器视觉/容器构建未在本次重新验证。

本地最终证据：`.local/deployment-final-review-98380c85/report.json`、`review.json`、`.local/deployment-final-public-api.json`；忽略目录不提交Git。查看：[AWS流水线](https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/kongportfolio-candidate/view?region=ap-northeast-1)。
