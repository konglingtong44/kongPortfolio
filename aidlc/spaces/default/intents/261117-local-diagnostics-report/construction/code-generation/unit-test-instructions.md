# 验证指令

- 在无需项目安装的本地 PowerShell 中运行新增的目标性脚本检查；检查成功、错误与拒绝分支，并观察实际退出码。
- 运行 `scripts/ai/codex.ps1 -Action Report` 做本机烟测；读取其 JSON/Markdown，确认版本、离线 doctor、未验证项、同批次路径和 `reportWritten` / `diagnosticsPassed` 语义。
- 运行 `node scripts/check-docs.mjs` 检查文档链接。
- 通过版本控制差异确认预期只改脚本、Story/学习文档；检查 `.local/aidlc/` 被忽略。不得连接 AWS、调用模型、执行 Configure/Launch、读取或更改模型/认证配置。若没能实测只读边界的全部外部副作用，明确记录未验证。
