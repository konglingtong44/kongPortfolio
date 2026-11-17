# Story 003：本地启动脚本分类

2026-11-17。状态：本地完成，待评审。

## 验收标准

- 本地启动实现放进 `scripts/dev/`，原命令继续可用。
- 修正共用工具与仓库根路径，保持原启动、就绪和清理逻辑。
- 实测启动、代理与三语资料、端口占用保护、退出清理及其他工作目录启动。
- 补齐学习记录，检查文档、PowerShell语法与相关回归。

## 实现与验证

`scripts/dev/dev.ps1`与Git原文比较，仅工具导入及仓库根解析两处路径变化。`scripts/dev.ps1`改为薄入口，使用调用运算符和`@args`转发；原脚本没有声明配置参数，本轮未新增参数。

- 从仓库根目录用旧入口启动：Vite首页200，代理health为UP，日／中／英profile均有资料和项目。
- 从`.local/`用绝对路径调用新入口：成功，代理health为UP；说明路径不依赖调用者当前目录。
- 在服务运行时再调用旧入口：拒绝5173端口占用，原前后端进程ID保持不变。
- 两次用交互终端Ctrl+C退出：进程结束，端口释放；中断退出码为1，记录为用户中断，不当成启动失败。
- 两个入口的PowerShell AST语法解析通过。启动内的Maven package跳过测试；另行运行默认`clean verify`，44项全部通过，BUILD SUCCESS，日志位于ignored `.local/story-003-backend.txt`。
- `node scripts/check-docs.mjs`：76份Markdown本地链接目标通过；`git diff --check`通过；Gitleaks工作区扫描无泄漏。最终确认5173／8080无监听服务。

本轮实际启动提供前端及代理冒烟证据，未改页面，不重复前端单元测试／构建。未执行Lambda检查、容器运行、AWS操作、浏览器视觉或手机真机验收。学习内容见[07章](../learning/07-ai-workflow.md)。
