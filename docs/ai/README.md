# AI：网站能力与开发流程

网站运行时从[当前实现地图](../architecture/overview.md)进入：Java 限制范围与输入输出，读取审核资料并调用模型，React 展示结果。这里的 `bedrock-*.md` 是各次实现／验证 Story，里面的旧状态不能覆盖当前代码和最新发布证据。

| 需要了解 | 文件 |
|---|---|
| 模型入口与权限 | [访问记录](bedrock-access.md) |
| 资料与费用选择 | [资料存储](bedrock-content.md) |
| Java 边界与 UI | [Java](bedrock-java.md)、[前端](bedrock-frontend.md) |
| 语义判断的演变 | [自然问题](bedrock-natural-questions.md)，[旧白名单](bedrock-scope.md)为历史 |
| 最近保存的发布证据 | [生产26](../history/releases/bedrock-staging-language-fix.md) |
| 用 AI 开发本项目 | [核实的技术概念](engineering-concepts.md)、[重构路线](../stories/README.md) |
| AI-DLC接入Codex | [目标与启动入口](aidlc-codex.md)、[学习13](../learning/13-aidlc-codex.md)；2026-11-17 已核对主仓库配置与 CLI 发现／信任 |
| 离线问答契约评估 | [学习08](../learning/08-offline-qa-eval.md)，假模型结果不能代替真实语义质量 |

开发用的 Skill 不属于网站后端，不随前端资源或 Lambda 运行。以下是 **2026-11-17 的接入核对结果**：AI-DLC 2.11.4 已配置到主仓库，当时的本机 Codex CLI 已发现其 Skill 并登记 hook 信任；截至该日，首次模型驱动的完整 Story 和 hook 执行健康仍待验证。这不是今天的运行状态；本轮文档整理的阶段和检查见[AI-DLC 工作记录](../../aidlc/spaces/default/intents/261117-docs-learning-restructur/aidlc-state.md)。
