# 重构 Story 路线

一次实现一个可运行的小增量，验收后暂停评审。下面是顺序建议，不是后续部署授权。

| Story | 范围／预计目录 | 验收 |
|---|---|---|
| [001](001-project-harness.md) | 文档分类、项目 Skill、文档检查 | 本轮；入口与链接有效，本地检查有记录 |
| [002](002-qa-feature.md) | `frontend/src/features/qa/`；Superpowers本机安装与学习记录 | 本地完成；5文件归类、81项及构建通过；其他前端功能后续逐一整理 |
| [003](003-dev-launcher.md) | `scripts/dev/`，保留原启动入口 | 本轮先整理本地启动器；检查、发布、运维脚本以后逐类迁移 |
| [004](004-offline-qa-eval.md) | `backend/src/test/resources/qa-eval/`与Java离线runner | 本轮：固定响应契约样本，不调用模型；真实语义与防注入质量留给后续评估 |
| [005a](005a-staging-review.md) | `scripts/checks/`本地STG报告审阅 | 本轮核对JSON身份、覆盖及usage，不访问AWS |
| [005b](005b-sampling-plan.md) | STG采样计划与场景预算 | 本轮本地准备最多30次草案，不含执行器／实际推理；真实采样仍待授权和独立核实 |
| [006](006-doc-checks-layout.md) | 文档检查器及测试归入`scripts/checks/` | 兼容旧命令与API，检查调用目录无关的完整仓库扫描 |
| [007](007-regex-feature.md) | `frontend/src/features/regex/` | 正则组件及测试归类，前端81项和构建通过 |
| [008](008-profile-presentation.md) | `frontend/src/features/profile/` | 时间线与技能展示5文件归类，保持内容、CSS和手机展开逻辑 |
| [009](009-local-checkpoint.md) | 累计审阅、完整本地检查与版本检查点 | 保存已验证增量，保留浏览器、自动技能发现和AWS验证缺口 |

`frontend/`、`backend/` 已是清晰的两应用边界，暂不套一层 `apps/`。Terraform 的五个根栈与远程 State key 保持稳定；现阶段不为目录整理添加 module、迁移 State 或创建环境。`codebuild/` 已按交付阶段拆分，脚本迁移时再同步引用。

真实采样继续单独处理，不因目录重构自动执行；后续按功能逐步整理剩余前端与脚本。

新 Story 使用[模板](template.md)。大重构先用 `rg` 找全调用关系，再选一个边界验证；不能一次同时移动前端、部署脚本和 Terraform 根栈。
