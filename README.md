# kongPortfolio

三语个人网站：React / TypeScript / Vite，Java 21 / Spring Boot。日语优先，支持中文、英文与手动语言选择。线上入口：[konglingtong44.com](https://konglingtong44.com)。

AWS 使用私有 S3 + CloudFront、HTTP API + Lambda；Terraform 管理基础设施，CodeBuild / CodePipeline / CodeDeploy 负责交付，保留两道人审。Bedrock 提供有界个人问答。

## 本地运行

需要 Node.js 24、JDK 21、Maven 3.9.11+、PowerShell。提交前需要 Git、Gitleaks。缺工具时见[环境准备](docs/learning/00-start.md)。本地启动无需 AWS 账号，模型默认关闭。

在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-hooks.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1
```

访问 http://localhost:5173；5173、8080 需空闲。按 Ctrl+C 停止，日志保存在被忽略的 `.local/`。容器运行及手动启动见[本地指南](docs/learning/01-local.md)。

## 验证与发布

```powershell
node scripts/check-docs.mjs
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
```

完整本地检查包含前端构建／测试、后端 HTTP／Lambda 测试、实际 ZIP 冒烟、文档链接与秘密检查；Docker 可用时只检查 Compose 配置。它不证明容器构建或云端部署通过。

日常发布从[部署入口](docs/deployment/README.md)开始。`git push` 触发 AWS CI，生产发布需要固定 SHA、同一候选制品和两次 AWS 审批。新增付费资源须明确批准。

## 项目地图

| 路径 | 职责 |
|---|---|
| `frontend/` | 页面、交互、三语文案及前端测试 |
| `backend/` | Java API、公开资料、模型边界、Lambda 适配与测试 |
| `infra/terraform/` | 五个独立根栈及锁文件；不随文档整理迁移 State |
| `infra/cost-control/` | 费用关停控制器与测试 |
| `codebuild/` | AWS 各阶段 buildspec |
| [scripts/](scripts/README.md) | 本地开发、验证、候选打包、部署与运维脚本；启动实现已归入dev目录 |
| [docs/](docs/README.md) | 按架构、部署、运维、AI、产品、学习和历史分类 |
| [.agents/skills/](.agents/skills/portfolio-story/SKILL.md) | 项目 Story 执行和发布证据审阅流程 |
| [AGENTS.md](AGENTS.md) | 项目工作约定 |

最近一次**仓库保存的**生产验收为 2026-11-16 的生产26／源码 `f4b91d3`，见[记录](docs/history/releases/bedrock-staging-language-fix.md)。这不是实时线上查询；历史 README 和执行日志归入 [history](docs/history/README.md)。
