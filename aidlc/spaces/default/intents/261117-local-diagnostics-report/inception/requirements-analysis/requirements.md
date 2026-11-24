# 本地只读诊断报告需求

## 意图与范围

开发者需要从现有 `scripts/ai/codex.ps1` 留存本机工具状态与验证边界，方便复现和学习，而不是把安装、版本或 doctor 成功当作完整 AI-DLC 工作流验证。[desc]

这是一个本地工具 Story：扩展脚本、针对性验证和学习记录；不改变网站、AWS 交付或模型、认证配置。[desc]

## Sources

- [desc] Initial description: 做一个仅限本地的小Story：为 scripts/ai/codex.ps1 增加只读诊断报告，记录版本、doctor结果和未验证项，保存到 .local/aidlc/，并把实施与验证过程写入 docs/learning/。不访问AWS，不修改模型或认证配置。
- [scope] Workflow-selected scope: express；Minimal 文档深度与测试策略。
- [Q1] `requirements-analysis-questions.md`：用户选择“JSON 与 Markdown”。
- [Q2] `requirements-analysis-questions.md`：用户选择“报告写入成功即返回零”。
- [code] `scripts/ai/codex.ps1`：现有 Action、AI-DLC 2.11.4 期望版本、离线 doctor 和 Probe 初始化行为；开发者扫描见 `../reverse-engineering/developer-scan.md`。
- [project] 根 `AGENTS.md` 与项目工作约定：一次一个 Story，记录实际结果与未验证范围；`.gitignore` 已忽略 `.local/`。

## Functional Requirements

| ID | 优先级 | 需求与验收标准 |
|---|---|---|
| FR1 | Must | 提供显式本地报告动作；实施采用 `-Action Report`。Given 从仓库或其他工作目录调用该动作，When 报告保存成功，Then 在仓库根 `.local/aidlc/` 下生成同批次 JSON 与 Markdown，并输出两份路径。重复调用保留以前的报告；未指定该动作时沿用现有默认行为。[desc][Q1][code] |
| FR2 | Must | 记录本次生成时间和 PowerShell、Codex CLI、AI-DLC 的可获得版本；外部版本命令记录输出、退出码或未执行原因。Given 某个工具缺失、版本查询失败或 AI-DLC 版本与现有期望不符，When 生成报告，Then 仍保留其他可获得的版本信息和失败事实，不被旧版本检查提前中断。[desc][code] |
| FR3 | Must | 记录本机离线 doctor 的命令、执行状态、退出码和可用结果。Given AI-DLC 可用，When 执行诊断，Then 明确使用现有 `doctor --json --offline`，不因 Codex 缺失而静默略过 doctor。Given doctor 无法执行、失败或输出不是有效 JSON，Then 报告明确区分这些情况，保留可用诊断文本或失败原因；不把无效结果标成通过。[desc][code] |
| FR4 | Must | 两种格式都列出未验证项及原因，包括真实模型任务、完整审批与 hook 事件、上下文压缩恢复，以及本次排除的 AWS 和生产验证。Given 版本命令或 doctor 成功，When 查看报告，Then 上述项目仍保持未验证，不自动升级为成功；JSON 与 Markdown 表达同一批事实。[desc][project] |
| FR5 | Must | 报告保存成功与诊断健康状态分开表达。Given 工具缺失或 doctor 失败，但 JSON、Markdown 均保存成功，Then 进程返回零，控制台说明这只代表报告已保存，诊断异常在报告中可见。Given 任一报告写入失败或参数组合不合法，Then 返回非零，不宣称完整报告已保存。[Q2][Q1] |
| FR6 | Must | 在 `docs/learning/` 写明调用方法、实施决定、实际验证命令与结果、失败场景和未验证项，并从学习入口可发现。Given 另一位开发者阅读该记录，When 按步骤运行，Then 能定位报告并理解退出码与验证边界；模拟工具结果和真实本机结果分开记录。[desc][project] |

## Non-Functional Requirements

| ID | 优先级 | 可验证约束 |
|---|---|---|
| NFR1 | Must | 报告动作仅为检查和报告落盘：不调用 AWS、在线 doctor、Configure、Launch、安装、Git 初始化或配置写入；不修改模型、认证或项目配置。`Report -Probe` 在 Probe 创建或复制之前明确拒绝，避免隐藏写入。验证应检查命令调用边界及配置未变。[desc][code] |
| NFR2 | Must | 不读取或导出认证文件内容、秘密环境变量或完整私人配置；报告保存在已忽略的 `.local/aidlc/`，不纳入提交。用针对性检查覆盖成功、工具缺失、版本异常、doctor 非零/无效 JSON、保存失败与只读边界；运行文档链接检查并如实保留未执行项。[desc][project][scope] |

## 实施约定

- 动作名 `Report`、同批次文件名和报告状态字段由实现明确；它们是满足上述需求的局部接口选择，不改变现有五种动作的语义。
- 报告包含诊断输出，限本机保存；学习文档只保留可复现命令、结果摘要与验证边界。
- 不新增依赖、服务或云资源；不把报告动作接入 AWS 流水线。
- 只读约束指检查目标与配置不变；报告文件及其 `.local/aidlc/` 目录的创建是明确允许的输出。

## 范围外

AWS 查询与部署、真实模型调用、模型或认证配置调整、完整 AI-DLC 端到端验证、安装修复、前后端功能修改、容器或物理设备验证。本 Story 不对这些项目给出通过结论。

## Assumptions & Open Questions

None.

## 验证交付

实施阶段在 `docs/stories/` 保留一个短 Story，连接本需求与验收；运行范围相称的脚本检查、真实本机报告烟测和 `node scripts/check-docs.mjs`。前后端未修改时不把它们列为本次已验证结果。所有失败与未执行检查都进入学习记录；结束后暂停评审。
