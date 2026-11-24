# Story013：修复普通PowerShell找不到Codex CLI

2026-11-17。状态：路径修复、版本检查和修正后的入口交互启动通过；用户终端待重试。

用户从普通PowerShell执行Launch时得到`Missing tool: codex.exe`。此前Agent环境的PATH含VS Code扩展bin目录，未覆盖用户终端的情况。

## 验收与实现

- 优先使用PATH中的Codex应用，包括独立安装的`codex.cmd`；否则查本机官方VS Code扩展。
- 扩展回退核对package的publisher/name，按版本选取存在的CLI文件；不硬编码本机扩展版本或修改用户／Machine PATH。
- Launch和Doctor共用解析方法，给当前进程补CLI路径；新增Version动作，只打印路径并运行`--version`。

`scripts/ai/tools.ps1`实现解析。将测试进程PATH重建为Machine＋User后，`Get-Command codex.exe`确实找不到；执行`-Action Version`成功解析官方扩展中的CLI并返回`0.169.0-alpha.11.1`。这次未再替用户打开交互CLI、登记信任或执行AI-DLC工作流。

复现与学习说明见[学习13](../learning/13-aidlc-codex.md)。本轮没有修改模型／provider、认证或AWS配置。

用户重试后暴露扩展CLI缺少后台服务包。此前手工验证用了`--no-daemon`，启动入口却未传入；已修正Launch参数。实际执行修正后的PowerShell入口成功到达Codex交互主界面并退出，没有发送模型请求。该次验证覆盖启动，不替代AI-DLC当前会话授权或完整工作流验证。
