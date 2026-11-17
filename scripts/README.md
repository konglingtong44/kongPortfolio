# 脚本入口

命令默认在仓库根目录执行。按一类一个Story逐步整理，保留旧命令入口。

| 职责 | 入口 | 说明 |
|---|---|---|
| 本地开发 | [dev.ps1](dev.ps1) → [dev/dev.ps1](dev/dev.ps1) | 旧入口只转发调用和参数，实现在dev目录 |
| 共用工具 | [tools.ps1](tools.ps1) | 开发、验证和运维共用，暂留原位 |
| 本地验证 | [check.ps1](check.ps1) | 前后端、Lambda、秘密、文档等检查 |
| 文档验证 | [checks/check-docs.mjs](checks/check-docs.mjs)／[测试](checks/test-docs.mjs) | 原check-docs.mjs和test-docs.mjs保留兼容入口 |
| STG报告审阅 | [checks/review-staging.mjs](checks/review-staging.mjs) | 只读本地JSON，核对身份／覆盖和usage，不访问AWS |
| STG采样草案 | [checks/plan-staging-sampling.mjs](checks/plan-staging-sampling.mjs) | 本地计算调用安排和场景预算，无实际执行入口 |
| AWS CI | [ci.sh](ci.sh) | 由CodeBuild调用，交付流程见[部署入口](../docs/deployment/README.md) |
| 提交钩子 | [install-hooks.ps1](install-hooks.ps1) | 安装现有fail-closed扫描钩子 |

候选、STG、Green、发布及运维脚本仍在当前目录，后续逐类迁移并同步buildspec和测试引用；本轮不一次搬动全部脚本。验证与学习记录见[Story003](../docs/stories/003-dev-launcher.md)。
