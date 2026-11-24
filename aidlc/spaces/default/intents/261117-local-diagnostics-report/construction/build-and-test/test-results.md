# 本地测试结果

2026-11-17，Windows PowerShell 5.1。`scripts/ai/test-codex-report.ps1` 返回 0：报告字段与双文件、`Report -Probe` 拒绝、工具缺失、版本不符、doctor 无效 JSON、不可创建报告目录均通过。异常分支使用 `.local/aidlc/` 内隔离夹具。`node scripts/check-docs.mjs` 返回 0，检查 320 份 Markdown。`git check-ignore` 确认本机报告被忽略。需求覆盖检查返回 `pass: true`，8 个 ID 全覆盖。

未执行前后端测试、容器、AWS、真实模型调用；本 Story 未修改对应代码。未读取模型或认证配置内容。实际本机 doctor 在前一轮烟测返回 1，详见 `docs/learning/14-local-codex-diagnostics.md`。
