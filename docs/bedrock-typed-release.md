# 输入框与直接回答：质量门槛修正中（2026-11-14）

**9de08b0候选的真实风格复核失败，执行db9e6a63…已Stopped，不可发布或复用其审批。** 基础问答合约通过未能发现中文答成日语、来源说明和未询问的经历限制。审批期间已前进到部署构建，现已停止；仅20→20基线登记，没有新版本金丝雀或前端发布，生产仍20。

修正正在进行：资料后和固定模型问题中明确本地语言及直接回答要求；新增自动语言／来源／AI限制检查，STG新增转职未知和团队归属测试。全部通过才允许第一审批。新候选与真实结果后补；下面表格为已停止轮次的历史，不能当修正版本通过证据。

本次源码`9de08b0272c56d7335d0e1037db1217b4042fd18`，执行`db9e6a63-34c9-4de1-a869-84591c0d630e`。改动为手动输入／可编辑示例，回答不主动说明资料读取或附加未被询问的经历限制；严格白名单、事实边界和费用保护保留。[前端行为](bedrock-frontend.md)

原AWS候选构建与STG25基础验收通过，但额外真实风格复核失败。生产live20与原网页仍保留，新输入方式尚未上线。

| 制品核对 | 值 |
|---|---|
| releaseId | `e2fd8d7e46b381cbc52572f145650eb32c1da270ec5f2b9901b37c1c204e9f26` |
| 后端SHA-256 | `4bae1056c6227d2cf6d6cdf77194a75ebb7e11362ef2d9fca99a287973026b83` |
| STG版本 | 25，实际Lambda摘要与同次候选及报告一致 |
| candidate构建 | `7fdf35e2-3188-42ef-8915-86b179681b35` |
| STG构建 | `77efdb47-0af1-4ecb-9ac0-8d13d0f01483` |

本次验收只更新STG。生产更新继续遵守[项目约定](../AGENTS.md)“Production retains two AWS approval gates.”：

1. 完成新候选验收后，在[AWS流水线](https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/kongportfolio-candidate/view?region=ap-northeast-1)选择本次执行及源码，第一关为`ApproveProduction / ApproveGreenCreation`。
2. 第一关批准会发布并验证生产Green，包含真实模型及冷启动检查；不会直接移动live或发布网页。
3. Green成功后仍停在`ApproveTrafficShift / ApproveBlueGreenDeployment`，第二关才授权CodeDeploy切流及同候选网页发布。不要复用已经完成的旧61bcc02c执行。

只有匹配已审核问句及常见别名的输入会生成回答，未识别的改写仍可能被拒绝。真实样本检查不是所有问法／所有回答零幻觉保证；没有独立公网STG网页，浏览器到STG模型E2E未运行。新输入方式尚未在生产公开。

证据为ignored `.local/typed-qa-release-20261114/`；私有回答不入Git，仅安全指标进入本文和执行记录。命令见[第21节](aws-commands-20261114.md)。
