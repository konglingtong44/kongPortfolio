# Story 015：AWS Java 运行时漏洞缓解

状态：进行中。类型：安全修复／运维。

## 目标与范围

为 CVE-2026-114938 在现有 Java 21 Lambda 上禁用受影响的 Base64 intrinsic，直到 AWS managed runtime 的补丁版本可以直接核实。Terraform 维护 STG 与生产配置；现有流水线维护发布、两次生产审批和 `live` alias。

## 验收标准

- Terraform 计划仅更新现有 STG 与生产 Lambda 的环境配置，0 创建、0 删除。
- STG 和生产新版本的 `JAVA_TOOL_OPTIONS` 为 `-XX:-UseBASE64Intrinsics`，验证脚本对缺失或错误配置失败。
- 新候选经同次 STG、Green、两次生产审批与 CodeDeploy 后，`live` 指向带缓解参数的新版本；公开 health 和版本检查通过。

## 实现与验证

- 2026-11-19 实时核查：`kongportfolio-prod:live` 指向第 27 版，Java 21 / x86_64；STG 与生产运行时更新模式均为 `Auto`，第 27 版未设置 `JAVA_TOOL_OPTIONS`。AWS 运行时 ARN 不提供可直接核对的 JDK 补丁号。
- Terraform 配置和 STG／Green 契约检查加入缓解参数。生产计划仅 `aws_lambda_function.api` 一项更新，STG 计划仅 `aws_lambda_function.staging[0]` 一项更新；两者均为 0 创建、1 更新、0 删除，计划中的唯一环境差异为新增缓解参数。
- 独立发布工作目录从远端 `0d01773b22768e87d875700ceb83d673db1ea8d1` 建立，仅包含本安全修复。`scripts/check.ps1` 通过：前端 81 项、后端默认 44 项、Lambda 5 项、ZIP 冒烟、Gitleaks、私密路径、hooks 和路由检查通过；Docker 镜像未构建。
- 待记录实际 apply、发布提交 SHA、流水线 execution 与审批结果。

## 评审与后续

审批前核对同一次候选、报告及版本；不直接更改 `live` alias 或跳过现有审批。AWS 发布结果按实际证据更新本页。
