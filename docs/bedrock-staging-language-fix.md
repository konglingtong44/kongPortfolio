# VerifyStaging 中文回答语言回归

**已发布生产26（2026-11-16）：** 下述执行已完成两道人审、Green26验证、25→26金丝雀及同候选前端发布。公开version／health核对通过。此前“等待审批”是STG验收时的记录，最新结果见文末。

2026-11-16，执行`b0a841d2-b772-428e-8c14-5d9be3c5b1d7`／源码`34ba1b3`在STG32失败。构建、8项HTTP及前6项模型检查通过；`requirements-typo-zh`回答包含日语假名，被既有检查拒绝。一次限定STG32复现也收到日语正文，说明不是前端构建失败。生产live25、无附加流量权重。

验收：保留原语言检查、一次模型调用和无自动重试；修复后的中文问法通过真实样本，并由Java拒绝残留日语正文；新候选重新通过AWS构建与STG后，仍等待本次执行的两道生产审批。

修复：语言要求同时置于system开头／末尾，并随user中的原始问题附上服务端回答语言指示。删除中文规则中的日文示例，避免复制；不按问句匹配，也不改变资料。Java在成功回答返回前检查假名，违规则502 `MODEL_LANGUAGE_MISMATCH`，不把错误语言正文展示给访客，不增加第二次付费调用。拒绝仍用服务端固定提示。

本地：后端44项、Lambda适配5项及实际ZIP运行通过。固定原审核资料，用本机SSO调用同一Qwen，6个限定样本（原失败问法2次、技能、未知转职原因、日／英AI经历）通过及原presentation检查通过；不能代替真实STG角色／冷启动／全部未来问法验证。模型输入30,916／输出665 tokens。此前STG32诊断另1次5,097／168。原失败执行8次40,578／661，含拒绝和失败样本；实际usage在ignored证据中，均非零费用。

证据：ignored `.local/staging-failure-20261116/`，安全报告不含问答／履历正文。未改IAM、资料S3版本、费用开关或生产别名。

AWS新候选：源码`f4b91d3c950deb235335e2dc81848d6f9d15bc90`／执行`586f1aa5-c6e8-433a-921c-d2f745ffa124`。前后端CI成功，BuildCandidate成功，STG33通过8项HTTP和10项真实模型检查，包含原失败问法`requirements-typo-zh`。同次报告passed、源码／执行／release／backend hash一致，实际STG33代码hash与报告一致；release为`f2ac44b04c416531c9c4ea85c6068ce0a55d48999bbd30f9a84e7b1c2b364f65`。

本轮STG10次合计51,359输入／756输出tokens，按此前核对东京Mantle单价估算模型费$0.01466829；未含税及其他AWS费用，非实际账单。

STG验收时停在第一道`ApproveProduction`人工审批，当时生产live25／无附加权重、别名RevisionId和费用状态hash与预检相同。按[AGENTS.md](../AGENTS.md)保留两道审批：第一次允许创建／验证Green；第二次才允许切流与同候选前端发布。助手未代批。后续文档提交不改变本次固定源码，也不自动启动新的候选。

生产复核：执行`586f1aa5…`八阶段全部Succeeded，两审批均成功；STG33、Green26、部署和前端四份同次报告均passed，source／execution／release一致。实际live26的代码hash匹配候选，已无附加流量权重；CodeDeploy `d-W2HV79MGM`成功，使用10%／5分钟配置完成25→26。费用状态hash与预检相同。

公开`version.json`为f4b91d3／f2ac44b0…、sourceDirty=false；health200／UP。Chrome1366px与WebKit390px实际访问生产网站，04流程图、交换后的备选位置、RAG费用和气泡均通过，无页面异常。本次公开浏览器模型POST为0；真实模型证据来自STG10项与Green6项，未再次调用公网模型，不等同iPhone真机验证。证据在ignored `.local/staging-failure-20261116/candidate/`及`public-browser/`。未改IAM、资料版本或费用开关，未启动下一次发布。
