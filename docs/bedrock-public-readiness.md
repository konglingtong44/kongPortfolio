# 问答公开入口检查（2026-11-14，尚未开放生产）

验收：核对入口、调用限制及费用关停，最小修补后验证。**网关专用限流已部署；生产权限／参数已准备至$LATEST，规范路径修复已在STG24实测，访客问答仍关闭。** [生产配置记录](bedrock-production-config.md)、[新候选](bedrock-candidate-approval.md)

| 项目 | 云端核对／本地变更 | 边界 |
|---|---|---|
| HTTP API | 两条ANY路由保留默认1请求/秒、突发5，另有专用问答POST路由 | execute-api也公开，不是CloudFront独占入口 |
| 专用限流 | 已apply `POST /api/bedrock`目标0.1请求/秒、突发1；1新增／1更新，其他默认值不变 | 两入口均观察到429，部分小批次仍全200，不是严格每分钟6次 |
| 规范路径 | STG24只接受原始URI `/api/bedrock`，路径参数与编码变体实测400 | 生产live18尚未部署新代码，模型仍关闭 |
| Lambda | PROD并发5、STG并发1，各28秒，无Function URL | 所有版本与别名共享，健康／资料／问答共用，不是每人限额 |
| Java | 每实例1在途、滑动6次/分钟、60次/小时；失败和拒绝也占次数 | 多实例／重启改变合计，不是全站60次/小时；无自动模型重试 |
| 输入／资料 | 8KiB请求体、1000问题码点、资料20,000码点／80KiB、固定版本＋hash | 严格白名单，访客原文不进入模型、不写回资料 |
| 推理 | STG1024／20秒；Green20为1024／15秒，固定东京Qwen Standard | S3另有4秒预算；真实首条冷问答合计11.08秒通过，仅单次样本 |
| 缓存 | CloudFront两条API行为TTL均0，允许POST；两入口health200／no-store | 前端按钮或CORS不能阻止直接请求 |
| 费用保护 | mode=on、consumed=[5,10,15]，下一档25；预算已报告$19.021 | 数据非实时；四预算→对应SNS→控制器核对，无新通知／off-on演练 |
| 关停权限 | 部署控制器与源码字节相同，Deny含Runtime／Mantle；IAM模拟通过 | 仅能改两个业务角色，对无关角色implicitDeny，不限制管理员SSO |
| 生产状态 | live18环境仍关闭，Green20已发布并通过真实角色验收，等待第二人审；并发未改 | 新执行61bcc02c…第二审批后才切流／发布前端；旧执行Stopped不能复用 |

实际复现：修复前路径参数写法进入mock模型服务并返回200；规范URI检查后，7种路径变体不再调用服务，正常路径保持可用。后端58项、Lambda 5项、实际ZIP（含路径拒绝）、portfolio Terraform 6项及Node发布保护合约通过，无真实模型调用。Lambda适配器确认保留原始路径；本地验证不能替代新版本云端验收。

网关限流是[尽力执行的目标](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html)，[保留并发作用于函数所有版本](https://docs.aws.amazon.com/lambda/latest/api/API_PutFunctionConcurrency.html)，Budgets依赖[延迟更新的账单数据](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)。均不是即时费用硬上限。目前没有跨实例持久化次数／token账本、登录／验证码、WAF或CloudFront独占源站校验，未把它们记为已实现。精确全站次数需要另做共享计数并评估费用。

20:07 JST后续部署验收：直连API及CloudFront均以空POST观察到真实429，普通日语资料接口200，两个入口health200／no-store；访问日志17/17核对到专用POST路由，含CloudFront的429。初始CloudFront两批8条均200，有限补测用同一连接的首条即429；共执行21个空POST（含首次检查器出错前的4条），没有生成模型回答。不能从这些小样本推导精确放行比例。Terraform最终No changes，PROD/STG代码／环境／并发和费用状态hash与部署前相同。

本轮重新核对时，旧候选实际已Stopped；第一审批于19:05成功、Green于19:06成功，本轮没有启动流水线或执行审批，也没有切流。此前“仍等第一审批”的描述仅适用于18:58核对时点，最新状态以此处为准。

后续已完成[生产角色和$LATEST配置](bedrock-production-config.md)，配置准备未发布版本。新源码978a636已完成AWS构建及STG24验收，用户第一审批后由流水线发布Green20并通过真实生产角色三语问答／拒绝、冷请求和接口检查。现在等待第二审批，live仍18、网页未发布；不能把Green通过当作问答已公开上线。第二审批将授权实际切流及同候选前端发布，见[审批说明](bedrock-candidate-approval.md)。

证据：前期ignored `.local/bedrock-public-{audit,cost-verification,http-verification,plan-review}.json`；后续部署`.local/bedrock-throttle-deploy/`中的before／plan-review／verification／pipeline-status／route-diagnosis及plan／apply／final-plan日志。命令见[第15–16节](aws-commands-20261114.md)。后续仅apply网关两项，未commit/push、SNS投递、关停、模型生成或生产代码发布。
