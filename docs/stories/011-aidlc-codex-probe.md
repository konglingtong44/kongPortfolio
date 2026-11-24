# Story011：AI-DLC → Codex harness 接入预演

2026-11-17。状态：隔离接入预演完成，主仓库激活待下一增量。

## 目标与验收

把官方AI-DLC方法及确定性引擎接到Codex CLI的配置／Skill／hooks接口，先在隔离项目生成可审阅结果。一个Story只推进接入预演，不混入网站功能或AWS部署。

- 固定AI-DLC 2.11.4，核实本机Codex版本；复用原模型／provider。
- 独立Git目录中预演配置，保留原项目规则和两个portfolio Skill。
- 提供与工作目录无关的预览、配置、doctor和交互启动入口；默认只预览。
- 实际运行doctor，分别报告文件检查、hook信任及新会话激活，不把安装等同于工作流成功。
- 主仓库业务代码、AWS交付及双审批保持原约定。

## 实现与验证

接入说明见[AI-DLC与Codex](../ai/aidlc-codex.md)。用户级安装2.11.4并注册User PATH，未改Machine PATH或模型／provider；Codex CLI实测为0.169.0-alpha.11.1。

`scripts/ai/codex.ps1`默认Preview，显式Configure／Doctor／Launch各自独立；`-Probe`限定到ignored独立Git目录。不会默认启动模型会话或信任hooks。配置和版本固定使用上游CLI；没有手写一套AI-DLC引擎。

- 初次主项目dry-run：455新增、2合并、0冲突；未实际应用到主项目。
- 隔离配置实际成功；原AGENTS正文前缀与两个portfolio Skill SHA256相同；生成config未选择model／provider。
- 隔离doctor退出0：65通过、2警告、0失败。两条警告为hooks未在新会话运行及本地记录未提交；日志`.local/aidlc/probe-doctor-final.json`。
- 从系统临时目录调用主项目Preview成功；AGENTS／gitignore摘要不变，主项目未生成上游配置目录。
- PowerShell语法、92份Markdown本地链接、文档Gitleaks及diff空白检查通过。未重跑前后端：本增量只增加开发入口与文档，Story010结果单独保留。

## 评审与后续

主仓库根规则、业务代码、云端配置未变，未提交或推送。下一增量审阅`.local/aidlc/probe/.codex/config.toml`、`hooks.json`和`rules/default.rules`后，再接入主项目并在新的Codex CLI会话验证真实hooks和`$aidlc`发现。当前聊天、静态doctor或安装成功均不等于已跑完一次生命周期；也不把上游命令允许规则等同于用户已审批任何AWS发布。
