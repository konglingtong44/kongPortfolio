# 问答版本978a636：两道人审及生产发布完成（2026-11-14）

22:14 JST只读复核：执行61bcc02c…所有阶段Succeeded，CodeDeploy `d-S2M745KFM`部署成功，live20／无附加流量权重；同候选S3／CloudFront发布报告passed，公开`version.json`对应978a636／be998dc6…，health200／UP。报告记录了18→20的10%观察及最终切换；助手本轮没有执行审批或发布操作。

用户随后提出手动输入和回答风格修改，已提交新源码33ecac8并通过STG26，当前待新执行第一审批；见[本次候选](bedrock-typed-release.md)。下面保留本次原候选的测试及审批历史；它不能作为新输入框版本的发布验收。

| 核对项 | 本次结果 |
|---|---|
| 执行 | `61bcc02c-2138-44fd-9a9e-ed78443f6851` |
| 源码 | `978a636dd9029cfdebec9d43ce4cf50a1b1ff7c9`，练习分支feat/aws-serverless-ci |
| 候选release | `be998dc666b8d709c4a2638d9a6da92669f1149146d02a6035dbfa239dd7612a` |
| 后端SHA-256 | `b1f8af77d8109997c591efc90f443cbda957a91da0db4f63f5cea4e06178ce75` |
| STG | 版本24，实际代码hash与本次候选一致 |
| AWS构建 | 前端73／后端58／Lambda5项及实际ZIP运行通过 |
| STG问答 | 8项HTTP合约，三语正常回答＋三语零token拒绝通过 |
| 云端补查 | 两种非规范路径400；三语目录各17项，均no-store，无额外模型生成 |
| Green | 生产角色版本20通过8项HTTP及三语回答／三语零token拒绝，代码hash与候选一致 |
| 冷问答 | 首条日语请求观察到冷启动：初始化4722.55ms＋执行6360.09ms＝11082.64ms，低于28秒 |
| Green验收时生产流量 | 当时live18的版本／RevisionId／权重及费用状态hash不变；后续第二审批后已切至20并发布网页 |

三次模型生成报告合计15,583输入／874输出tokens，按已核对东京Mantle单价估算$0.005134，未含税及CodeBuild／Lambda等费用，非账单。仅小样本，不保证所有回答零幻觉。新界面已进入候选并完成前端测试；没有公网STG网页，本轮不宣称浏览器到STG模型的真实E2E已完成，生产网页也未更新。

第一审批已由用户在控制台完成，AWS Green构建`kongportfolio-green:e542f5cf-2e0f-43cd-b4be-9c086bf3475d`成功。新增3次模型生成，15,583输入／848输出tokens，按同一已核对单价估算$0.00510629，另计税与其他AWS费用。报告只有检查指标，不含回答正文。仅小样本和一次冷启动，不保证所有请求时延或零幻觉。

按[项目约定](../AGENTS.md)“Production retains two AWS approval gates.”，本次两道人审均成功，助手未调用审批API。原第二审批授权内容为：

1. 在[AWS流水线](https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/kongportfolio-candidate/view?region=ap-northeast-1)核对执行和源码，第一审批发布并测试Green20。
2. 第二审批`ApproveTrafficShift / ApproveBlueGreenDeployment`核对Blue18、Green20及源码978a636。
3. `ReleaseMode=deploy`授权CodeDeploy先向Green20分配10%流量、观察5分钟，再完成100%切换；现有错误告警／自动回滚保护保留。后端成功后发布同候选前端至S3／CloudFront并校验公开页面。**上述动作现已完成**。

后续新输入框／提示词必须使用新的源码和执行，重新构建、验收及两道人审；不要重放已经完成的61bcc02c…执行，也不能复用其审批。本次本地提示词未做新真实模型验证；公开版本核对只证明原978a636已发布，不代表新输入方式已上线。

证据：ignored `.local/bedrock-release-20261114/` 的before／run／progress／report／final-verification，以及green-build／green-report／green-verification和green.log。命令见[第18–19节](aws-commands-20261114.md)。

发布后只读证据：`.local/typed-qa-browser/{baseline,DeployProduction-baseline-report,PublishFrontend-baseline-report}.json`；本次修改见[前端说明](bedrock-frontend.md)和[命令第20节](aws-commands-20261114.md)。没有浏览器到真实模型的新E2E记录。
