# U4 维护指南：实施摘要

## 文件变化

- 新建 `docs/learning/maintenance-guide.md`：用零基础选择表解释项目约定、AI-DLC 项目/阶段规则、项目自写技能、Story、学习资料和 AWS 部署资料的维护入口、适用范围与检查方式。
- 更新 `docs/learning/start-here.md`、`docs/learning/README.md`：加入维护指南导航。
- 更新 `docs/learning/file-map-inventory.md`：纳入新增指南和测试文件。
- 新建 `scripts/checks/test-maintenance-guide.mjs`：5 项路径和边界定向测试。

## 决定与边界

指南把“增加项目自己的做法”与“扩展 AI-DLC 生命周期阶段”分开：前者从 `AGENTS.md`、活动空间 `memory/` 和 `portfolio-*` 项目技能着手；后者须按框架插件与阶段图流程设计和验证。工具拥有的状态、审计和编译后文件不是手动审批或加阶段的入口。项目未在本单元实际新增规则、技能或生命周期阶段。

## 验证

- `node --test scripts/checks/test-maintenance-guide.mjs`：5 项通过。
- `node --test scripts/checks/test-file-map.mjs`：5 项通过，新增项目文件已列入清单。
- `node scripts/check-docs.mjs`：退出 0，检查 381 份项目 Markdown 的本地目标。
- `git diff --check`：退出 0。

未运行前后端构建、Docker、浏览器、手机真机、AWS STG/生产或模型采样；本单元只改文档和 Node 定向测试，不证明线上状态。

## 与计划的偏差

审阅指出清单新增文件后核对日期仍停留在 2026-11-23，已按本次实际复核日期更新为 2026-11-24。审阅发生在日期修正之前，后续检查结果单独记录。
