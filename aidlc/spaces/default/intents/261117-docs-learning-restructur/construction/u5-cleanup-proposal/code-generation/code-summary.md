# U5 文件级整理方案：实施摘要

## 文件变化

- 新建 `docs/learning/cleanup-proposal.md`：7 项逐文件候选，分别记录用途、引用、历史价值、建议、影响、验证、回退与状态；其中 2 项建议小范围修正、4 项保留、1 项待核实。
- 更新 `docs/learning/README.md`：加入方案入口。
- 更新 `docs/learning/file-map-inventory.md`：纳入本单元新文档和测试文件。
- 新建 `scripts/checks/test-cleanup-proposal.mjs`：5 项方案结构、范围与导航回归。

## 决定与边界

本单元只提出方案，不移动或删除文件。AI-DLC 安装件、运行记录、历史 Story 与项目自写技能各有职责；仅凭名称、日期或 AI-DLC 已安装不足以判定可删。第一小批仅建议把 `docs/ai/README.md` 和 `docs/ai/aidlc-codex.md` 中 2026-11-17 的接入状态写成明确历史语境，并指向现行工作记录；保留原路径与入链。具体改动留给 U6。

## 验证

- `node --test scripts/checks/test-cleanup-proposal.mjs`：首跑 4/5，测试对短而完整的回退文字设了过严阈值；修正测试后复跑 5/5。
- `node --test scripts/checks/test-file-map.mjs`：5/5，新增手写文件列入清单。
- `node scripts/check-docs.mjs`：退出 0，检查 388 份项目 Markdown 本地链接。
- `git diff --check`：退出 0。

未运行网站/API 构建、Docker、浏览器、真机、AWS STG/生产或模型调用；本单元不改其行为，也没有声称实时云端状态。

## 与计划的偏差

无交付范围偏差。测试阈值误报已在首次运行后改正，未放宽任何已定义质量目标。
