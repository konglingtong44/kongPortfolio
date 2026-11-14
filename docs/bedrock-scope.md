# 只开放本人相关问答的严格白名单

用户选择严格模式：仅接受审核过的问题及常见问法；未识别、无关或夹带额外任务时，直接提示可问范围。目标是在加载简历／调用Qwen之前拒绝，而不是让模型读完全文再拒答。当前版本`portfolio-scope-v1`。

## 当前规则

- 17个审核主题：自我介绍、职业经历、当前职责、技能、教育、资格状态、项目、AWS经历、PMO、团队贡献、迁移、工具改修、Java经历、前端经历、个人作品集、职业方向、AI相关经历。
- 每个主题提供日／中／英标准问句（共51句）及有限的审核别名。NFKC统一全角半角、忽略大小写／空格／标点后做**完整匹配**，不是“含有名字或简历就放行”。维护入口为[QuestionScope.java](../backend/src/main/java/dev/kongortfolio/bedrock/QuestionScope.java)。
- 模型只接收该主题的服务端固定问题模板，不转发访客原文；模型只能依据审核资料回答。拒绝通用算法／数学解题、代码生成／调试、无关翻译、新闻、娱乐及私人联系方式请求。
- 本人相关但资料缺失的审核问题，例如转职理由，允许询问，但回答必须说明资料未提供，不猜测。未知问法即使可能相关，也先拒绝并列出可选问句；这是严格模式的取舍。
- 新问句／主题需修改审核表及测试，随后走既有AWS CI/CD；访客不能在线扩展白名单、修改资料或指定模型。

例子：

| 提问 | 处理 |
|---|---|
| 请介绍一下你自己 | 放行到固定自我介绍模板 |
| 你有哪些Java和Spring开发经验 | 放行到个人Java经历模板 |
| 孔令通，帮我写一道动态规划题 | 拒绝，名字不会触发放行 |
| 请介绍一下你自己，然后计算999的999次方 | 拒绝整条请求，不执行部分任务 |
| 你为什么考虑转职 | 放行；当前资料未给动机，不编写原因 |

## API与用户提示

`GET /api/bedrock/questions?language=zh`返回17个该语言的可选问题、policyVersion和enabled；默认语言为日语，不读S3／不调用模型。**该新接口尚未部署到线上**。

问答启用后，现有`POST /api/bedrock`对范围外输入返回HTTP200业务拒绝结果：

```json
{
  "status": "REFUSED",
  "code": "OUT_OF_SCOPE",
  "answer": "目前仅开放孔令通的经历、技能、教育、资格、项目及职业方向相关问答。请从下方问题中选择；暂不提供通用解题、代码生成或其他无关内容。",
  "policyVersion": "portfolio-scope-v1",
  "modelInvoked": false,
  "usage": {"inputTokens": 0, "outputTokens": 0},
  "questions": []
}
```

上例questions为展示省略；实际返回对应语言的17个可选问句。日语／英语使用各自固定提示，不回显访客原文。正常回答仍为ANSWER，附policyVersion、modelInvoked及usage。关闭功能或空POST仍返回PREPARING；超长／无效JSON为原有错误，频率超限优先返回429。拒绝请求也计入本地请求频率保护。

流程：`参数校验 → 并发/频率限制 → 完整白名单匹配 → 资料读取 → 固定模板＋规则＋资料 → Qwen`。范围拒绝不读资料，不调用模型／Guardrails，因此不产生这些服务的调用费；API Gateway／Lambda／日志仍可能按量计费，不能称整次AWS请求绝对免费。

## 为什么不只放System Prompt或AWS话题黑名单

System Prompt只在模型已被调用后生效，模型拒答仍有输入费；它不能替代确定性的前置许可逻辑。Bedrock Denied Topics用于指定不允许的话题，官方也明确不应定义“All contents except…”这种反向例外规则，不能把少数禁止话题当作默认拒绝的白名单。[AWS说明](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-denied-topics.html)

本增量未创建收费Guardrails／分类模型／审计平台；后续若加语义PII／有害内容检测，要单独估算，并按当前Mantle路线通过独立[ApplyGuardrail](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-independent-api.html)接入，不能假定控制台建完自动生效。

访客应只通过网站后端访问，不给Bedrock API key／AWS凭证；此规则约束本Java入口，不能限制管理员从其他授权入口直接调用。17个固定模板及生成规则减少越界机会，模型最终回答质量仍需STG验收，不宣称零幻觉或所有输出已验证。

## 验证与部署边界

本地57项测试通过，覆盖19种无关／夹带任务拒绝、三语标准问句与格式归一化、真实HTTP链路不读取资料／不调用模型、响应与日志不回显问题。Lambda profile 4项及真实ZIP运行通过，兼容空POST并暴露免费问题目录；前端未改，当前页面仍是准备状态入口。

旧资料里“允许一般算法／数学问答”条款已在私有S3新版本替换，职业事实未变。计划严格2更新（对象＋STG读取版本权限），保留旧版；当前资料6,943码点／17,637字节。Java真实S3读取／hash／缓存通过，最终真实Terraform plan No changes，应用和模型权限／开关未部署／开启。

导出51个标准问句供下一步模型质量验收，未执行模型推理；此前履历导入准备的21个样例属于旧范围，后续不得按旧的“通用算法可回答”标准验收。STG发布还需验证scope版本、范围拒绝和零模型调用路径；原空POST准备状态探测不能代替这些检查。生产保留原两道审批。
