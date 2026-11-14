# 新问答候选：Green通过，等待第二道生产审批（2026-11-14）

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
| 生产流量 | live18的版本／RevisionId／权重不变；health200／UP，费用状态hash不变；新网页未发布 |

三次模型生成报告合计15,583输入／874输出tokens，按已核对东京Mantle单价估算$0.005134，未含税及CodeBuild／Lambda等费用，非账单。仅小样本，不保证所有回答零幻觉。新界面已进入候选并完成前端测试；没有公网STG网页，本轮不宣称浏览器到STG模型的真实E2E已完成，生产网页也未更新。

第一审批已由用户在控制台完成，AWS Green构建`kongportfolio-green:e542f5cf-2e0f-43cd-b4be-9c086bf3475d`成功。新增3次模型生成，15,583输入／848输出tokens，按同一已核对单价估算$0.00510629，另计税与其他AWS费用。报告只有检查指标，不含回答正文。仅小样本和一次冷启动，不保证所有请求时延或零幻觉。

按[项目约定](../AGENTS.md)“Production retains two AWS approval gates.”，现在停在第二道；助手未调用审批API：

1. 打开[AWS流水线](https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/kongportfolio-candidate/view?region=ap-northeast-1)，确认本次执行和源码，勿选择已Stopped的旧6c2aa1d9执行。
2. 确认`VerifyGreen`成功，进入 **ApproveTrafficShift → ApproveBlueGreenDeployment → Review**，核对Blue18、Green20及源码978a636。
3. 当前`ReleaseMode=deploy`。批准会让CodeDeploy先向Green20分配10%流量、观察5分钟，再完成100%切换；现有错误告警／自动回滚保护保留。后端部署成功后，流水线会将同一候选前端发布至S3／CloudFront并校验公开页面。**这是实际生产切流和网页发布授权**，不是额外的隔离测试。

Green已通过，第二审批可供用户审查；目前没有DeployProduction或PublishFrontend动作。审批后仍需监控CodeDeploy和前端发布结果，不能先记作上线成功。本次文档提交不改变固定候选源码；文档HEAD可能不同，请以执行中的源码SHA为准。

证据：ignored `.local/bedrock-release-20261114/` 的before／run／progress／report／final-verification，以及green-build／green-report／green-verification和green.log。命令见[第18–19节](aws-commands-20261114.md)。
