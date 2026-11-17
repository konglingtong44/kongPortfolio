# Story 002：问答功能目录与 Superpowers 接入

2026-11-17。状态：本地完成，待评审。

## 验收标准

- 将问答组件、接口、三语文案、样式和测试放到 `frontend/src/features/qa/`。
- 调整应用与测试导入，保持原API、取消／超时／冷却、文本渲染和三语行为。
- 前端已有测试与构建通过，文档链接有效。
- 确认 Superpowers 本机安装状态，把实际使用与未验证范围记入[学习07](../learning/07-ai-workflow.md)。

## 实现与验证

移动5个文件：`BedrockEntry.tsx`、`BedrockEntry.test.tsx`、`bedrock-api.ts`、`bedrock-copy.ts`、`bedrock.css`；`App.tsx`与`App.test.tsx`改用新路径。共享Modal与i18n保留原位置。逐一与Git原文比较，5个文件除共享导入外正文一致。

- `npm.cmd --prefix frontend test`：10个文件、81项通过。覆盖三语输入、示例、取消、超时、限流、纯文本与弹窗焦点等既有行为。
- `npm.cmd --prefix frontend run build`：成功，52个模块。日志保存在ignored `.local/story-002-frontend-{test,build}.txt`。
- `node scripts/check-docs.mjs`：74份Markdown本地链接目标通过；`git diff --check`通过；Gitleaks工作区扫描无泄漏。
- `codex plugin list --marketplace openai-curated --json`：Superpowers版本标识`1e285826`，本机installed／enabled均true；安装后读取并使用其完成前验证流程。账号remote条目仍显示未装，自动发现需新会话另验。

本轮只完成一个前端功能边界。后端／Terraform／AWS交付定义未改；未重跑后端、未验证浏览器／真机、容器或AWS部署，未提交／推送。后续再分别整理其他功能和脚本。
