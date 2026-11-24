# Story012：主仓库接入AI-DLC Codex适配

2026-11-17。状态：主仓库配置、CLI发现及信任验证完成；完整工作流和hook执行健康待下一增量。

## 验收标准

- 固定AI-DLC 2.11.4，在主仓库生成官方Codex配置、Skill、hooks和方法目录。
- 原AGENTS正文、两个portfolio Skill、模型／provider和AWS双审批保留；秘密保护继续生效。
- 主仓库doctor、文档检查和秘密检查有实际结果。
- 新Codex会话加载／hook信任按实际结果记录，不把文件存在等同于已执行。
- 在学习目录记录操作、失败修正、验证和下一步。

## 实现与验证

实际应用官方2.11.4适配并固定`.aidlc-version`；保留原AGENTS正文前缀、gitignore保护规则与两个portfolio Skill。补充项目方法层，绑定当前检查入口、学习记录、三语手机约定与AWS双审批。生成配置不指定model／provider。

- Configure成功；刷新预览0新增、1更新、458保留、0冲突，未执行刷新。
- 主仓库doctor退出0：65通过、2警告、0失败。警告为尚无hook执行健康记录及`aidlc/`未提交。
- `codex debug prompt-input`成功；developer上下文有AI-DLC onboarding，Skill及用户项目规则可见。输出只存ignored目录。
- 实际CLI审阅主项目11个hook并登记信任；退出后新CLI的`/hooks`显示Active，`/skills`列表可找到aidlc。未发送模型工作流请求，因此不声明hook已实际执行。
- 生成的11条hook命令均匹配已审阅的官方命令集，两个portfolio Skill的SHA256不变；前后端、Terraform、buildspec及秘密hooks无差异。
- 299份Markdown本地链接及diff空白检查通过；全仓库Gitleaks无泄漏。既有hook契约检查通过：28个强制加入的私密路径被拦截、公开源码可通过、缺少扫描器时拒绝继续；5个秘密／state／本地产物忽略检查也通过。

原文件、摘要和命令日志在ignored `.local/aidlc/story012/`。复现命令、终端问题及验证边界见[学习13](../learning/13-aidlc-codex.md)。

## 评审与后续

本轮未提交、推送、访问AWS或调用网站模型；未重跑无改动的业务构建。下一Story在新的本机Codex CLI会话执行一个真实小任务，验证hook健康、阶段状态与完成证据。新配置、Skill发现、信任登记和完整生命周期执行分别记录。
