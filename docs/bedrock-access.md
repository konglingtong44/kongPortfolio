# 28. Bedrock 模型选择与访问配置

本 Story：验证选定Qwen的东京可用性。**最新更正：2026-11-14 11:43 JST，同账号／东京／Qwen通过Mantle Chat Completions真实调用HTTP200，回答OK，13输入+2输出tokens。此前“没有可用模型”的结论范围过大；Runtime Converse仍是429证据，两入口不能混推。**

## 模型与调用方式

| 项目 | 本次选择 |
|---|---|
| 模型 | Qwen3 235B A22B 2507；Mantle ID=`qwen.qwen3-235b-a22b-2507` |
| 区域 | `ap-northeast-1`（东京），直接调用区域模型 |
| API | 已验证Mantle非流式Chat Completions及Java短调用；原Runtime Converse受阻，云端应用尚未接入 |
| 身份 | STG/PROD 各自的 Lambda 执行角色；本地使用 SSO，前端不持有凭证 |
| 计费 | 按需 token；不创建预置吞吐、知识库或向量数据库 |

用户选择：根据审核过的简历与经历回答问题，支持长回答；最新改为[严格白名单](bedrock-scope.md)，仅接受本人相关的审核问句，不提供一般算法／数学解题或代码生成。选择指令模型，不进行微调；后端传入审核过的文本和固定问题模板，访客聊天不写回资料。模型效果与“不编造经历”仍需后续测试，不能凭参数规模保证。

截至 2026-11-14，[官方模型卡](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-qwen-qwen3-235b-a22b-2507.html)列出东京区域内推理、Converse、文本输入、256K 上下文／8K 最大输出。仍以账号实际权限和配额为准；不自动切换模型、区域或 endpoint。

## 两个入口的真实证据

11:43 JST用同一SSO身份，以SigV4 service=`bedrock-mantle`签名HTTP请求，未创建API key：

- `GET https://bedrock-mantle.ap-northeast-1.api.aws/v1/models`：200，列出41个模型，含选中的Qwen；列表存在不等于已逐个实际调用。
- `POST /v1/chat/completions`：模型`qwen.qwen3-235b-a22b-2507`，输入“Reply with only OK.”，max_tokens=16、temperature=0.1，无重试；200，回答OK，usage=13+2=15 tokens。
- 请求ID `req_dhte52v5cqfii6wpnptnz3kkwva2oleopovs3fkovqjinvxjwd7a`，约0.214秒；原始证据ignored `.local/qwen-mantle-smoke-20261114.json`，实际脚本`.local/qwen_mantle_smoke.py`。

[AWS官方说明](https://docs.aws.amazon.com/bedrock/latest/userguide/scaling-throughput-best-practices.html)：Runtime按模型token配额，Mantle配额独立；部分Mantle模型没有在Service Quotas公开每账号TPM，仍受内部容量／限流约束。没有公开Qwen Mantle配额不能推断为0；Serverless也不表示没有限流。

以下为原Runtime路径的11:19 JST证据，保留而不伪改为成功：

| 检查 | 2026-11-14 11:19 JST 结果 |
|---|---|
| 精确版本 | ACTIVE、ON_DEMAND |
| 授权／区域／权益／协议 | AUTHORIZED／AVAILABLE |
| 账号 TPM，`L-3875BCCF` | **0**，Adjustable=false |
| 账号 RPM，`L-548A1A32` | **0**，Adjustable=false |
| 公开默认 TPM | 100,000,000，不能代替账号实际值 |
| 一次 Converse | HTTP 429，ThrottlingException，Too many tokens, please wait before trying again. |

凌晨 00:06 JST 的账号快照为 TPM=100,000,000、RPM=10,000，带本账号 QuotaArn；此次 GetServiceQuota 和 ListServiceQuotas 都为 0。不能据此确定变化原因。[AWS 说明账号配额可能调整且低于公开默认值](https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html)。

唯一诊断调用：128 输出 tokens 上限、temperature=0.1、一次尝试且无自动重试，仅用虚构连通性资料询问缺失技能应如何回答，没有上传个人简历。未产生模型回答／usage；错误 request ID `3ae65457-5c33-4700-943e-4213c2d2cded`。原始证据保存在 ignored `.local/qwen-runtime-smoke-20261114.json`。IAM 权限尚未给 Lambda apply，在线 API 仍为 PREPARING。

Runtime零配额若要继续用Converse，需另行核对恢复；[支持请求草稿](bedrock-quota-support-draft.md)尚未提交，用户已要求暂缓。可保留Qwen选型；Mantle Java本地接入、IAM草稿和费用开关覆盖已经完成，后续审查STG授权／配置及发布，无需把恢复Runtime作为所有接入路径的前提。

最新只读复查两项仍为0；Support DescribeServices API返回SubscriptionRequiredException，后续改核控制台配额／账号支持入口。没有购买支持套餐或发送支持消息；Basic支持本身包含配额请求，API限制与模型配额是两个不同限制。

后续按用户要求暂缓Support提交并[重查全部东京账号配额](bedrock-current-quotas.md)：Runtime在线配额及已列出的少数Mantle配额为0；并不能覆盖没有公开Mantle配额的Qwen。旧版语音／视频模型EOL结论不变。

## Runtime只读检查（不是Mantle可用性判定）

在仓库根目录运行：

```powershell
# 仅在 SSO 过期时登录
aws sso login --profile kong-dev
./scripts/check-bedrock-access.ps1 -ExpectedAccountId 561798268037
```

脚本核对账号、精确版本 ACTIVE/ON_DEMAND、访问状态，再读取两个 **GetServiceQuota 账号实际值**；零配额直接失败。此脚本不发送推理、不订阅、不接受协议、不改 IAM；通过也不能代替 Lambda 权限和真实调用。当前运行应明确报 zero applied account quota。

当前Qwen访问已返回agreement/entitlement AVAILABLE；后续Mantle短调用也成功，未做额外订阅、条款或市场部署操作。访问流程详见[官方说明](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)。

## Mantle权限准备及下一步边界

**2026-11-14 已完成接入前的权限准备；后续Java本地实现见[第29节](bedrock-java.md)，云端未启用。** 按[官方IAM说明](https://docs.aws.amazon.com/service-authorization/latest/reference/list_bedrock-mantle.html)，Mantle使用独立的`bedrock-mantle:CreateInference`，资源是project，不是Runtime的foundation-model ARN。通过签名GET `/v1/organization/projects`确认本账号东京已有`default`项目，没有创建新项目或API key。

- PROD root `infra/terraform/portfolio`：`enable_bedrock_access = false`（默认）。
- STG root `infra/terraform/cicd`：`enable_staging_bedrock_access = false`（默认）；启用时必须已有 `enable_staging = true`。
- 每个开关只新增对应 Lambda 执行角色的 `qwen-235b-mantle-tokyo-only` inline policy：Action=`bedrock-mantle:CreateInference`，Resource=`arn:aws:bedrock-mantle:ap-northeast-1:561798268037:project/default`，`StringEquals`条件`bedrock-mantle:Model=qwen.qwen3-235b-a22b-2507`。
- 不授予项目创建、上传文件、模型列表或CI构建角色权限。CreateInference本身同时覆盖流式及非流式，后续由应用明确使用非流式，不能宣称此IAM策略禁用了流式。
- 真实IAM `SimulateCustomPolicy`八项通过：指定模型／项目allowed；其他模型、项目、区域、账号及缺模型条件implicitDeny；叠加费用Deny后Runtime与Mantle均explicitDeny。模拟不等于业务角色实际调用成功，两根栈均未apply模型授权。

费用控制Lambda已通过Terraform单项更新部署：后续关停策略同时Deny `bedrock:*`和`bedrock-mantle:*`，Resource=`*`，仍只写入指定PROD/STG角色。离线SDK接口测试确认策略生成，真实IAM模拟确认拒绝。本轮没有再次停站演练；网站保持on、并发5/1、CloudFront Enabled/Deployed，首页及health均200/UP。管理员SSO与其他角色不受该角色策略限制。

这次只准备配置，默认开关保持关闭。后续先审查 STG 的启用计划，再实施；PROD 单独审查。使用原有 ignored tfvars，不覆盖其他 CI/CD 开关。两道生产审批及 live 别名所有权不变；应用环境变量留到第 29 节。

## 费用与后续边界

[官方价格页](https://aws.amazon.com/bedrock/pricing/)需按东京、Qwen3 235B A22B 2507、标准按需模式确认。模型费计算：`输入 tokens / 1,000,000 × 输入每百万单价 + 输出 tokens / 1,000,000 × 输出每百万单价`；另计 Lambda/API/日志。已有 $5/$10/$15/$25 月度关停保护，预算延迟不能视作硬额度。

两个入口诊断分别为Runtime429、Mantle200；随后Java客户端也通过SSO短调用成功，均不证明简历问答质量。[Mantle Standard专用价格](bedrock-java.md)已单独核对，输入$0.27／百万、输出$1.06／百万tokens。Java已在本地实现逐请求限制及资料规则，尚未部署，完整简历与STG验证待后续。

验证记录见 [AWS_EXECUTION_LOG.md](../AWS_EXECUTION_LOG.md) 第31.3／31.4节。未记录通过的账号检查、IAM apply、模型调用都视为未完成。
