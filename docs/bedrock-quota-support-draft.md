# Bedrock 配额恢复请求草稿（未提交）

**后续11:43 JST已验证Qwen东京Mantle调用成功，当前保持不提交。** 若以后仍需修复Runtime Converse，必须把草稿限定为Runtime，并说明Mantle可用；不要以“整个Bedrock账号完全不可调用”为理由发送。

用户最新指示为先暂停，重查有额度的模型；不提交本草稿。[全量复查](bedrock-current-quotas.md)显示问题不止选中的Qwen，在线问答模型级配额普遍为0。若以后获授权提交，应将该新证据补入请求正文。

入口：[AWS Support 创建请求](https://console.aws.amazon.com/support/home#/case/create)。按控制台实际可用类别选择 Bedrock／服务配额相关支持；两个指标显示 Adjustable=false，不保证可从 Service Quotas 直接提交增加。以下内容只是一份可审查草稿，没有向 AWS 发送消息。

补充核查：只读 `aws support describe-services --language en --region us-east-1` 返回 `SubscriptionRequiredException`，因此当前账号不能通过这条Support API路径提交。**这不表示需要为本次请求购买付费支持。** [Basic Support也包括账号／账单及配额请求](https://docs.aws.amazon.com/awssupport/latest/user/aws-support-plans.html)，后续优先核对控制台的配额／账号支持入口，不升级套餐。提交消息等待用户明确授权；再次只读查询Qwen两个账号配额仍为0，没有重试推理。

Subject: Tokyo Bedrock Qwen3 235B A22B 2507 applied quotas dropped to zero; first bounded call throttled

```text
Region: ap-northeast-1 (Tokyo)
Account: 561798268037
Endpoint: bedrock-runtime.ap-northeast-1.amazonaws.com
Model ID: qwen.qwen3-235b-a22b-2507-v1:0

We are developing a low-traffic personal portfolio Q&A application using
reviewed resume/project facts. No production inference traffic has been enabled.

GetFoundationModel reports ACTIVE and ON_DEMAND. Model availability reports
AUTHORIZED, with region/entitlement/agreement AVAILABLE.

Both GetServiceQuota and ListServiceQuotas currently return applied ACCOUNT quotas:
- L-3875BCCF: tokens per minute = 0, Adjustable=false
- L-548A1A32: requests per minute = 0, Adjustable=false

An account-scoped snapshot from 2026-11-13 15:06 UTC (Nov 14 00:06 JST)
showed TPM 100,000,000 and RPM 10,000. A check on Nov 14 around 02:19 UTC
(11:19 JST) showed both at zero. The published default TPM is still positive.
We do not know why the applied allocation changed.

One diagnostic Converse request, with maxTokens=128 and automatic retries disabled,
returned HTTP 429 ThrottlingException:
"Too many tokens, please wait before trying again."
Request ID: 3ae65457-5c33-4700-943e-4213c2d2cded
No further inference retries were attempted.

Please investigate the zero applied allocation and advise how to restore
non-zero on-demand access. For initial development, a modest allocation such as
10 RPM and 10,000 combined TPM would be sufficient; we do not need dedicated
capacity or a large allocation. Please advise if another account-level prerequisite
must be completed. Monthly cost controls are enabled; application calls will be
bounded before deployment.
```

重新提交前应再次核对账号实际配额和错误时间；不要附带 SSO token、访问密钥、个人简历或完整本地配置。配额扩大不等于已经验证模型回答质量。
