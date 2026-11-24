# 文档入口

完全零基础先看[项目学习入口](learning/start-here.md)，再看[当前实现地图](architecture/overview.md)并进入对应目录。当前实现以代码为准，线上状态以同次发布证据为准；历史记录中的“当前／待审批”只表示记录当时。

| 目录 | 入口与用途 |
|---|---|
| [architecture](architecture/overview.md) | 运行链路、代码边界、Terraform 与发布的职责 |
| [deployment](deployment/README.md) | 日常发布、首次部署、审批、金丝雀与回滚 |
| [operations](operations/README.md) | 账单、费用关停、手动恢复及资源清理 |
| [ai](ai/README.md) | 网站问答实现、开发自动化概念与官方来源 |
| [product](product/README.md) | 三语内容、桌面与手机交互、设计记录 |
| [learning](learning/start-here.md) | 零基础项目导览；[课程总目录](learning/README.md)保留 00–14 动手与专项资料 |
| [stories](stories/README.md) | 一次一个增量的目标、验收和验证证据 |
| [history](history/README.md) | 旧 README、执行日志、命令补录和发布记录 |

AI 协作从 [AGENTS.md](../AGENTS.md) 和当前 Story 开始，按任务读取相关文件。项目 Skill：[执行一个 Story](../.agents/skills/portfolio-story/SKILL.md)、[审阅发布证据](../.agents/skills/portfolio-release-review/SKILL.md)。AI-DLC 的安装与当时验证情况见[学习13](learning/13-aidlc-codex.md)；实际工作的进展和决定以 [`aidlc/spaces/default/intents/`](../aidlc/spaces/default/intents/) 中相应记录为准。

本地运行 `node scripts/check-docs.mjs` 检查仓库项目文档的本地链接目标；AI-DLC 自动生成的审计分片不作为手写文档检查。检查覆盖普通行内链接、图片和引用式链接，跳过代码及外部网址；不校验标题锚点或远端网页。新增文档应挂到相应入口，避免把日常入口持续追加成执行日志。
