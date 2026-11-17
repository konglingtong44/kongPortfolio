---
name: portfolio-story
description: Implement one bounded kongPortfolio feature, fix, or refactoring Story with project-specific checks and a reviewable result. Use for changes in this repository.
---

# 执行一个 kongPortfolio Story

从仓库根 [AGENTS.md](../../../AGENTS.md)、[项目地图](../../../docs/architecture/overview.md)和本次 Story 进入；按修改范围读取资料，不默认加载整份历史日志。

1. 根据用户目标选一个可运行增量，先说明验收标准。大重构参考[路线](../../../docs/stories/README.md)，不要同时移动前端、部署脚本和 Terraform 根栈。
2. 用 `rg` 找导入、脚本调用、buildspec、测试夹具及文档引用。移动相对路径前核对 `PSScriptRoot`、`import.meta.url` 和运行目录。
3. 实现后运行与风险相称的检查。前端：`npm --prefix frontend test`、`npm --prefix frontend run build`；后端：Maven 默认构建，Lambda 变更再做 `-Plambda clean verify` 与 `node scripts/test-lambda-package.mjs`。完整本地入口为 `scripts/check.ps1`。
4. 文档移动运行 `node scripts/check-docs.mjs`；发布前沿用现有 Gitleaks 与私密路径检查。保持日语默认、三语、手机布局和个人事实边界。
5. 在[Story 模板](../../../docs/stories/template.md)中保留验收、关键决定、实际结果与未覆盖范围，完成一个 Story 后暂停评审。

本地检查、容器运行、AWS STG、生产发布、浏览器模拟和真机分别记录。Skill 本身不授权创建付费 AWS 资源或部署；沿用当前会话已有授权及两道 AWS 生产审批。
