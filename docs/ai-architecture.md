# 04 / AI 问答架构说明

2026-11-16，本地 Story；尚未发布本轮修改。

验收：03 后增加单个 04，复用流程连线、桌面悬停／键盘说明、手机浮动气泡；日中英说明调用、资料、权限、模型、输入输出、限流与备选费用。01 的 Bedrock 改为已上线，详情提供跳到 04 的按钮。

内容以当前 Java／Terraform 和[生产25发布记录](bedrock-qa-panel-release.md)为依据：CloudFront → HTTP API → Lambda → 固定版本私有 S3 → SigV4／Mantle Qwen → Java JSON 校验 → React；不发送历史、不写回资料。实例限额不等于全站配额，预算关停不等于硬账单上限，语义拒绝仍计模型费用。

价格于当日读取 [AWS 东京价格文件](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/ap-northeast-1/index.json)（publicationDate 2026-11-11），使用 Mantle Standard SKU；文件单价以 1K tokens 表示，页面换算为百万。六个候选统一假设每次6,000输入／500输出：235B $2.150、32B $1.445、Next 80B $1.728、Coder 30B $1.445、Coder 480B $4.330、VL 235B $5.450／千次。不是模型质量排名或账户可用性声明。

额外分类调用与 [Guardrails](https://aws.amazon.com/bedrock/pricing/)明确标出用量假设；RAG列出模型部分及与当前费用的差额，Embedding／存储／查询总额须待选定后端再算。所有模型估算排除其他AWS服务及税。

验证：前端81项与构建、后端41项verify通过；Chrome 1366px与WebKit 390／320px × 三语共9组，本地资料接口样例，检查01跳转、04表格、手机气泡与无弹窗横向溢出，未产生模型POST。已查看桌面、手机气泡和费用截图。证据在ignored `.local/ai-map/`。Gitleaks源码扫描通过。

未部署AWS，未重新调用真实模型，未验证iPhone真机；后端及基础设施未修改。

同日本地修订：删除01–04地图的操作提示及04的位置介绍；删除Runtime／Converse、Other Qwen Models节点和连线，保留模型价格表。11个AI节点改用三语短标题，气泡与正文按实际处理步骤说明。AI格子移除重复状态行、调整内边距，长气泡可滚动。

修订验证：前端81项、生产构建通过；重新运行上述9组浏览器检查，逐个核对11个节点的标题／摘要边界（共99个格子，均未越界），跳转、气泡、表格通过，模型POST为0。已查看中文完整流程图和320px气泡截图；未启动或停止用户的开发服务。

第二次修订：04去掉已移除词语的定义，直接说明名额补充、审核资料读取与内容核对；额外检查移到左侧、RAG移到右侧，两条虚线分开。01／02重写服务职责、请求与文件传递、审批含义；03精简内部字段名，保留停止、回滚、重新发布的不同条件及验证边界。兼容性说明改为具体风险和处理方法。

本次验证：前端81项、构建通过；三语 × Chrome1366px／WebKit390px／320px，覆盖01–04及03全部场景，文字边界、气泡和表格通过，模型POST为0。使用独立4174构建预览，避免已有5173服务返回旧内容；证据在ignored `.local/architecture-review/`。仅本地验证，未部署或验证iPhone真机。

后续修订：图中文字删去强调多语言的描述；资料节点只说明JSON打包与读取。04新增知识库费用比较，模型调用及语言功能不变。

2026-11-16只读价格核对：[OpenSearch官方说明](https://aws.amazon.com/opensearch-service/pricing/)区分Classic与NextGen；[东京价格文件](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonES/current/ap-northeast-1/index.json)中IndexingOCU、SearchOCU均$0.334/OCU-hour。首个独立Classic向量配置、730小时：开发测试0.5＋0.5 OCU为$243.82/月，带冗余1＋1为$487.64/月，仅计算费。加假设的Qwen $1.07后为$244.89／$488.71，另有保存、Embedding等。NextGen空闲10分钟后可缩0，不套用Classic最低月费。

[东京S3价格文件](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/ap-northeast-1/index.json)：Vectors保存$0.066/GB-month、查询请求$0.0027/千次，处理／返回／写入数据另计。[Bedrock托管知识库公开列价](https://aws.amazon.com/bedrock/pricing/)：原始数据$5/GB-month、标准检索$1/千次，管理模型的解析／Embedding／重排序已含；示例1GB＋千次为$6加回答模型。东京采用条件未验证，不代表已接入或已创建资源。

本轮前端81项、构建、秘密扫描通过；重新检查9组浏览器的RAG价格、气泡、格子边界、手机布局，已查看RAG桌面／320px截图，模型POST为0。原本地5173／8080仍为200／UP。未部署AWS。
