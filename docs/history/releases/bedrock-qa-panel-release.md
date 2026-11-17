# AI问答面板已上线：生产25

2026-11-16，问答新面板已发布生产25，源码08731dc／执行fdde9128-4fc1-4e5b-bf53-a22ad6728805全部成功。公开网页与同次release一致，health200／UP，费用state hash未变。 两道人审均Succeeded；助手未代批。新进度条、紧凑标题、独立阅读区和固定输入区已发布，窄横屏左右布局，返回直接显示回答。

| 核对项 | 实际成功发布 |
|---|---|
| 执行 | `fdde9128-4fc1-4e5b-bf53-a22ad6728805` |
| 源码 | `08731dc7696c3a4223743e7b9b046f9569ffc371`；面板代码80918df，其后仅发布Markdown不同 |
| STG／Green／live | 31／25／25，无附加权重 |
| releaseId | `b7bd2bcb37038a7d9f67c38d620e2e2a242353557c16f4b6d06158928474321b` |
| 后端SHA-256 | `392b392d03875a7f363f71f052e82b3e984148040daec2e9ca04fa9b10c8a7dd` |
| CodeDeploy | `d-BJ3DCQAGM`，24→25金丝雀10%观察5分钟后成功 |
| Green冷问答 | 3755.54＋3397.29＝7152.83ms，仅本次样本 |

AWS构建前端79项／后端41项／Lambda5项和实际ZIP通过。STG 8HTTP、三语回答／拒绝及4条自然问法／事实展示通过；Green真实生产角色、三语问答／拒绝和8HTTP通过。四份同次报告passed，source／execution／release／hash和真实Lambda版本、公开version一致。前端不可变资源、路由和公开HTML／version／资源／API发布检查通过。

新增公开浏览器验收：Chrome1366×900打开新面板不生成回答；WebKit390×844通过真实CloudFront→API→Lambda→Qwen完成一次“你的技能是啥”。观察到等待条，返回后首段直接可见、阅读区归顶且标题聚焦，输入／发送仍可见；5094输入／160输出tokens。已查看真实手机模拟截图。不是iPhone真机或真实软键盘验证；本地三语17组模拟仍分别记录于[前端记录](../../ai/bedrock-frontend.md)。

本次STG10＋Green6＋公开浏览器1＝17次模型请求，合计86,190输入／1,146输出tokens，按已核对东京Mantle价格估算模型费$0.02448606；含语义拒绝，未含税、CodeBuild／Lambda等其他AWS费用，非账单。未新增知识库／分类器、IAM／S3资料版本或费用开关修改，对话不写回资料。

命令及完整过程见[11月16日记录](../aws-commands-20261116.md)。ignored证据`.local/qa-panel-release-20261116/`含四份报告、final-inspection.json及public-browser-report.json；真实回答／截图不入Git。后续文档提交不会改变本轮固定源码或启动新候选。
