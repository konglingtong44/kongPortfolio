# S3-07R：受控停止与自动回滚演练已通过

2026-11-12，执行 `96861976-0f9e-4a0c-b49e-9c75c0c1762b`、源码 `8ad190ba366b6967793675098f5df1fab26fd324`、模式 `rollback_drill`。两道人审由用户完成，整个演练流水线 Succeeded。

| 证据 | 实际结果 |
|---|---|
| 演练前稳定版本 | Blue5 |
| 健康候选 | Green6，与STG7同一制品 |
| Blue-only基线 | d-CRSIZL0EM Succeeded |
| 灰度 | d-2OPWFF0EM，控制器观察到Blue5 + Green6权重10% |
| 受控停止 | 原灰度Stopped/MANUAL_STOP，符合演练预期 |
| 自动回滚 | d-M40WD11EM Succeeded，AWS双向rollback关联指向原灰度 |
| 最终线上 | live=5，无附加权重，数字版本代码SHA与演练前稳定版相同 |
| 公开HTTPS | health、三语言profile、Bedrock占位、404/405七项通过 |
| Terraform/告警 | 两套plan No changes；告警OK |

独立下载DeploymentReport，外层SHA与CodeBuild一致；mode/outcome/源码/执行/release/Blue5/Green6及回滚ID与实际AWS一致。报告明确 `outcome=automatic-rollback-verified`，不是新版本全量发布。原canary停止与演练流水线成功是不同层面的预期状态。

实现：默认 `ReleaseMode=deploy`，仅显式`rollback_drill`才受控停止。模式绑定GetPipelineExecution.resolvedValue并在第二道人审显示；观测真实10%后调用StopDeployment(autoRollbackEnabled=true)，必须读到自动回滚ID/Succeeded、恢复Blue/无权重/公开API才通过。没有手工追加部署伪装自动回滚，没有从本机或构建直接UpdateAlias。

覆盖范围：已验证stop-on-request→自动回滚真实路径；未故意发布坏代码或改告警状态，因此应用故障/CloudWatch告警触发路径未单独演练。网络失联/强制终止仍需从CodeDeploy ID核对恢复。后续可按需要补告警演练，不把本次结果扩大为所有故障场景覆盖。

没有新增资源或IAM权限，仅更新过现有pipeline1处。完整命令、失败的附加核验假设及纠正、AWS证据在根日志第18—20节。最终报告仅存忽略目录 `.local/rollback-drill-final-review-96861976/`，公开检查摘要 `.local/rollback-drill-final-public-api.json`。下一增量是前端S3/CloudFront自动发布；真实Bedrock仍为后续工作。
