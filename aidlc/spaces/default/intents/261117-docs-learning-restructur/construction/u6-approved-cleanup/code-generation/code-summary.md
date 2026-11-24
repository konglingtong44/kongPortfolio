# U6 首批整理：实施摘要

## 文件变化

- `docs/ai/README.md`：将 2026-11-17 接入核对结果明确写作当日历史记录，链接本轮 AI-DLC 状态。
- `docs/ai/aidlc-codex.md`：把接入状态与下一步计划标明为 2026-11-17 的记录，补本轮工作记录入口；保留当日安装、诊断数字和原命令。
- `docs/learning/cleanup-proposal.md`：记录首批两个可逆文字修订的实施依据和边界，保留其他候选的保留或待核实状态。
- `docs/learning/file-map-inventory.md`：纳入新增测试文件，项目手写文件清单更新为 318 项。
- `scripts/checks/test-approved-cleanup.mjs`：新增 5 项历史语境、路径、历史事实和首批边界回归。

## 决定与边界

用户本轮要求“继续，不用等我确认”，因此按已经审核的 U5 两文件首批范围实施可逆文字修订；未执行移动、合并或删除，也未将持续执行授权扩大到破坏性清理。原路径和入链保留，旧课程、Story、项目技能及 AI-DLC 管理文件不变。未修改网站、API、Terraform、流水线或 AWS 资源。

## 验证

修改前：`node scripts/check-docs.mjs` 检查 394 份 Markdown 通过；U5 方案测试 5/5、文件地图测试 5/5，`git diff --check` 退出 0。

修改后：`node --test scripts/checks/test-approved-cleanup.mjs` 5/5；`node --test scripts/checks/test-file-map.mjs` 5/5；`node --test scripts/checks/test-cleanup-proposal.mjs` 5/5；`node scripts/check-docs.mjs` 检查 394 份 Markdown 通过；`git diff --check` 退出 0。人工核对原入链、历史数字和命令仍在。

未验证远程链接、真实浏览器/手机、容器、前后端构建、AWS STG/生产、hook 执行健康或真实模型效果；本单元没有改变对应运行行为。

## 与计划的偏差

无交付范围偏差。此次只是两份文档的时态与入口修订，没有实际目录移动。
