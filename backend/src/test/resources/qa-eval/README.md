# 离线问答服务评估集

`cases.json`是合成数据，不代表Kong的真实经历。17个样本通过内存假ModelGateway驱动真实QuestionService；测试数据不进入生产JAR或Lambda包。

仓库根目录运行：

```powershell
mvn.cmd -B -ntp -f backend/pom.xml -Dtest=OfflineQaEvaluationTest test
```

报告：`backend/target/qa-eval/report.json`，由Git忽略。默认后端`clean verify`也会运行本评估；现有AWS后端CI通过默认构建接入，本轮未执行云端CI。

| 字段 | 含义 |
|---|---|
| version / facts | 评估集版本与合成资料 |
| id / language / question | 唯一稳定ID、ja/zh/en、合成问题 |
| modelResponse / truncated | 预设的模型原始响应及截断标志 |
| expectedOutcome | ANSWER、REFUSED、MODEL_LANGUAGE_MISMATCH或INVALID_MODEL_RESPONSE |
| expectedContains | 成功返回的文本应包含此片段；空串不增加文本要求 |

每个样本新建服务并限制恰好一次假调用。报告只保留ID、语言、期望／观测结果、假调用次数与通过标志，以及资料集／QuestionService源码SHA256；不保留问题、回答、资料、提示词或异常正文。真实调用数固定为0；假usage不能当费用或真实tokens。

需要测试失败门槛时，将副本放进ignored `.local/`，修改一个期望值后传绝对路径：`-Dqa.eval.cases=<副本绝对路径>`。错误期望会让Maven失败，报告为false；启动时先覆盖旧成功报告为未完成状态。测试后默认重跑恢复正常报告。

这验证Java的响应契约，**不验证真实模型的语义拒绝、未知事实判断或防注入能力**。这些问题对应的模型输出已被脚本预设；后续真实模型质量评估须另有预算、重复采样和人工审核。[学习说明](../../../../../docs/learning/08-offline-qa-eval.md)
