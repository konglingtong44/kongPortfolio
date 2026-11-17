# 07｜Codex harness 与 Superpowers

[学习路线](README.md) · [本次 Story](../stories/002-qa-feature.md)

2026-11-17，本机实践记录。目标：理解开发 Agent 的执行环境，安装现成工作流，并用一个小重构核对结果。

## 1. 分清三层

| 层 | 在本项目中的例子 | 职责 |
|---|---|---|
| 模型 | 当前 Codex 会话选用的模型 | 理解问题、生成方案和工具调用 |
| Harness | Codex 原生执行环境 | 工具执行、上下文、权限和工作循环 |
| 工作流层 | Superpowers；本仓库的 portfolio-story | 规划、调试、评审、完成前验证等可复用方法 |

`AGENTS.md` 是项目规则，Skill 是按需读取的流程；它们是 harness 的组成或扩展，不等于整个运行时。安装 Superpowers 不会替换模型，也不会把网站后端改成 Agent。

选用 [Superpowers](https://github.com/obra/superpowers) 是因为它有 Codex App 接入并提供软件开发流程。截图榜单中的开源模型成绩不证明它能提升当前 Codex 的成功率；本项目尚未做受控对比评测。AWS AI-DLC 继续作方法参考，未安装其完整运行时。

## 2. 安装与核实

本次先查询插件目录，确认 Superpowers 可用；随后在本机终端执行以下命令。不同机器 marketplace 名称可能不同，先列出再安装，避免照搬不存在的来源。

```powershell
codex plugin marketplace list --json
codex plugin add superpowers --marketplace openai-curated --json
codex plugin list --marketplace openai-curated --json
```

本次结果：`superpowers@openai-curated`，版本标识 `1e285826`，本机CLI回读 `installed=true`、`enabled=true`，插件文件存在。安装没有修改仓库的AWS资源或业务配置。

注意：另一个账号插件查询入口仍显示 remote 条目未安装，所以本轮只确认**本机CLI插件安装／启用**，不声称账号远端也已安装。新会话再确认是否自动出现 Superpowers 技能；必要时重开 Codex。插件文件在本机cache，不能把作者源码复制成业务文件。

## 3. 本次怎么使用

安装后实际读取 `using-superpowers`、其 Codex 适配说明，以及 `verification-before-completion`。本轮采用“先执行检查、读取退出码和结果，再声明完成”。这是安装后的手动读取使用，不等于已验证新会话的自动触发。

问答文件在安装前已经开始迁移；安装后完成的是差异核对、证据复核与学习记录。因此不能把这次重构全程归功于 Superpowers。

```text
确认一个Story及验收 → 核对调用关系 → 移动单个功能
→ 核对业务正文仅导入路径有差异 → 测试／构建
→ 记录通过项及未验证项 → 暂停评审
```

项目约定和用户已有授权仍优先：一次一个Story，不因框架推荐就新增付费资源、自动发布、绕过两道生产审批或修改模型配置。按当前任务选择适用流程，文件移动沿用已有行为测试。

## 4. 复现这次验证

在仓库根目录执行：

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
node scripts/check-docs.mjs
```

本轮前端81项通过，构建成功；问答组件、接口、文案、样式、测试收进 `frontend/src/features/qa/`。五个文件与迁移前逐一比较，除共享导入路径外正文一致。详见[验收记录](../stories/002-qa-feature.md)。

本地测试使用模拟接口，未调用真实模型；没有新增浏览器／物理手机、容器运行、AWS构建或生产验收。后端代码未改，本轮未重跑后端检查；上一Story的后端结果不能作为本轮云端证据。

## 5. 再做一个小增量：启动脚本分类

[Story003](../stories/003-dev-launcher.md)只把本地启动实现移到 `scripts/dev/dev.ps1`。保留旧命令，通过薄包装调用新脚本；共享tools仍在原位，部署脚本后续单独整理。

这次容易出错的是`$PSScriptRoot`：它代表当前脚本所在目录，移动后读取tools要用`../tools.ps1`，定位仓库根要用`../..`，不能继续沿用移动前的一层路径。

验证分三件事：实际启动后查首页／代理／三语接口；从其他工作目录启动；最后按Ctrl+C检查5173和8080是否释放。另在端口占用时再启动，确认只拒绝而不停止原进程。仅语法解析或构建成功不能证明这些行为。

启动脚本的Maven命令使用`-DskipTests package`，所以启动成功不能写成“后端测试通过”。本轮另外执行默认`clean verify`，具体结果保存在Story中。仍按Superpowers完成前验证流程，先看实际输出，再写验收结论。

## 6. 继续按功能整理正则工具

[Story007](../stories/007-regex-feature.md)把RegexLab组件和既有测试放进`frontend/src/features/regex/`。先查App和测试的全部导入，再移动文件；同目录测试的相互导入不变，共享i18n／modules改为从上两层读取，App使用新的功能路径。

这次不创建空的shared目录，不为归类改写解析器、Worker或CSS。组件正文仅改两处导入，测试正文不变；全局样式保留现有加载顺序。文件靠近不代表必须立即把所有依赖拆出去。

实际前端81项及构建通过，证明当前导入、解析和既有App交互检查可运行；没有执行真实浏览器Worker或手机视觉验证。继续沿用“一个小Story、实际验证、记录缺口、暂停评审”的工作流。

## 7. 个人展示归类时保留样式顺序

[Story008](../stories/008-profile-presentation.md)把介绍时间线、技能展示及相关CSS／测试收进`features/profile/`。共享的资料类型、语言、手势和像素场景保持原位，只调整组件依赖路径，不改个人经历内容。

CSS移动还要看“谁导入、在哪一行导入”：intro样式继续在App原来的位置导入，skills样式继续由SkillsBento导入，两份样式正文不变，避免借归类改变级联顺序。实际前端81项和构建通过；手机折叠相关单元测试不等于真机验证。
