# 东京账号配额实时重查：2026-11-14 11:33 JST

**11:43 JST更正：本页“没有可用问答模型”的概括过度。Qwen在同账号东京Mantle Chat Completions真实调用成功（HTTP200、13输入+2输出tokens）。本页记录的Runtime零配额仍属实；没有列出的Qwen Mantle配额不能当成0。详情见[双入口证据](bedrock-access.md)。**

用户要求暂缓Support提交，先重新列出有额度的模型。本轮只读，账号561798268037、区域ap-northeast-1；未做推理、订阅、配额变更或部署。

**本次Service Quotas查询没有列出正数的在线问答TPM/RPM。** 这只能描述公开的配额记录，不能据此宣称所有入口都无法使用。

实际查询870个已应用账号配额、81个东京模型目录条目、50个推理配置文件。原始结果在ignored `.local/bedrock-current-quota-audit.json`，脚本为`.local/read_current_bedrock.py`，使用SDK ListServiceQuotas分页、ListFoundationModels、ListInferenceProfiles分页；先通过STS核账号。

| 配额类别 | 条目数 | 正数条目 |
|---|---:|---:|
| 区域内TPM | 51 | 0 |
| 区域内RPM | 55 | 0 |
| Geo跨区域TPM | 18 | 0 |
| Geo跨区域RPM | 10 | 0 |
| 全球跨区域TPM | 33 | 0 |
| 全球跨区域RPM | 11 | 0 |
| Mantle输入TPM | 4 | 0 |
| Mantle输出TPM | 4 | 0 |

Qwen 32B、235B A22B 2507、Next 80B、VL 235B、Coder 30B、Coder 480B的Runtime对应TPM/RPM全部为0。Mantle这8条仅涉及4个其他型号，不含Qwen；不能把“未公开Qwen Mantle指标”误读为“Qwen Mantle配额0”。

仍有两条模型并发配额为正：

| 型号 | 正数配额 | 精确版本检查 |
|---|---:|---|
| Amazon Nova Reel 1.0 | 并发10，L-BD0D28A0 | GetFoundationModel：ResourceNotFoundException，版本已EOL |
| Amazon Nova Sonic 1.0 | 并发20，L-FC3AC7EE | GetFoundationModel：ResourceNotFoundException，版本已EOL |

两者GetFoundationModelAvailability仍返回AVAILABLE，因此**只查授权和配额还不够**；不能把已退役版本列作可用。它们也不能替代文字简历问答。目录中的Nova **2** Sonic并发为0，不能借用Nova Sonic **1**的20。

其他正数包括Cross-Model Max Tokens Per Day=150,000,000，以及检索、Guardrails、批任务数量等服务功能配额；它们不等于任何具体模型具备在线问答容量。870条中625条为正不能解释成625个可用模型。

额外实际CLI：两个旧型号的GetFoundationModel／GetFoundationModelAvailability、两个并发指标GetServiceQuota。没有因为跨模型每日总额度为正而重复调用Qwen；前一轮一次真实Qwen调用429的证据仍有效。

之前价格／配额工作簿保留其凌晨快照时间，不能用作当前额度。尚未查其他AWS区域，未将模型迁移到其他区域。
