# 手动输入与直接回答：STG26已通过，待第一审批

| 核对项 | 当前候选 |
|---|---|
| 源码 | `33ecac8995bece730487def4b38f94b136afe117` |
| 执行 | `16a8e52c-95ad-4cc8-bdbb-fe5d87dfecca` |
| releaseId | `32543ecce51151e142c22e30c26c5d01ecf0582f8ece95035d18e6cca9386fa3` |
| 后端SHA-256 | `1eb856e072fcb97c11fd6f3e17b15b92a0b27ce91b616e4c014d7d3178e5117d` |
| AWS构建 | 前端76／后端58／Lambda5及真实ZIP运行通过 |
| STG | 26，实际Lambda摘要、候选和同次报告一致 |
| 当前生产 | live20／无权重，网页仍978a636／be998dc6…，health200／UP；费用状态hash不变 |

输入由下拉框改为多行手动输入，17个示例可填入后编辑，只有点击发送才提问。Java仍完整匹配审核问题及有限别名；不会因为开放输入就接受任意任务。详见[界面行为](bedrock-frontend.md)。

新STG门槛全部通过：8项HTTP，三语范围拒绝（不调用模型、0 tokens），三语AI经历回答的语言／来源说明／未经询问的AI责任限制检查；等70秒限流窗口后，转职原因缺失和团队30服务归属也通过。只有全部通过才暴露第一审批，报告仅保留指标。

补查三语AI回答共3次，核心风格复核未再见原“未独立负责生产服务”等免责声明，中文不再答成日语。**已知限制：个人项目上线状态仍有早期资料描述，需在后续资料维护增量中同步；部分回答仍会展开个人技术验证细节。本轮不保证所有措辞、事实或实时状态准确。** 原始私有回答不入Git，不能把模式检查等同全语义质量认证。没有独立公网STG网页，浏览器到STG模型E2E未运行。

本轮候选需遵守[项目约定](../AGENTS.md)“Production retains two AWS approval gates.”：

1. 在[AWS流水线](https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/kongportfolio-candidate/view?region=ap-northeast-1)选择执行16a8e52c…，确认源码33ecac8。
2. 第一关 **ApproveProduction → ApproveGreenCreation → Review**：批准将发布并验证生产Green，包含真实模型及冷启动测试；不会直接移动live或发布网页。
3. Green成功后仍需第二关 **ApproveTrafficShift → ApproveBlueGreenDeployment**，才授权实际CodeDeploy切流及同候选网页发布。助手未调用审批API。

历史：初版9de08b0／db9e6a63…基础合约通过，但追加语义复核失败。审批已前进到部署构建时，助手停止该精确执行与构建；仅20→20基线d-TE3HEELFM成功，没有新版本金丝雀或网页发布。旧执行Stopped及失败样本保留，不复用其审批。

计费报告：本次修正版STG5次生成＋3次私有复核；加已停止轮次STG／补查／Green，共19次生成、102,525输入／5,062输出tokens，按此前已核对单价估算$0.033047，不含税、CodeBuild／Lambda等，非账单总额。

证据：ignored `.local/typed-qa-release-20261114/`保留停止轮次，`.local/typed-qa-fix-release-20261114/`保存新run／report／final-inspection、私有样本及语义边界记录。文档提交不改变固定候选33ecac8，不能用后续docs HEAD代替该源码。命令见[第21–22节](aws-commands-20261114.md)。
