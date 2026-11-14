# 生产问答配置已准备，访客仍使用版本18

2026-11-14实际apply：资料根栈1新增生产reader策略；portfolio根栈1新增模型策略、1更新Lambda配置，0删除。没有上传资料、更新代码、发布版本或移动live别名。

| 设置 | 当前结果 |
|---|---|
| 生产执行角色 | Mantle CreateInference仅本账号东京default项目、指定Qwen；Runtime未授权 |
| 资料读取 | 仅approved/facts.txt的当前及两个已审核回滚版本，GetObjectVersion；不允许最新读取、List、Put |
| 应用资料 | `$LATEST`固定现有version＋SHA-256＋owner，与STG相同，正文不入环境或Git |
| 调用参数 | `$LATEST`启用有界问答，最多1024输出tokens、15秒模型HTTP；Lambda仍1024MB／28秒／并发5 |
| 版本发布 | pipeline_owns_lambda_versions=true，Terraform publish=false；已有live作为只读基线，别名仍由CodeDeploy管理 |
| 公共入口 | live仍18且其环境不变，访客问答仍PREPARING；没有Function URL |

角色权限作用于使用该角色的版本；应用环境是各版本的快照。只改`$LATEST`不会改已发布版本18的环境。[AWS版本说明](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html)、[环境变量说明](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html)。Terraform的[publish参数](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function)已关闭，实际对比已发布版本列表，新增数量0。没有用配置准备绕过第一审批创建Green。

真实检查：10项IAM模拟（指定模型和资料allowed；其他模型／项目、缺模型条件、未知版本、latest／写／列举／Runtime implicitDeny）；叠加费用关停Deny后新Allow仍explicitDeny。费用状态hash不变，health200/UP，live别名／权重／RevisionId和已发布环境与前快照一致。两根栈最终plan No changes。

离线测试：portfolio Terraform13项、资料5项、Green／部署保护Node检查通过。Green脚本已补：

- 生产资料version／hash／owner／bucket及输出上限必须与真实STG成功报告一致，拒绝没有问答证据的候选。
- 只接受当前InProgress执行的本次审批，Stopped等旧执行不能复用。
- 首道人审后，才发布同一候选为Green；首条验证请求直接做日语问答，核对生产角色首次S3／模型调用，不先用health预热。
- 总计六条范围请求，三次生成＋三次零token拒绝；只保存安全指标，正文不进入报告或日志。
- 从Lambda Invoke Tail的REPORT读取Init Duration及Duration，合计须低于28秒，为30秒API集成留余量；没有冷启动记录或样本过慢即失败，不把热调用当冷调用。重新使用已热版本不能补出冷证据，需新候选版本。单个冷样本不是公网SLA。

上述Green真实问答／冷启动验证**尚未运行**，只做了脚本离线测试；真实生产角色调用仍待第一审批后验证。15秒是模型HTTP预算，S3另有4秒，初始化／凭证与网络需看实际记录，不靠相加保证成功。[Lambda生命周期](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)

未修改两道人审，未启动新候选，旧执行仍Stopped；新界面及规范路径修复仍在本地。下一Story扫描并提交新源码，用AWS重新构建、STG验证，供用户审查第一审批。第一审批前不执行生产Green模型调用。管理员直接测试`$LATEST`现在可能发生真实模型费用；本轮没有执行。

紧急停用仍使用既有费用控制Lambda；单独修改`$LATEST`开关不会关闭已发布版本中的功能。角色Deny及函数并发归零能覆盖已发布版本，原关停／恢复机制未改。

维护输入：保留原terraform.tfvars，生产启用参数在ignored `infra/terraform/portfolio/bedrock.auto.tfvars.json`；资料根栈继续用ignored `.local/bedrock-content.tfvars.json`，勿漏生产reader。证据在ignored `.local/bedrock-prod-config/`；命令见[第17节](aws-commands-20261114.md)。
