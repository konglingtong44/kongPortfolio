# 全 AWS CI/CD 与 GitHub Flow

当前目标见 [Serverless 路线](../README.md#aws-运行架构)：后端为 Lambda ZIP + CodeDeploy 别名切流，两道审批保留；CodeBuild 检查脚本已加入默认 HTTP / Lambda / ZIP 冒烟三项。下文原 ECS task definition、ECR、pause hook 与角色设计属于历史参考，不能用于当前 Lambda 发布。PR 权限隔离、固定 SHA、扫描和构建一次原则仍适用；云端流水线未创建。

最新决定：GitHub 仅保存代码/PR，**不使用 GitHub Actions（包括托管 runner）**。测试、构建、发布、两次审批均由 AWS 执行。以下 AWS 资源/触发器/保护规则全部 Planned；Phase 1 只准备代码和本地验证。

## 已准备的配置

`codebuild/ci.yml` 调用 `scripts/ci.sh`：Node 24、Java 21、固定版本 Gitleaks + checksum 验证、私密路径检查、hooks 测试、npm ci/test/build、Maven verify、静态验证包。选用支持这些 runtime 的 AWS managed image `aws/codebuild/amazonlinux-x86_64-standard:5.0`，不需 privileged Docker。实际托管环境需 Phase 2/3 冒烟确认。[运行时列表](https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html)

`CI_COMPONENT=frontend|backend|all` 分别选择检查范围；共同配置变化触发相关检查；可信 diff base 不存在时执行全部相关检查，不能猜成无变化。安全检查每次执行。只有全部命令成功才输出 result.json，静态验证包位于单独 ci-results 前缀，不上传整个 `.local`、日志或源简历。

GitHub Source CI 项目要完整克隆 Git（clone depth 0），启用 CodeBuild 的 GitHub App / CodeConnections 认证，`reportBuildStatus=true`。buildspec 本身不创建项目/连接/状态上下文。[GitHub App 支持](https://docs.aws.amazon.com/codebuild/latest/userguide/access-tokens-github-overview.html)

## PR CI — Planned

两个独立 CodeBuild CI 项目，固定 GitHub commit status context 为 `ci/frontend`、`ci/backend`。都接收 main 目标的 PR 创建/更新/重新打开及 main/feature/fix/hotfix push，保证必需状态不因路径过滤而永远 pending；不相关代码检查由脚本跳过。使用 `CI_BASE_SHA`（受信 dispatcher提供）或 push 的 `CODEBUILD_WEBHOOK_PREV_COMMIT` 算差异；PR 没有可信 base 时重跑，不伪造成功。

Webhook 的 branch/actor 过滤必须完整锚定，拒绝任意陌生 fork 代码自动使用有权限的角色；必要时启用 CodeBuild PR comment approval。CI service role 只给指定 source connection、验证 artifact 前缀和 Logs，不允许 ECR push、S3 生产写、ECS/CloudFront 更新或读取生产 secrets。不能为了省一项目，让不受信 PR 共用 release role。[PR/Webhook 配置](https://docs.aws.amazon.com/codebuild/latest/userguide/sample-github-pull-request.html)、[状态 context](https://docs.aws.amazon.com/codebuild/latest/APIReference/API_BuildStatusConfig.html)

GitHub Flow：`feature/*`、`fix/*`、`hotfix/*` → PR → main，无长期 develop/release/staging/production。main 禁 force push/删除、required checks 指定上述两个 context、要求最新基线。个人不默认独立 Reviewer。**Branch Protection 未配置**；私库强制保护依赖 Pro/Team 等套餐，Free 私库不能宣称已禁止失败合并。[套餐限制](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

## 固定版本与生产产物 — Planned

main push 经 CodeConnections 触发组件独立 CodePipeline，用 source action 实际 commit ID 固定 execution，禁止 git pull main/latest。前后端目录各自过滤，共同契约/构建/安全配置变动触发双方；不把 PR merge SHA 的检查当成 main 合并 SHA 成功。

AWS gate 查询 CodeBuild CI build 记录，核对受信 project ARN、repository、`resolvedSourceVersion`=目标 SHA、buildspec/environment 配置、`SUCCEEDED` 结论；缺少/失败/过期一律停止。仅凭可伪造的 GitHub status 文本不够。不需从 GitHub Actions 拉产物，也不需为它授予 AWS OIDC。

独立受信 CodeBuild release project 对该 SHA 重跑必要测试/扫描后**只构建一次生产产物**：前端 release tar/manifest，后端 ECR digest/task definition。Source action 使用 CodeBuild 支持的 full-clone output，或者显式传入/校验 source revision，不能从无 `.git` 的源码压缩包臆测 HEAD。manifest 固定 SHA、对象/镜像 digest、build ARN、上一稳定版；S3 前缀/ECR tag 不可变。CI 验证构建不充当生产 release；STG/Green/PROD/回滚重复使用 release，不重新构建。

## 双重 AWS 审批 — Planned

```text
GitHub main → CodeConnections → 固定 SHA 的 CodeBuild CI Gate
→ CodeBuild Release Build Once → STG Deploy/Smoke
→ AWS Approval ① → PROD Green Deploy/Verify
→ AWS Approval ② → Continue/Promote → Monitor → 完成
```

①阻止创建 PROD Green，②阻止正式切流；CodePipeline Manual Approval 是真正顺序控制点。审批展示组件、execution、SHA、manifest/digest、验证报告和费用。使用 QUEUED/发布锁，等待时不得被新 execution 换掉候选。

后端必须配置 ECS `PRE_PRODUCTION_TRAFFIC_SHIFT` pause hook。启动步骤只发起部署并保存 ARN，另一步等 Green 验证和 pause，再到审批②；普通 UpdateService 后审批不能保证未切流。②后核对同一 ARN/hookId/digest，才执行 `ContinueServiceDeployment(CONTINUE)`；拒绝/超时 ROLLBACK，禁止绕过 gate 改 listener。

前端①后配置 header-only Green，②后提升。每步复核 CloudFront ETag/Function 版本、SHA/manifest hash，过期审批无效。前后端独立 release pipeline，共享 CloudFront 配置更新需锁和局部变更，避免覆盖 `/api`。自动告警和失败补偿均留在 AWS，详见部署计划。

## IAM — Planned

| 角色 | 最小范围 |
|---|---|
| CI | source connection read、验证 artifact 前缀、Logs；无生产权限 |
| CodePipeline | 指定 CodeConnection/artifact、CodeBuild 项目/审批动作 |
| Release Build | 特定 S3 release 前缀、ECR push、Logs，不切流 |
| ECS execution | ECR pull、Logs；应用 task role 默认无 AWS 权限 |
| Deploy/Promote | 指定 CloudFront/ECS/target groups；PassRole 精确限定 |
| 审批者 | 指定 pipeline PutApprovalResult，无默认 IAM 管理权限 |

无长期 AWS Access Key。本地通过受支持的身份登录，AWS 服务用角色；未来 Bedrock 只用服务端 task role。全部 AWS CI 也会产生 CodeBuild/日志/存储费用，创建前审批预算。
