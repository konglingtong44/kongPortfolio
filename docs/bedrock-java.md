# 29. 有界Java问答（生产20已发布，风格改版本地完成）

2026-11-14最新：源码978a636／执行61bcc02c…已完成两道人审和生产切流，live20／同候选网页发布成功。本轮新增“不主动提资料读取、不追加未经询问的经历限制、中文简体”的系统提示及主题措辞，拒绝提示适配自由输入；未改事实、白名单匹配或模型权限。后端58项通过，后续33ecac8的STG26已通过语言／来源／AI限制自动检查、转职未知及团队归属；三语追加样本核心风格通过，个人项目历史状态仍需更新资料快照。生产20尚未更新，见[新候选](bedrock-typed-release.md)。下文STG／生产准备状态描述为此前阶段记录，最新发布见[发布记录](bedrock-candidate-approval.md)。

验收：默认关闭；只调用东京Qwen Mantle Standard；通过角色／SSO临时凭证签名；输入、输出、耗时和调用频率有上限；仅审核问句完整匹配后读取资料并使用固定模板，访客原文不传模型、不写回资料。最新[严格问答范围](bedrock-scope.md)覆盖早先允许通用算法／数学问答的设想。

## 价格核对：2026-11-14

重新下载[AWS东京公开价格文件](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/ap-northeast-1/index.json)，publicationDate=`2026-11-11T01:30:37Z`。精确匹配`model=Qwen3 235B A22B 2507`及`qwen.qwen3-235b-a22b-2507-mantle-*-standard`，没有用Runtime、VL型号、Flex或Batch代替。

| Mantle Standard | 每1,000 tokens | 每百万tokens |
|---|---:|---:|
| 输入 | $0.00027 | $0.27 |
| 输出 | $0.00106 | $1.06 |

每次8,000输入＋2,000输出，1,000次约$4.28；每次2,000输入＋500输出，1,000次约$1.07。每次带入的规则／资料也计输入，非固定“每次收费”；未含税、Lambda/API/日志及重复请求。应用固定`service_tier=default`，不请求Priority。已部署预算保护有延迟，不是硬性费用上限。

原始价格证据ignored `.local/qwen-current-price-verification.json`。该文件保留宽搜索匹配，最终人工／脚本精确筛选上述模型与standard条目；其他235型号或SKU巧合不参与报价。

## 接口与限制

后续[公开入口检查](bedrock-public-readiness.md)已部署问答专用网关限流，并在两个入口以空请求观察到429；Java规范URI检查已在STG24实测两种变体400，并随978a636发布至生产20；本地7种路径测试、AWS后端58项／Lambda 5项与ZIP验证通过。

[前端消费接口](bedrock-frontend.md)原下拉框已随978a636发布；本轮改为手动输入及可填入示例，尚未发布。模拟浏览器检查不作为新一轮真实模型调用证据。

`POST /api/bedrock`：关闭时，以及空请求探测时，返回`200 {"status":"PREPARING"}`，不调用模型。启用后发送`Content-Type: application/json`：

```json
{"message":"请介绍你的项目架构。","language":"zh"}
```

只接受`message`和`language`两个字段；语言为ja/zh/en。成功返回status=ANSWER、answer、truncated及usage。回答作为文本使用；未来前端不可直接当作HTML渲染。

新增`GET /api/bedrock/questions?language=zh`提供审核问句；问答启用后未命中白名单的输入返回REFUSED／OUT_OF_SCOPE和三语范围提示，modelInvoked=false、usage为0并给出可选问句，不读S3／不调用模型。最新已部署至STG版本24，生产live18没有该新接口。

| 限制 | 当前值 |
|---|---|
| 请求体 | 8 KiB，读取过程中截断并拒绝超限 |
| 问题 | 1,000 Unicode码点，不接受空白问题 |
| 固定资料 | 20,000 Unicode码点／80KiB；支持指定版本私有S3，已导入脱敏履历资料 |
| 输出 | 默认2,048 tokens，可配置16–2,048；截断标记单独返回 |
| 模型网络请求 | 默认20秒，可配置1–20秒，连接超时3秒 |
| 响应体 | 128 KiB，接收分块时检查 |
| 并发／频率 | 每进程1个在途请求、滑动窗口6次/分钟及60次/小时；失败也占次数 |
| 重试／切换 | 无应用自动重试，不自动切换模型、地区或服务档位 |

错误使用固定code，不返回上游正文、凭证或堆栈：输入400、类型415、体积413、忙／限流429、模型异常502、超时504。访问日志沿用现有过滤器，不记录问题、回答、请求头或查询值。SDK签名／HTTP日志级别设为WARN。

频率限制只在当前进程内有效，重启／扩容会重置；不能冒充账号全局限额。20秒限制针对模型HTTP请求；初次SSO／角色凭证解析不计入这一模型等待窗口。公开启用前仍需核验API Gateway节流、滥用控制、冷启动与Lambda 28秒总超时预算。

## 资料与隔离

本地默认资料为[bedrock-facts.md](../backend/src/main/resources/content/bedrock-facts.md)，摘自仓库已有公开profile-zh.json，属于有限初稿。[私有S3方案](bedrock-content.md)已导入从用户DOC整理的脱敏履历资料，固定对象版本＋SHA-256、实例内缓存；STG版本23实际使用该资料。未补写转职动机、私人联系方式或缺失经历，正文不入Git，生产角色及$LATEST随后已准备精确资料配置，live18未改。

白名单匹配后只发送一条system规则与对应的服务端固定问题模板；访客原文不传模型，不接收客户端history／system／模型ID，不保存聊天，不写文件或知识库，不进行微调。个人经历只依据资料、缺项明确说明；通用算法／数学解题等不在本服务范围。STG小样本已抽查，不把提示词当确定性安全边界或零幻觉保证。

## 本地运行与后续发布

以下是使用方法，未在本轮批量执行或上传云端；开启后发问题会实际计费：

```powershell
$env:AWS_PROFILE = 'kong-dev'
$env:BEDROCK_ENABLED = 'true'
# 可先用16验证连通，再在已审查范围内提高。
$env:BEDROCK_MAX_OUTPUT_TOKENS = '16'
mvn.cmd -f backend/pom.xml spring-boot:run
```

另一个终端：

```powershell
$body = @{message='Tell me about yourself.'; language='en'} | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8080/api/bedrock -Method Post -ContentType 'application/json; charset=utf-8' -Body $body
```

启用开关是应用配置，不会自动授予IAM权限。云端使用Lambda执行角色，不设置AWS_PROFILE或API key。STG的单模型授权及固定资料环境已纳入Terraform审查并apply，应用由AWS流水线构建／上传，未绕过CI。两道生产审批定义保留；旧执行已Stopped，第一审批及Green曾成功，生产问答仍未开启。原空请求探测继续兼容，但不能代替真实问答验收。

STG实际结果：版本23、源码2a88caf，8项HTTP合约、三语拒绝及三语正常问答通过；补充事实／注入检查6项通过。正常模型调用8次合计41,563输入／2,059输出tokens，约$0.013405（不含首次截断调用、税和其他AWS服务）；样本平均折算千次约$1.68，仅作当前短回答参考。单次输出68–509 tokens，资料全文输入约5,200 tokens／次；STG硬上限1024，首次截断后增加聚焦与长度提示，未放松完整结束断言。51问未全部做模型质量测试，中文繁简及职称风格仍待统一；详见[命令第13节](aws-commands-20261114.md)。

历史Java初版验证：后端clean verify 24项、Lambda profile 3项，实际ZIP运行冒烟通过（34.7 MiB／解压库38.7 MiB）；前端build及64项测试通过。文档链接／围栏、diff空白与Gitleaks通过；该阶段未做容器构建或线上问答验收。命令及失败修正见[操作补录第9节](aws-commands-20261114.md)。最新AWS构建为前端64／后端57／Lambda 4及ZIP运行通过（38.6MiB／解压43.1MiB）；仍未测试容器。

后续S3资料增量：后端29项、Lambda profile 3项及实际ZIP运行通过（38.6MiB／解压库43.1MiB）；资料存储Terraform 4项、真实IAM 7项及Java云端读取／缓存复用通过。没有修改前端，本增量未重跑其测试。费用取舍与资料更新方式见[说明](bedrock-content.md)。

严格白名单增量：后端57项、Lambda profile 4项及ZIP运行通过；匹配前不读资料，拒绝时零生成模型tokens。固定元数据审计仅记录ALLOW／REFUSE、策略版本和已知主题ID，不记录问题／回答原文。未增加收费分类或Guardrails服务，未进行新模型推理、应用上传或生产切流。
