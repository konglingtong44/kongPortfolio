# 文件与文件夹地图：先认识仓库

核对日期：2026-11-23。本页面向第一次打开项目文件夹的人。先读[零基础导览](start-here.md)，再用本页找文件夹；需要逐个文件的用途和修改时机时，打开[逐文件清单](file-map-inventory.md)。清单以本机 Git 可见的项目文件和实际目录为依据，后续新增、移动文件后须更新，不表示云端部署状态。

## 把项目想成一间工作室

一个网页需要画面、处理请求的程序、运行位置、自动检查和说明书。不同工作放在不同文件夹，改动时就能先缩小范围，也容易找到应运行的检查。

| 位置 | 存放什么 | 谁维护、什么时候看 |
|---|---|---|
| [`frontend/`](../../frontend/) | 浏览器里的三语页面、样式、图片与前端测试 | 改访客看到的内容或交互时；从 `src/App.tsx` 和 `src/features/` 开始 |
| [`backend/`](../../backend/) | Java API、公开资料、问答边界、Lambda 适配和后端测试 | 改资料接口、问答规则或服务端行为时；从 `src/main/` 与 `src/lambda/` 开始 |
| [`infra/`](../../infra/) | Terraform 云资源配置与费用关停程序 | 改 AWS 资源前，先读 `terraform/` 各根目录 README；真实创建付费资源需另获授权 |
| [`codebuild/`](../../codebuild/) | AWS CodeBuild 阶段运行的 YAML 指令 | 改 AWS 检查、候选构建、STG/Green 验证或前端发布流程时 |
| [`scripts/`](../../scripts/) | 本地运行、校验、包装发布与运维命令；`checks/` 是文档和报告检查实现，`ai/` 是项目自写 Codex 辅助脚本 | 先看[脚本入口](../../scripts/README.md)，修改命令时查调用方和测试 |
| [`docs/`](../) | 面向人的架构、产品、部署、学习、Story 与历史记录 | 从[文档入口](../README.md)选择主题；移动文档后查链接 |
| [`aidlc/`](../../aidlc/) | AI-DLC 的工作空间、分项工作记录和长期方法规则 | 工作记录与审计由流程产生；项目规则入口见[维护位置](#规则与流程在哪里) |
| [`.agents/skills/`](../../.agents/skills/) | AI-DLC 技能安装件以及项目自写 `portfolio-*` 执行指南 | 项目自写技能按任务修改；框架安装件按框架管理 |
| [`.codex/`](../../.codex/) | Codex 适配的 AI-DLC 代理、工具和配置 | 框架安装/生成区域；不要为改项目约定直接修改生成工具 |
| [`.githooks/`](../../.githooks/) | 提交与推送前的安全检查入口 | 修改 Git 提交/推送守卫时，结合脚本与项目安全规则核对 |
| [`outputs/`](../../outputs/) | 保存的图片、表格与核对证据 | 是带日期的历史资料，不代表实时 AWS 状态；不是应用源码 |

`frontend/src/features/profile/` 是介绍与技能展示；`qa/` 是问答面板；`regex/` 是正则练习工具。`backend/src/main/java/.../profile/` 处理公开资料，`bedrock/` 处理有边界的问答，`logging/` 处理访问日志。`backend/src/test/` 和 `src/lambda-test/` 存放各自的自动测试。`infra/terraform/` 下的 `bootstrap/`、`portfolio/`、`cicd/`、`cost-control/`、`bedrock-content/` 是五组分别管理状态的 Terraform 根目录；不能为美观随意合并或移动状态键。[当前实现地图](../architecture/overview.md)解释请求如何穿过这些边界。

### 常见子目录怎么找

下面列的是项目自写内容所在的有效子目录；Java 包路径中的 `dev/kongortfolio` 是代码命名空间，并非额外服务。

| 子目录 | 目的 |
|---|---|
| `frontend/public/images/` | 浏览器可直接取得的页面图片；改视觉素材时检查引用与打包结果 |
| `frontend/src/features/profile/`、`qa/`、`regex/` | 分别收纳个人介绍、问答和正则练习的组件、样式及邻近测试 |
| `frontend/src/` | 页面组合、语言、资料类型与共享交互；`App.tsx` 是组合入口 |
| `backend/src/assembly/` | 声明 Lambda ZIP 应装入哪些文件 |
| `backend/src/lambda/java/`、`backend/src/lambda-test/java/` | HTTP API 到 Spring 的适配入口及其单独测试 |
| `backend/src/main/java/dev/kongortfolio/` | Spring 应用入口；下属 `profile/`、`bedrock/`、`logging/` 分别处理公开资料、问答与访问日志 |
| `backend/src/main/resources/content/` | 随后端打包的三语公开 JSON 和问答资料模板；不放私密真实输入 |
| `backend/src/test/java/` | 后端主程序的 Java 自动测试 |
| `infra/cost-control/` | 费用关停 Lambda 的 Python 程序和测试，与 Terraform 资源定义分开 |
| `infra/terraform/<根栈>/tests/` | 各独立 Terraform 根栈的离线验证场景；`tests/fixtures/` 是测试样例输入 |
| `scripts/checks/` | 文档、发布报告和采样计划等检查器实现及其测试；根 `scripts/` 常保留兼容入口 |
| `scripts/dev/`、`scripts/ai/` | 本地启动实现与项目自写 Codex 辅助脚本 |
| `docs/architecture/`、`product/` | 当前结构与产品交互的解释；更改应用行为时一起核对 |
| `docs/deployment/`、`operations/` | 发布和恢复路径、费用与资源操作；云端写操作仍须独立授权 |
| `docs/ai/`、`learning/` | 问答实现/AI 开发概念，以及从零开始的阅读和动手课程 |
| `docs/stories/`、`history/` | 有验收范围的小改动记录，以及带日期的旧设计、操作和发布证据 |
| `.githooks/`、`.agents/skills/portfolio-*/` | 提交前安全守卫与项目自己维护的工作方法 |
| `aidlc/spaces/default/memory/`、`intents/`、`codekb/` | 可手改的项目方法规则、每项工作的记录、由扫描生成的代码知识索引；这些目录的所有权不同 |

## 哪些文件由人写，哪些由工具管理

| 类别 | 例子 | 怎么处理 |
|---|---|---|
| 项目手写的源码、规则、测试和文档 | `frontend/src/`、`backend/src/`、`infra/terraform/*.tf`、`scripts/`、`docs/`、`AGENTS.md` | 在[逐文件清单](file-map-inventory.md)定位后修改；按影响运行检查 |
| 人维护的配置示例与证据 | `*.example`、`outputs/` 中的日期资料 | 示例只供复制到本机私有输入；历史证据保留日期，不当作实时状态 |
| 锁定依赖版本的工具文件 | `frontend/package-lock.json`、各 Terraform 根目录的 `.terraform.lock.hcl` | 由 npm 或 Terraform 根据依赖更新；通常不手改内部版本或哈希 |
| AI-DLC 安装件 | `.codex/`、`.agents/skills/aidlc*`、`.aidlc-version` | 由框架安装/升级管理；要改项目规则先看下一节 |
| AI-DLC 运行记录 | `aidlc/spaces/default/intents/<工作编号>/`、`audit/`、`codekb/` | 工作成果可阅读和提交；状态、审计分片、观察记录等按其管理方维护，不为清理重复文本而删除 |
| 下载或构建结果 | `frontend/node_modules/`、`frontend/dist/`、`backend/target/`、`.terraform/`、本机 `.local/` | 可重新生成或属私有运行输入，不纳入逐文件手写清单；遵守 `.gitignore` |

## 规则与流程在哪里

| 要改什么 | 从哪里改 |
|---|---|
| 项目共同约定 | [根目录 `AGENTS.md`](../../AGENTS.md) |
| AI-DLC 针对本项目的长期方法 | [`aidlc/spaces/default/memory/project.md`](../../aidlc/spaces/default/memory/project.md)，阶段补充在 [`memory/phases/`](../../aidlc/spaces/default/memory/phases/) |
| 一个项目专用的操作流程 | [`.agents/skills/portfolio-story/SKILL.md`](../../.agents/skills/portfolio-story/SKILL.md) 等项目自写技能 |
| 本次具体工作的计划、结果、审核 | [`aidlc/spaces/default/intents/`](../../aidlc/spaces/default/intents/) 下对应工作记录；先看[当前工作状态](../../aidlc/spaces/default/intents/261117-docs-learning-restructur/aidlc-state.md) |
| 学习资料的阅读路线 | 本目录 [`README.md`](README.md) 和 [`start-here.md`](start-here.md) |

AI-DLC 不会因为已安装就让产品说明、部署资料、项目技能变得多余；它们记录不同层面的事实和做法。详细修改规则、增加流程与验证步骤在后续维护专题继续展开。

## 更新这张地图

新增或移动手写文件后，先在[逐文件清单](file-map-inventory.md)写真实路径、所属功能、用途和修改时机；若出现新目录，也更新本页的目录说明。再检查入口链接，运行 `node scripts/check-docs.mjs`。若涉及代码、脚本或 Terraform，继续运行该类文件自己的测试；本地通过不能代替 AWS 或真机验证。遇到不能核实的作用，写“待核实”及需要查的来源，不按文件名猜用途。
