# 代码实施摘要

## 变更

- `scripts/ai/codex.ps1`：新增本机 `Report` 动作，保存 JSON 与 Markdown；诊断状态与保存结果分开，提前拒绝 `-Probe`。
- `scripts/ai/test-codex-report.ps1`：本机报告和拒绝分支检查。
- `scripts/checks/check-docs.mjs`：避免把 AI-DLC 问题文件的固定元数据标签当作链接。
- `docs/stories/local-codex-diagnostics.md`、`docs/learning/14-local-codex-diagnostics.md` 和学习入口：验收与实测记录。

## 验证

- PowerShell 解析通过；本机报告烟测退出码 0，JSON 可解析，`reportWritten=true`；实际 doctor 失败，报告保留失败状态。
- `test-codex-report.ps1` 与 `node scripts/check-docs.mjs` 通过；检查器本次覆盖 320 份 Markdown。
- 临时 PATH 夹具覆盖 AI-DLC 缺失、版本不符和 doctor 无效 JSON；隔离目录覆盖报告位置写入失败。真实安装故障和既有配置动作未运行；详见学习记录。

## 偏差

为兼容本机 Windows PowerShell 5.1 的默认文件编码，脚本内报告字段和值使用英文；学习文档使用中文。
