# 09｜本地审阅STG问答证据

[学习路线](README.md) · [Story005a](../stories/005a-staging-review.md)

2026-11-17。已有STG流程包含8项HTTP检查、6项问答及4项展示检查。真实执行会部署STG并产生模型费用，本章只读取已取得的JSON，不运行AWS命令。

## 输入与运行

将两个文件放到ignored `.local/`：`report.json`为指定执行的STG报告；`expected.json`为独立核对执行记录、候选manifest和函数版本后整理的期望身份，不要只从待审报告抄一遍。

期望文件包含：`pipelineExecutionId`（UUID）、`gitCommit`（完整40位SHA）、`releaseId`和`backendSha256`（64位摘要）、`functionName`（kongportfolio-stg）、`functionVersion`（正整数数字字符串）。缺少证据不能猜值。

```powershell
node scripts/checks/review-staging.mjs .local/report.json .local/expected.json
if ($LASTEXITCODE -ne 0) { throw '报告失败、不完整或身份不匹配' }
```

完整、一致的问答证据输出`verdict=complete`并返回0。覆盖不足、失败、问答关闭或策略不符输出`failed-or-incomplete`并返回1。身份错配、重复／未知检查、非法usage或格式错误直接拒绝，只显示固定错误，不回显输入。CLI不写报告文件，先核对退出码再保存输出。

## 结果与边界

工具复用[STG契约清单](../../scripts/staging-contract.mjs)，核对8＋10项覆盖。输出仅含白名单身份、缺失检查名、usage汇总及原报告SHA256；不保留问答正文、原错误或附加字段。

`recordedUsage`仅统计检查数组的记录，不重复计算`lastInvocation`，也不补算未记录的失败或重试。因此不是整次执行总用量或账单；本工具不含价格计算。报告自报usage不能证明真实调用发生。

JSON一致不等于真实性、当前线上状态或人工审批通过。输出明确标记`liveStateVerified=false`、`approvalsGranted=false`。原STG报告也没有足够的资料S3版本／模型配置快照，仍须依照Green流程独立核对来源、配置及事实质量。

本轮仅用合成夹具验证工具，没有审阅新的真实云端报告。测试覆盖CLI非零退出、身份错配、缺失／重复检查、错误usage、脱敏与不重复统计。后续005b先确定真实样本、次数、模型／资料版本、费用估算和停止条件，再按授权采样；两道生产审批保留。
