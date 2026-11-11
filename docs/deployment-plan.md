# 渐进部署、蓝绿与回滚

当前目标与阶段以 [Serverless 路线](serverless-plan.md) 为准。下文 ECS/ALB 与旧 Phase 1 内容为历史方案，不再作为当前部署命令或验收条件；两道审批与不可变产物原则继续保留。

状态：本文 AWS 步骤均为 Planned，没有冒充可执行的 IaC。Phase 1 仅本地代码、日志、CI 配置和验证。

| 阶段 | 交付 / 验收 |
|---|---|
| 1 当前 | 本地独立容器、API INFO 文件、CI、静态验证包；测试/扫描/冒烟，不创建 AWS |
| 2 需批准 | 确认区域及预算，IAM/登录、Budget、最小 S3/CloudFront 和 ECR/ECS/ALB；手动固定版本发布与费用验证 |
| 3 | 两条 AWS CodePipeline，精确 SHA 的 CI gate、release manifest、短期 STG、审批① |
| 4 | CloudFront 与 ECS Green、健康检查、审批②、切流、自动与人工回滚演练 |
| 5 | CloudWatch 指标/告警、失败通知、费用提醒和优化 |

## 前端发布和蓝绿 — Planned

生产 release 构建一次：`vite build --base=/releases/<SHA>/`，整个 `dist` 上传私有 `releases/<SHA>/`。manifest 固定 SHA、对象 SHA256、构建信息；S3 Versioning + 唯一 SHA 前缀和拒绝覆盖的发布过程。JS/CSS 和 public 图片均用该 release base，避免跨版本引用。当前验证包使用普通 `/` base，不能直接当生产 release。

Blue=当前 SHA，Green=候选 SHA，非两套服务器。旧资源至少保留 30 天并覆盖回滚/浏览器会话窗口，不在切流后删除；旧页面始终加载 `/releases/<old>/…`。清缓存不能替代资源版本化。

优先评估 CloudFront Continuous Deployment：主分发为 Blue，Staging Distribution 关联 Green 发布路由 Function（每个版本独立已发布 Function），同一 S3 origin、不同不可变前缀。Origin 是存储/ALB 地址，Behavior 是路径匹配/策略，Staging Distribution 是另一份分发配置；两文件夹本身不是蓝绿。

验证通过主域名 + `aws-cf-cd-…` header policy，测试 runner/浏览器上下文携带 header；**不能直接访问 staging 域名**。若必须有普通预览 URL，则另建独立 STG distribution（需批准），不把它叫 staging distribution。权重灰度上限 15%，不能用 100% 权重最终发布；审批②后调用 `UpdateDistributionWithStagingConfig` 提升，校验 ETag/manifest。OAC 允许主/暂存分发；采用前确认 HTTP/3 等限制。个人站先做 Header 验证。[工作方式](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-continuous-deployment.html)、[限制](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/continuous-deployment-quotas-considerations.html)

Smoke：version.json SHA、HTML/资源、三语 profile、POST bedrock、API 404 不返回 index。提升后等 Deployed 并复验。回滚关联保存的 Blue Function/配置，必要时只失效 HTML/version；是边缘传播过程，不承诺瞬间全球一致。两条管线不能并发覆盖 CloudFront，用发布锁/ETag，保留对方 `/api` 配置。

## 后端发布和蓝绿 — Planned

多阶段、非 root 镜像由 AWS release build 生成一次，ECR tag `<40位SHA>` + tag immutability，部署引用 `repository@sha256:…`。manifest 记录 commit、digest、task definition revision；STG/Green/PROD/回滚都用同一产物，不重建。

优先 **ECS 原生 BLUE_GREEN**，避免额外 CodeDeploy 控制器。ALB 两 target groups 接 Blue/Green，ECS 交替管理；设置测试流量路由、`/api/health`、目标健康阈值和 CloudWatch deployment alarms。[ECS 蓝绿流程](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/blue-green-deployment-how-it-works.html)

审批①后才创建 PROD Green。ECS 在 `PRE_PRODUCTION_TRAFFIC_SHIFT` 使用 `PAUSE` hook；Green 健康且测试成功才进入 AWS 审批②。通过后发布角色核对 deployment ARN/hookId、manifest/digest 和 `AWAITING_ACTION`，再调用 `ContinueServiceDeployment(CONTINUE)`；拒绝/超时 ROLLBACK。Phase 4 在目标区域与 SDK/IaC 中验证后再实现。[Pause hooks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/pause-lifecycle-hooks.html)

Green 等待最多约 2 小时，超时 ROLLBACK，避免双任务无限收费；过期审批不可复用。切流后 bake 约 10–15 分钟（待实测），旧任务保留用于快速回滚，之后缩掉 Blue。健康失败或部署告警自动回滚；人工回滚重新部署上一 manifest 的 digest，通过健康检查再切流，不用 latest。

演练：故障容器、5xx、拒绝审批、pause 超时、切流后错误、重复/过期审批、回滚版本一致性。前后端独立发布，API 必须向后兼容；破坏性变更先兼容再迁移，不假定两管线原子切流。

## Phase 2 开始前

用户确认预算/单任务或 HA → 查看账号、域名、现有 DNS/证书 → Budget → 最小权限角色 → 资源清单/估价获明确批准 → 逐项创建和验证。静态前端可以先做，ALB/ECS 单独审批；保留本地启动，不提前执行生产命令。
