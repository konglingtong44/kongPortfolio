# 本地 Codex 诊断报告

本文记录 `scripts/ai/codex.ps1 -Action Report` 的用途和验证边界。命令会在仓库 `.local/aidlc/` 留下本机 JSON 与 Markdown；该目录受 `.gitignore` 忽略。

## 运行方式

从仓库任意工作目录执行：

```powershell
./scripts/ai/codex.ps1 -Action Report
```

成功写入两份报告返回零。这个退出码只说明文件保存成功；请查看 `diagnosticsPassed` 和 doctor 状态判断检查结果。诊断输出属于本机记录，不要分享含个人路径或本机信息的报告。

`-Action Report -Probe` 会在建立预演目录之前拒绝，避免预演的 Git 初始化和复制操作。

## 报告字段

- UTC 生成时间和 PowerShell、Codex CLI、AI-DLC 版本查询状态。
- `aidlc doctor --json --offline` 的执行状态、退出码和可解析结果。
- 未完成的端到端模型任务、审批/hook、压缩恢复及 AWS/生产验证。

报告生成与诊断通过是两个不同结果。缺少工具、命令非零或 JSON 无法解析都会明确标记；不表示安装或工作流已验证。

## 实施与验证记录

- 2026-11-17：新增 `Report` 动作，先拒绝 `-Probe`，然后分别查询本机版本与离线 doctor，将同批次结果写为 JSON、Markdown。报告保存成功返回零，诊断状态由 `diagnosticsPassed` 表示。
- PowerShell 解析检查：通过；初版脚本中的中文常量在 Windows PowerShell 5.1 的默认文件编码下导致解析失败，已改为兼容的英文报告字段与文案。
- `./scripts/ai/test-codex-report.ps1`：通过；验证同批次报告字段、两份文件，以及 `Report -Probe` 非零退出。还在进程内临时 PATH 下验证 AI-DLC 缺失、版本不符与 doctor 无效 JSON；在 `.local/aidlc/` 内的隔离目录验证报告目标不可建时返回非零。PATH 与夹具只在测试进程和被忽略的本地目录中使用。
- `./scripts/ai/codex.ps1 -Action Report -Probe`：按预期返回非零，未进入 Probe 初始化。
- `./scripts/ai/codex.ps1 -Action Report`：返回零，生成 `.local/aidlc/20261117T084214108Z-codex-diagnostics.json` 与同名 Markdown。JSON 可解析，`reportWritten=true`、`diagnosticsPassed=false`。
- 本机 PowerShell 为 `5.1.26100.9444`；AI-DLC 为 `2.11.4 (runtime 2.11.4)`。本次 Codex CLI 版本调用失败（无法创建 PATH 别名，提示找不到 home directory）；离线 doctor 返回退出码 1，报告状态为 `failed`，结果显示 67 项通过、1 项警告、1 项失败。这里记录的是本机实际结果，不代表成功验证完整工作流。
- `node scripts/check-docs.mjs`：通过，检查 319 份 Markdown。原检查器误将工作记录的 `[Answer]:` 与 `[Planned Source]:` 当成本地链接；已在 `scripts/checks/check-docs.mjs` 排除这些固定元数据标签。
- 上述异常场景由本地夹具模拟，不能替代真实安装故障；既有 `Preview`、`Configure`、`Launch` 动作未运行。没有运行全仓前后端测试或容器检查，也未对模型或认证配置文件做前后读取比较。

## 未验证项

- 真实模型任务与完整工作流体验。
- 所有审批/hook 事件及上下文压缩恢复。
- AWS、STG、生产、容器及实体设备行为。
