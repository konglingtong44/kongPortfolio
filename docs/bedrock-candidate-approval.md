# 新问答候选：等待第一道生产审批（2026-11-14）

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
| 生产 | live18不变，LATEST配置和已发布版本列表不变，health200／UP，费用状态hash不变 |

三次模型生成报告合计15,583输入／874输出tokens，按已核对东京Mantle单价估算$0.005134，未含税及CodeBuild／Lambda等费用，非账单。仅小样本，不保证所有回答零幻觉。新界面已进入候选并完成前端测试；没有公网STG网页，本轮不宣称浏览器到STG模型的真实E2E已完成，生产网页也未更新。

按[项目约定](../AGENTS.md)“Production retains two AWS approval gates.”，本次停在第一道，未执行任何批准操作：

1. 打开[AWS流水线](https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/kongportfolio-candidate/view?region=ap-northeast-1)，确认本次执行和源码，勿选择已Stopped的旧6c2aa1d9执行。
2. 进入 **ApproveProduction → ApproveGreenCreation → Review**，审查并批准。
3. 批准只授权发布本次后端候选为生产Green，并运行生产角色真实问答／冷启动验证（预计3次模型生成＋3次固定拒绝）。live仍18，不发布网页、不切流；通过后还会停在 **ApproveTrafficShift**，需要第二次人工审批。

前置检查均已完成，第一审批可供用户审查；生产Green的真实模型调用及冷记录目前仍未执行。审批后不能跳过Green失败，亦不能复用旧审批。本次文档补录提交不改变已固定的候选源码；后续文档HEAD可能不同，请以执行中的源码SHA为准。

证据：ignored `.local/bedrock-release-20261114/` 的before／run／progress／report／final-verification及AWS构建日志。命令见[第18节](aws-commands-20261114.md)。
