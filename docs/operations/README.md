# 运维入口

| 任务 | 入口 |
|---|---|
| 查费用、关停与恢复 | [费用控制](aws-cost-control.md)、[学习04](../learning/04-cost-control.md) |
| 查历史费用估算 | [费用说明](aws-cost.md)，含已放弃的 ECS 方案 |
| 查资源清理证据 | [2026-11-14 清理](aws-resource-cleanup.md) |
| 查版本、构建、告警和发布故障 | [日常操作](../learning/06-operations.md) |

关停控制器位于 [infra/cost-control](../../infra/cost-control/)，基础设施位于 [cost-control 根栈](../../infra/terraform/cost-control/)。费用档位与资料以记录日期为界；本轮没有实时查询账单。预算通知有延迟，关停不是硬账单上限，跨月不自动开站。
