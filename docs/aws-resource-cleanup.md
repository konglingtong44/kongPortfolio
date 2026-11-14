# 2026-11-14 AWS 资源清理

后续状态补充：本记录清理结束时保留四个项目桶；此后简历方案新增[私有资料桶](bedrock-content.md)，当前五个项目桶。新桶属于使用中的资料存储，不在旧练习清理名单内；下方“四个”保留当时的验收口径。

用户授权：删除不用的 EFS、DNS、S3；随后明确选择“旧练习站和 2023 年 CloudTrail 历史日志全部清理”。只对逐项核对的资源执行删除，未使用通配符批量删除账号资源。

## 已删除

| 资源 | 核对证据与处理 |
|---|---|
| EFS `fs-0e39d17094efae58c`（test） | 2023 年创建、6144 字节；过去 14 天没有 ClientConnections>0；东京无 EC2/ECS/Batch 消费者，Lambda 无 EFS 配置。停用自动备份，删除 3 个挂载点、1 个访问点及文件系统；再次列举 EFS 已为空 |
| S3 `kong-s3` | 旧站源桶，删除前停用跨区复制与访问日志；删除 4 个对象版本后删桶 |
| S3 `s3-kong-replica` | 大阪旧站副本，删除 3 个对象版本后删桶 |
| S3 `s3-log-kong` | 旧站访问日志桶，删除 3684 个对象／标记版本后删桶 |
| S3 `aws-cloudtrail-logs-561798268037-4c43b622` | 所有已启用区域未发现现存 CloudTrail trail；仅有 2023 年记录，按用户追加授权删除 10 个对象版本后删桶 |
| CloudFront `E1B0T7MYZJI753` | 已禁用、无域名别名、仅指向旧 kong-s3，已删除 |
| CloudFront `E1LUMPY3CCJ918` | 无域名别名、仅指向旧大阪副本；禁用并等待状态 Deployed 后已删除 |
| DNS `testec2.konglingtong44.com` A | 别名指向的 kongalb 经 DescribeLoadBalancers 确认为不存在；仅删除该失效记录 |

再次全局列举 CloudFront 仅剩正式站 `E2NYEXSOAQ1TWE`，启用状态未改变。DNS 清理变更已 INSYNC。

## 保留

- Hosted Zone `konglingtong44.com`：正式站 A/AAAA 正在指向 `E2NYEXSOAQ1TWE`；保留 NS/SOA 和 ACM 验证 CNAME。DNS 查询是使用此解析产生的费用，没有独立“删除查询”资源；约 $0.50/月 zone 费用继续。
- S3 `kongportfolio-site-561798268037-ap-northeast-1`：正式网站发布文件。
- S3 `kongportfolio-artifacts-561798268037-ap-northeast-1`：CI/CD 发布制品、验证报告和回滚依据。
- S3 `kongportfolio-tfstate-561798268037-ap-northeast-1`：各 Terraform 栈状态，含本次 cost-control 独立 key。
- S3 `kongportfolio-cost-control-561798268037-ap-northeast-1`：关停／恢复配置快照。
- EFS 原有 AWS Backup 恢复点：没有一并删除备份或修改备份保留策略；文件系统自动备份已停用。其他 IAM、Cloud Map、CloudFormation 历史配置不在本轮删除范围。

对象删除清单、删除前配置和 EFS 连接证据保存在 ignored `.local`。不是数据备份；已删除对象无法依靠这些清单恢复。没有删除本地文件或当前项目的 S3 版本。

## 验证

- S3 全局列表只剩上述四个项目桶，EFS 列表为空。
- 正式网站 `https://konglingtong44.com` 首页 HTTP 200，`/api/health` HTTP 200、状态 UP。
- 费用控制只读 status／初始化成功，自动通知订阅为 0，未执行真实业务 off/on。
- prod/stg Lambda 并发仍分别为 5/1；费用控制最终真实 Terraform plan 为 No changes。
- 本轮没有改前后端代码；17 个 Python 本地状态／SDK 测试与 2 个 Terraform mock 测试通过。不能用这些测试代替云上关停演练。
