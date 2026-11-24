# 本地 Codex 诊断报告

## 目标

通过 `scripts/ai/codex.ps1 -Action Report` 保存本地 AI-DLC/Codex/PowerShell 版本、离线 doctor 结果和未验证项，便于复现项目设置状态。

## 验收

- JSON 与 Markdown 同批次写入被忽略的 `.local/aidlc/`。
- 诊断失败仍留存可用报告；写入成功返回零并显示路径，写入失败返回非零。
- `-Probe` 在任何预演文件操作前被拒绝；不访问 AWS、不运行模型、不修改配置。
- 实施、实际检查结果及未验证项记录在 `docs/learning/14-local-codex-diagnostics.md`。

## 决定

报告通过双格式保留可机器检查和可读结果；版本探测与诊断通过状态分开。
