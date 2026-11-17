# 08｜不调用模型的问答回归评估

[学习路线](README.md) · [Story004](../stories/004-offline-qa-eval.md)

2026-11-17。本轮先把可重复的响应契约评估建起来，不把假模型分数当真实问答质量。

## 1. 怎么运行

在仓库根目录执行：

```powershell
. ./scripts/tools.ps1
mvn.cmd -B -ntp -f backend/pom.xml -Dtest=OfflineQaEvaluationTest test
Get-Content backend/target/qa-eval/report.json
```

完整后端检查仍为`mvn.cmd -B -ntp -f backend/pom.xml clean verify`。运行器是[OfflineQaEvaluationTest](../../backend/src/test/java/dev/kongortfolio/bedrock/OfflineQaEvaluationTest.java)，数据及字段说明在[qa-eval](../../backend/src/test/resources/qa-eval/README.md)。无需AWS登录或API key。

## 2. 实际测了什么

```text
合成资料＋问题＋预设模型响应
→ 内存假ModelGateway → 真实QuestionService
→ 返回值／安全错误／调用次数 → 脱敏JSON报告＋测试退出状态
```

17个样本：三语正常回答3个、预设“未知事实”回答3个、预设拒绝3个、中文混入日语1个、畸形响应6个、截断1个。拒绝必须替换成服务端当前语言的固定提示；错误或截断失败关闭，不能多次尝试假模型。

“未知事实／注入／混合请求”样本里的模型决定是预设的。因此只能确认Java如何处理这些决定，不能确认真实模型是否会作出正确判断。不能写成“17/17证明防注入通过”或“零幻觉”。

## 3. 怎么读报告

`mode=offline-stub`、`realModelCalls=0`表明离线模式；`passedCount/total`是样本通过数，Maven将整个评估记为1项JUnit测试。`fixtureSha256`与`serviceSha256`关联本次样本及服务源码，不是生产release标识，也未覆盖所有依赖版本。

报告在ignored的target目录，不包含问答／资料正文。每次执行先将旧报告标记为未完成；没有完成的报告不可当成功证据。`clean`会删除上轮报告。

## 4. 验证检查真的会失败

本轮复制评估集到ignored `.local/`，将第一个ANSWER期望故意改为REFUSED，通过`-Dqa.eval.cases=<绝对路径>`运行。Maven按预期失败，报告16/17且passed=false；默认完整后端回归随后重跑。原始数据没有改成错误期望。

这叫负向控制：验证门槛能发现错误。它比只看“全部通过”更有说服力。下一阶段如需真实模型评估，应明确预算、版本、抽样次数和审核规则；本轮没有启动该阶段。
