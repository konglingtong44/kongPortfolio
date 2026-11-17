# 已核实的 AI 工程概念

核实日期：2026-11-17。下表把官方事实与本项目的取舍分开；这些做法不要求更换现有 AWS 交付平台。

| 概念／官方事实 | 本项目取舍 |
|---|---|
| **Harness engineering**：围绕 Agent 建立可读的仓库知识、工具与反馈约束。OpenAI 于 2026-02-11 发布实践文章。 | 用短 AGENTS、按任务加载的 Skill、清晰代码入口和可执行检查承接；不照搬大型团队的全部流程。[来源](https://openai.com/index/harness-engineering/) |
| **AWS AI-DLC**：AI 参与开发生命周期并保留人类决策；官方 awslabs 实现提供多种 coding harness 的适配。 | 采用小 Story 的需求→实现→验证→运维证据链；不把完整框架目录复制进业务代码。[AWS 方法](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/)、[实现](https://github.com/awslabs/aidlc-workflows/) |
| **Agent Skills**：以 `SKILL.md` 的名称／描述和流程为入口，可带脚本与参考资料。 | `.agents/skills/` 只放项目需要的 Story 执行和发布审阅能力，脚本复用既有入口。[规范](https://agentskills.io/specification) |
| **Agent DLC / 持续评估**：AWS 于 2026-11-12 讨论了生成行为的重复采样、版本化评估及外部依赖变化后的重评。 | 后续优先补三语问答的固定样本、允许／拒绝／缺失事实、语言与成本／延迟报告；付费采样须限定预算。当前问答不是自主 Agent，不因此引入 AgentCore。[AWS 新文](https://aws.amazon.com/blogs/machine-learning/from-prototype-to-production-engineering-agents-with-agent-dlc/) |

查询当日 `releases/latest` 指向 AI-DLC **v2.11.4**；它与早期只复制 steering 文件的教程可能不同。仓库 README 当前描述了工作流和多个 harness 适配。若后续要接入，应固定当次审核的 release，阅读其安装／权限／费用说明并试用一个独立 Story；本轮未下载、安装或执行远程安装器。[已核实 release](https://github.com/awslabs/aidlc-workflows/releases/tag/v2.11.4)

## 优先自动化什么

近期建议是工程判断：先让 AI 能执行确定性的本地检查、发现缺失证据、生成可审阅变更，再扩展云端操作。现有 AWS 阶段报告、制品摘要和双审批已是很好的基础。

| 顺序 | 自动化增量 | 可验收结果 |
|---|---|---|
| 本轮 | 项目地图、任务 Skill、文档链接检查 | 入口简短、资料可定位、移动后的链接不失效 |
| 随后 | 按功能移动前端文件，按职责移动脚本 | UI／API 行为不变、导入和 AWS buildspec 引用完整 |
| 随后 | 离线问答评估集与版本化报告 | 假模型／固定资料可本地复现；真实模型结果单独标记 |
| 再后 | 有预算的 STG 多次采样和只读发布诊断 | 报告绑定 SHA、资料版本、模型配置；人能据此审批 |

本项目暂不需要为这些概念引入新 CI 平台、向量库或多个自主 Agent。是否增加框架，应由明确的任务和可测收益决定。
