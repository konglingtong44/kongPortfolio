# S3-08：前端自动发布（资源已创建，待人工审批）

当前：用户已明确批准，实际apply4新增/2更新/0删除、后续No changes。八阶段pipeline version6、独立发布项目和受限IAM已读取核对。新执行 `2a56d7b1-840e-45b0-8ac4-7b37872cbb4f` 固定源码c073e19，ReleaseMode=deploy；先验收到第一道审批。当前静态发布仍a594e36…、后端live5。下面为准备范围与历史，真实前端发布/回退仍待验证。

已到第一道人工审批：Candidate/STG成功，STG**版本8**七项通过；版本化报告/实际代码SHA/审批变量已独立核对。Release `0dfbd04490393ec56e8c0c554d032167676f068a8fca0d71ce282a5e874b09b2`。请核对新执行**2a56d7b1…/mode deploy/STG8**，在ApproveProduction→ApproveGreenCreation手动批准；此步只发布/验证Green，第二道后才真实切流和前端发布。线上前后端保持不变，日志第22节。

目标：同次Candidate的React静态包，经两道人审和后端成功切流后自动上线到现有S3/CloudFront。它是版本化自动发布及指向回退，不是CloudFront双环境灰度；后者另一个增量。

流程：新增第八阶段PublishFrontend，消费SourceRef/Candidate/STG/Green/DeploymentReport五输入。核对同次源码、两道人审、后端成功报告及实际live数字版本/SHA。rollback_drill模式明确跳过前端，不上传或切换。

1. 用带If-None-Match的条件PUT写`releases/<releaseId>/`；拒绝覆盖，已有对象只能在checksum/MIME/cache元数据完全一致时复用。只上传清单列出的文件，无删除旧发布权限。
2. HEAD校验S3摘要/元数据，再通过公开HTTPS验证所有不可变文件的SHA。
3. 读取原CloudFront LIVE/DEVELOPMENT代码、配置与ETag。只接受现有模板的发布ID变更；有未发布/并发改动则停止。更新DEVELOPMENT并运行AWS TestFunction路由测试后，才PublishFunction切换LIVE。
4. 验证公开version.json、首页/深链接HTML、API health；新资源前缀避免覆盖旧缓存，不依赖全站失效。传播期有界等待。
5. 失败时尝试恢复旧路由指向/开发态，保留旧对象；未知并发修改不会被覆盖。恢复成功也仍报告本次发布失败。

Terraform实际计划：**4新增**（独立CodeBuild/角色/policy/七天日志）、**2更新**（pipeline及启动权限）、0删除。默认enable_frontend_release=false时No changes。十五分钟构建、并发一、无重试。角色无DeleteObject、UpdateDistribution、UpdateAlias或审批权；只写指定站点releases前缀，条件写由IAM限制，CloudFront权限限现有SPA函数。

需明确管理交接：Terraform继续管理CloudFront函数runtime、分发配置和关联；流水线管理函数code中的前端发布指向，`ignore_changes=[code]`防止Terraform恢复bootstrap前端。生产实际plan No changes；尚未上传/切换新前端。当前旧发布a594e36…的sourceDirty=true是首次上线历史；本次只接受新的clean pipeline candidate。

边界：前端回退只恢复前端指向，已成功发布的后端不自动倒退，API须兼容旧前端。网络失联/强制终止不能保证脚本清理，需按FrontendReport的旧发布ID和AWS ETag核对恢复。真实上传/条件IAM/AWS TestFunction/全球传播/前端回退仍待云端验收；本地模拟不是浏览器视觉或真实回退演练。

验证：19项CICD mocked plans、3项生产域名测试、Node审批/报告/文件metadata/路径/顺序/并发/失败恢复/演练跳过测试通过；真实LIVE/DEV旧代码和配置匹配模板。所有操作见根日志21节。

源码b00264a已推送，现有AWS frontend/backend CI与GitHub statuses全success（前端40 tests/build，后端9+3 tests/ZIP smoke，前端发布逻辑测试在AWS Linux通过）。本机额外Vite发布前缀构建确认HTML/CSS/JS及public图片路径正确；不是浏览器视觉验证。新发布资源和实际云流程尚未创建/运行。

费用例子：新增阶段每月20次、每次3分钟，按CodeBuild $0.005和V2 action $0.002每分钟估算约 **$0.42/月**，另计S3存储、请求、CloudFront和日志，未扣共享免费额度，不是全站总费或上限。旧发布保留，清理另行处理。[CodeBuild](https://aws.amazon.com/codebuild/pricing/)、[CodePipeline](https://aws.amazon.com/codepipeline/pricing/)。

AWS依据：[条件写](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes-enforce.html)、[UpdateFunction](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_UpdateFunction.html)、[TestFunction](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_TestFunction.html)、[PublishFunction](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_PublishFunction.html)。创建需用户明确批准；实际前后端发布仍重新经过两道人审，不复用旧执行审批。
