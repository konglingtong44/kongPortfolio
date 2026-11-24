# 本地构建指令

本 Story 只修改 PowerShell 脚本和 Markdown；无依赖安装、编译、容器或环境变量配置。运行 `scripts/ai/test-codex-report.ps1`，再运行 `node scripts/check-docs.mjs`。报告仅写入已忽略的 `.local/aidlc/`。若脚本找不到本机工具，检查报告中的状态；若无法写报告，检查目录权限。
