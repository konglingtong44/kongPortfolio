# 手动输入问答修复：已发布生产23

**AWS新候选，尚未发布：** 源码b8ca8b0／执行7e728e3d-42fb-4043-acf8-1c2f0b47c20f通过AWS构建及STG30：8HTTP、三语回答／拒绝与4条自然问法／事实展示全部通过，正在第一审批。生产live23／无权重、公开76f04a8／release96f5109b…及health200／UP未变，费用state hash未变；没有新Green／切流／前端发布。 语义判断替代严格问句匹配，18项仅示例，拒绝也计tokens。旧生产23／773码点等描述保留为历史；当前以[自然问答候选](bedrock-natural-questions.md)为准。

新自然问答首轮163c270／c1a531aa通过AWS构建，STG29技能中文假名检查失败，未到任何生产审批。各语言提示及安全STG失败报告已修复，本机6样本通过，准备新候选；不会重试同一旧版本冒充修复。当前以[自然问答进展](bedrock-natural-questions.md)为准。

| 核对项 | 实际成功执行 |
|---|---|
| 执行 | `530833d0-8539-4c94-a71c-fc8b9b210d30`，所有阶段Succeeded |
| 源码 | `76f04a816f35c74a754422feb3809a7c1f353d5c`；应用代码与78ac795一致，仅Markdown不同 |
| releaseId | `96f5109b01bc947421118c96dcd8082e309274cc85a897052dbdec77112aab2e` |
| 后端SHA-256 | `22352c625e146eb0de42060fb66bcf4d0123ee153ea53892cb79e14fa1bf12cf` |
| STG／Green／live | 28／23／23，无附加流量权重 |
| Green冷问答 | 初始化3710.62ms＋执行4447.76ms＝8158.38ms |
| 部署 | `d-UBZGH91GM`，20→23金丝雀发布成功 |
| 网页／接口 | 公开version匹配同次候选，health200／UP，三语问题目录各17项 |

用户告知OK后只读核查：原c4801ece…在第一审批被拒绝，没有继续运行；另一个执行530833d0…已用分支最新源码76f04a8完成构建、STG、两道人审、Green、CodeDeploy及前端发布。助手没有代发审批或启动此执行，后续检查均只读，不应再按旧c4801ece等待审批。

同次StagingReport／GreenReport／DeploymentReport／FrontendReport均passed，execution／源码／release一致。Green三语AI回答、三语零token拒绝和8项HTTP通过，真实生产执行角色及首条冷启动通过；发布检查包含不可变制品、路由和公开HTML／version／资源／API。公开网页已更新为可自行输入的问题框，示例可填入编辑。没有新增浏览器交互或iPhone真机检查，不把已有本地15组模拟证据当作新生产浏览器E2E。

本次保留严格审核问句／有限别名，未识别问法仍可能拒绝。AI经历主题只带相关原文与项目归属，当前6943→773码点；其他主题仍全文，资料版本未变。AI三段表达、原语言／来源／经历限制检查和安全失败报告保留；不保证所有未来模型措辞，其他主题的个人项目状态仍需后续同步资料快照。

历史：33ecac8的Green22英文回答检查失败，未切流；一次复现通过不能证明原句误报。78ac795修复候选通过STG27，但其c4801ece审批被拒绝；最终实际发布身份以本页76f04a8／530833d0为准。失败记录和此前代码／文档候选证据保留，不重试旧Green冒充新冷验收。

证据：ignored `.local/accepted-repair-release-20261115/` 的四份同次报告和verification.json。资料／原始回答未入Git；只读复核没有模型生成、Terraform／IAM／S3资料更新、SNS或off/on。[当日命令与发布复核](aws-commands-20261115.md)
