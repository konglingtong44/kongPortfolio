# 13｜把AI-DLC接到主仓库的Codex harness

[学习路线](README.md) · [隔离预演](../stories/011-aidlc-codex-probe.md) · [本次Story012](../stories/012-aidlc-codex-main.md)

2026-11-17。本章记录真实接入操作；已完成配置、Skill发现和hook信任，尚未执行一个模型驱动的完整AI-DLC Story。

## 1. 这条链如何工作

AI-DLC提供生命周期、阶段状态和审批规则，通过Codex的配置、Skill和hooks接入执行环境；Codex使用原来选择的模型执行任务，项目脚本给出可重复的检查反馈。

```text
需求 → AI-DLC计划／阶段 → Codex工具执行 → 项目检查
     → 读取失败并修复 → 留下证据与未覆盖项 → 人工评审
```

网站的Bedrock问答是另一条运行链路。开发工具没有打进前端或Lambda，也没有替换现有AWS CI/CD。

## 2. 从预演应用到主项目

前提：本机官方AI-DLC为2.11.4，Codex CLI为0.169.0-alpha.11.1。上轮已验证固定release安装器，并注册用户PATH；每个PowerShell入口通过`scripts/tools.ps1`重读User PATH，终端无须手动猜安装路径。

在仓库根执行：

```powershell
./scripts/ai/codex.ps1 -Action Preview
./scripts/ai/codex.ps1 -Action Configure
./scripts/ai/codex.ps1 -Action Doctor
./scripts/ai/codex.ps1 -Action Version
./scripts/ai/codex.ps1 -Action Launch
```

Preview只预览；Configure才应用官方适配并写入`.aidlc-version`。入口将`config --harness codex`和`config --pin 2.11.4`分开执行，因为上游CLI不允许组合这两个选择。`-Probe`仍可切到ignored独立Git目录；本章实际使用的是主仓库。

| 生成位置 | 作用 |
|---|---|
| `.aidlc-version` | 固定项目使用2.11.4 |
| `.codex/config.toml` | 项目onboarding、工具与sandbox设置；未指定model／provider |
| `.codex/hooks.json` | 11个事件处理器，调用`aidlc engine adapter codex ...` |
| `.codex/rules/default.rules` | 上游允许的`aidlc engine`和`git worktree/commit/add`前缀 |
| `.agents/skills/aidlc/`及同系列目录 | 主入口和显式阶段Skill |
| `aidlc/spaces/default/memory/project.md` | 本项目已有工作方式、测试、秘密及AWS约定 |

上游向AGENTS和gitignore追加受管块。原AGENTS正文前缀与两个portfolio Skill均核对保留；业务代码和云端配置未改。项目方法层补充了一个小Story、学习记录、三语手机约定、已有检查入口与两道AWS审批。没有把Superpowers再叠加为第二个生命周期协调者。

## 3. 新会话：发现与信任分别检查

先用本机只读诊断检查模型可见上下文：

```powershell
codex debug prompt-input '$aidlc --help'
```

PowerShell中的单引号保留字面量`$aidlc`。本次输出包含AI-DLC developer onboarding、aidlc Skill、portfolio-story及原项目约定；命令只渲染上下文，不证明模型已经完成任务。完整输出可能包含本机上下文，只存ignored证据目录。

随后实际打开Codex CLI，出现“11 hooks are new or changed”。先进入Review hooks，核对来源为本项目`.codex/hooks.json`，再通过CLI的信任操作登记这组hooks。没有手写用户信任表或使用`--dangerously-bypass-hook-trust`。

退出后再开一个新CLI会话：`/hooks`中的处理器显示Active，`/skills`→List skills里搜索`aidlc`能够找到主入口及阶段Skill。只操作了本地菜单，没有发送模型工作流请求。

自动化PTY首次报告`TERM=dumb`；后一次验收只在当前进程设置`TERM=xterm-256color`，未写全局终端环境。普通用户交互终端可直接使用Launch入口。

### 普通PowerShell找不到codex.exe的修复

用户随后实际运行Launch，报告`Missing tool: codex.exe`。原因是此前Agent进程继承了VS Code扩展bin路径，普通PowerShell没有这段PATH；先前CLI成功不能证明普通终端能启动。

[Story013](../stories/013-codex-cli-discovery.md)补充共用解析：优先PATH中的`codex.exe`／`codex.cmd`，再查用户`.vscode/extensions/`里publisher为openai、name为chatgpt的扩展，选择最新存在的CLI。不固定扩展版本，也不改全局PATH。Launch／Doctor只为自己的进程补路径。

真实复测将进程PATH重建为Machine＋User，先确认`Get-Command codex.exe`找不到，再运行Version，成功找到扩展CLI并输出`0.169.0-alpha.11.1`。用户可依次执行：

```powershell
./scripts/ai/codex.ps1 -Action Version
./scripts/ai/codex.ps1 -Action Launch
```

进入Codex输入框后，执行`/hooks`、按`t`、再按`Esc`；这些是Codex内的操作，不是PowerShell命令。此次修复只验证路径和CLI版本，用户终端的交互启动及当前聊天的AI-DLC授权仍待重试。

### 扩展CLI缺少后台服务包

用户再次运行Launch后出现`this CLI has no complete local package`，错误要求添加`--no-daemon`。此前人工交互验收已使用这个参数，但启动脚本漏传；能找到CLI和能完整启动是两项验证。

已将Launch修正为`codex --no-daemon`，通过实际PowerShell入口启动到Codex交互主界面并退出，没有发送模型任务。现在仍用同一条Launch命令重试即可。开头`this project is pinned to aidlc 2.11.4`是固定版本提示，本次失败来自后面的Codex后台包错误。

## 4. 实际结果与证据边界

- 主仓库Configure成功，固定版本2.11.4；之后刷新预览为0新增、1更新、458保留、0冲突，未执行该刷新事务。
- doctor退出0：65通过、2警告、0失败。警告为尚无hook执行健康记录、`aidlc/`记录未提交。
- 新会话的加载、Skill发现和信任持久化已观察到；Active表示可执行，不能据此补签hook已执行。没有制造健康标记来清除警告。
- 299份Markdown本地链接、diff空白检查及全仓库Gitleaks通过。`node scripts/test-hooks.mjs`实际拦截28个强制加入的私密路径、接受公开源码，并在扫描器缺失时拒绝继续；5个忽略规则抽查也通过。
- 原前后端、Terraform、buildspec和秘密hooks无改动，本章没有重跑业务构建。Codex命令允许规则不替代Git秘密hooks，也不构成AWS发布授权。
- 命令输出、配置前摘要、只读prompt诊断和CLI菜单日志保存在ignored `.local/aidlc/story012/`；未提交、推送或部署AWS。

## 5. 下一次如何验收完整闭环

在新的本机Codex CLI会话中，用`$aidlc`发起一个不涉及AWS的小Story，按实际出现的计划／阶段决定继续。让它运行已约定的本地检查，记录命令、退出码、文件差异、失败修复及未验证项，再确认hook健康记录和状态恢复。

本轮没有跑这个完整闭环，也没有验证所有工具事件或压缩后的恢复行为；当前聊天不能因磁盘上的配置变化就被称为已接入本机CLI hooks。信任hooks与AWS生产审批是不同授权，两道发布审批继续保留。

参考：[官方2.11.4 Codex适配](https://github.com/awslabs/aidlc-workflows/blob/v2.11.4/docs/guide/harnesses/codex-cli.md)、[项目接入说明](../ai/aidlc-codex.md)。
