# 10｜把真实模型采样预算做成可审阅计划

[学习路线](README.md) · [Story005b](../stories/005b-sampling-plan.md)

2026-11-17。本章生成本地草案，不执行采样，也不创建AWS资源。

## 运行与范围

```powershell
node scripts/checks/plan-staging-sampling.mjs
```

输出标记`executable=false`、`approvalsGranted=false`。没有execute选项，没有AWS／网络调用，也没有实际费用控制执行器。按脚本位置读取文件，可从其他工作目录运行。

复用既有STG的10个问答样本（[契约清单](../../scripts/staging-contract.mjs)），每个3次，共最多30次，无重试、串行、初始等待70秒，计划的最早启动间距15秒。实际执行时还必须等前一次结束，不能为了追赶计划时间并发调用。总时间拟限制20分钟。

这只是限流安排建议，不保证所有Lambda实例或账户配额：当前服务限制为每实例6次／分钟、60次／小时，其他调用会占额度；开始前需核对剩余额度、避免并发评估。出现429、服务／传输异常、usage缺失、候选／配置变化或达到时间／请求限制即停止，不自动重试。

## 费用依据与假设

本轮直接读取[AWS东京价格文件](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/ap-northeast-1/index.json)，publicationDate为2026-11-11T01:30:37Z，筛选当前Java使用的`qwen.qwen3-235b-a22b-2507`、Mantle Standard。

- 输入SKU：79HS9WT8R83A4ZDA，$0.00027／1K tokens，换算$0.27／百万。
- 输出SKU：C8F2RN2SDE28RN3W，$0.00106／1K tokens，换算$1.06／百万。
- [本地价格摘录](../../scripts/checks/staging-pricing.json)保留核对日期、SKU及原价格文件SHA256；完整原文件仅在ignored `.local/`。

草案按每次6,000输入、1,024输出tokens估算：

```text
30 × (6,000 × 0.27 + 1,024 × 1.06) / 1,000,000
= $0.0811632 模型费
```

默认场景预算为$0.10；如果假设输入改为12,000，估算$0.1297632，生成器会拒绝超过$0.10的场景。可传一个本地JSON配置文件调整`repeats`、`assumedInputTokens`、`outputTokens`、`scenarioBudgetUsd`、`spacingSeconds`；参数校验只约束草案。

**这不是硬账单上限。** 输入量尚未用真实tokenizer核定，字符数不等于tokens；价格可能变化，语义拒绝也有费用，税、Lambda、S3、日志、CodeBuild等另计。执行器尚未实现；即使将来遇到usage超过假设后停止，那次请求也已产生费用。

## 真实执行前还缺什么

需独立核实不可变STG函数版本、源码／候选、审核资料版本与摘要、模型配置及最新单价，并形成明确的实际采样授权。草案不填写虚构云端身份，也不当作批准或生产发布。之后才实现／审阅执行器及结果报告；本轮不修改现有流水线的10次STG检查，不将30次额外采样自动加入CI。两道生产审批保持原流程。

本轮4项离线测试覆盖样本次数、三语、预算计算、越界参数、不同工作目录和不可执行标记。原始价格获取只访问公开AWS文件，不涉及账号API或真实推理。
