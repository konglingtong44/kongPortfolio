# 手动输入问答：Green故障修复版STG27通过，待第一审批

| 核对项 | 新候选 |
|---|---|
| 源码 | `78ac795344c46f39a97ec7bb4b843111b62d2f09` |
| 执行 | `c4801ece-4249-4e79-9732-4456d1272b76` |
| releaseId | `bfea6640ec45cc3e99ef4090d8fe476f11b63ce0fc80ae94b0f4b8229a2ade23` |
| 后端SHA-256 | `bc39c4cdad8be92cfcfcb86604c80f34ec3d5f505dad0d01829594b94fc79959` |
| AWS检查 | 前端76／后端61／Lambda5及实际ZIP运行通过 |
| STG | 27，实际Lambda摘要与同次候选及报告一致 |
| 生产 | live20／无权重，网页仍978a636／be998dc6…；alias／LATEST与本次预检相同，费用hash不变，health200／UP |

原33ecac8／16a8e52c…在Green22英文回答检查失败，未切流、未发布网页。原失败正文未留档，一次固定版本复现通过，不能断言具体句子或一定误报；检查未放宽。后来制品上传失败是未生成report.json的后续错误。不要直接重试已热的旧Green22作为冷启动验收。

修复为AI主题只传已校验快照中的相关原文：工作／项目／学习事实，保留项目归属，排除资料规则、个人网站部署说明和责任对照注释。当前6943→773码点，其他主题仍全文，S3资料版本及角色权限未变。AI任务采用工作、工具、学习三段，第三段结束。模型输入示例从约5500降至约1200 tokens，不改变判断范围的严格白名单。

Green主验证异常时保存passed=false安全报告，包含failedCheck／Green版本／已完成指标／当前调用usage和已知安全原因，不含回答正文、原始错误或私有资料。发布校验继续拒绝失败报告。该分支已本地测试，未额外注入云上失败。

STG27通过8项HTTP、三语拒绝（零模型tokens）、三语AI回答语言／来源／经历限制检查，70秒后追加转职未知及团队30服务归属通过。另三次私有AI样本复核通过，未见旧的所有权免责声明或个人网站历史段。只是小样本，不保证所有未来措辞；其他主题中的个人项目状态仍需要后续资料维护。没有独立公网STG页面，浏览器到真实STG模型E2E未运行。

按[项目约定](../AGENTS.md)“Production retains two AWS approval gates.”，本次停在第一关：

1. 在[AWS流水线](https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/kongportfolio-candidate/view?region=ap-northeast-1)选择 **c4801ece…**，确认源码 **78ac795**。
2. **ApproveProduction → ApproveGreenCreation → Review**：批准新Green发布、真实生产角色问答及冷启动检查；不会直接切流或发布网页。
3. Green成功后仍停在 **ApproveTrafficShift / ApproveBlueGreenDeployment**，第二审批才授权生产切流和同候选网页发布。助手未执行审批，不复用已失败或Stopped的旧执行。

新修复版STG与补查共8次生成，18,461输入／1,409输出tokens，按此前已核对单价估算$0.006478。另一次旧Green英文诊断5506入／260出；原失败Green3次生成未完整保留tokens，不能计成0。均未含税、CodeBuild／Lambda等费用，非账单。

证据：ignored `.local/green-failure-20261115/`和`.local/green-repair-release-20261115/`。原始资料和回答不入Git，文档HEAD不替代本次固定源码78ac795。[当日命令与验证边界](aws-commands-20261115.md)
