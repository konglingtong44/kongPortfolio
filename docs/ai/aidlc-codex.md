# AI-DLC → harness → Codex

2026-11-17。本项目的最终目标是：给出一个需求后，由AI完成受约束的规划、实现、检查和证据整理，人保留关键决定与发布审批。

| 层 | 本项目如何承接 |
|---|---|
| AI-DLC：生命周期与确定性工作流 | 官方版本固定；需求、计划、阶段产物、验证、评审和恢复状态有记录 |
| Codex harness：执行环境 | 读取项目规则和Skill，执行工具、hooks及检查；权限和信任由实际Codex会话控制 |
| Codex执行者 | 理解任务、修改代码、读取检查结果并修复；不凭自己的完成声明代替证据 |
| 项目已有约束 | `portfolio-story`执行一个小增量，`scripts/check.ps1`等给出反馈，发布沿用AWS与双审批 |

## 2026-11-17 的接入核对

固定[AI-DLC 2.11.4](https://github.com/awslabs/aidlc-workflows/releases/tag/v2.11.4)，安装器按发布摘要验证下载文件。本机Codex CLI为`0.169.0-alpha.11.1`，满足[官方Codex适配说明](https://github.com/awslabs/aidlc-workflows/blob/v2.11.4/docs/guide/harnesses/codex-cli.md)要求的最低版本`0.145.0`。

Story011先在ignored `.local/aidlc/probe/`建立独立Git项目预演。Story012已将官方Codex配置、Skill、hooks、方法目录与版本固定信息应用到主仓库，原项目规则和两个portfolio Skill保留。当日新本机Codex CLI已发现aidlc并登记11项hook信任；操作与证据见[学习13](../learning/13-aidlc-codex.md)。当日聊天不能据此被称为已加载本机CLI hooks。

最终采用上游用户级安装位置`%LOCALAPPDATA%/aidlc`，安装器注册了用户PATH；没有修改Machine PATH。早先`-NoModifyPath`的隔离安装不能满足上游非交互hook PATH检查，已保留为预演记录，不作为最终就绪证据。

`scripts/ai/codex.ps1`从用户PATH找到`aidlc.exe`并核对版本；Codex优先使用PATH中的CLI，找不到时回退已安装的官方VS Code扩展。可用`-Action Version`只读核对实际路径与版本；普通PowerShell的路径修复见[学习13](../learning/13-aidlc-codex.md)。从仓库根或其他目录都可调用：

```powershell
# 默认只预览；这些命令不调用模型。
./scripts/ai/codex.ps1
./scripts/ai/codex.ps1 -Probe -Action Configure
./scripts/ai/codex.ps1 -Probe -Action Doctor

# 主仓库：预览、诊断、启动新CLI；Configure已在Story012执行。
./scripts/ai/codex.ps1 -Action Preview
./scripts/ai/codex.ps1 -Action Doctor

# 人在交互终端启动Codex；启动后才会有新的模型会话。
./scripts/ai/codex.ps1 -Action Launch
```

新机器按固定release的Windows安装说明安装2.11.4，打开新终端再运行入口；不复制本机绝对路径、缓存、账号配置或密钥。入口不修改全局模型、provider或认证。

## 审阅什么

- `.codex/config.toml`：项目级onboarding、workspace-write与网络设置，模型／provider未指定。
- `.codex/hooks.json`：会话、提示、工具调用及结束等事件会运行`aidlc engine adapter codex ...`。
- `.codex/rules/default.rules`：上游预允许`aidlc engine`及`git worktree/commit/add`前缀；本轮已审阅并应用，AWS发布授权与秘密保护仍按原约定。
- `AGENTS.md`和`.gitignore`的受管块：保留原文并追加；两个portfolio Skill仍独立存在。

2026-11-17 的接入工作在CLI中审阅来源为主项目的11个hooks并登记信任，重新打开CLI后仍显示Active；没有手工修改信任表或使用跳过信任检查的参数。只读prompt诊断和CLI Skill菜单验证了aidlc发现。当日 doctor 尚无hook执行健康记录，首次模型驱动的完整Story仍需另行验收。这一段保留当时的检查结果，不描述本轮实时状态；本轮文档整理的阶段和检查见[AI-DLC 工作记录](../../aidlc/spaces/default/intents/261117-docs-learning-restructur/aidlc-state.md)。

隔离预演和主项目doctor均为65通过、2警告、0失败，退出码0；主项目警告是尚无hook执行健康记录及`aidlc/`记录未提交。原预览为455新增、2合并、0冲突，随后已实际应用；没有为清除未提交警告自动提交或推送。

## 2026-11-17 时记录的下一步计划

1. 已完成隔离预演、主仓库配置、新CLI的发现和信任验证。
2. 当时计划下一Story用不涉及AWS的真实任务走完整生命周期，绑定源码、命令、退出码、hook健康与未验证项。
3. 当时计划再把已有确定性检查与报告纳入harness反馈；发布继续走AWS流水线与两道人工审批。

Superpowers与portfolio Skill按任务使用，不与AI-DLC同时叠加两套主流程。网站Bedrock问答保持独立；这些开发工具不随前端或Lambda部署。
