# Story005a：STG报告本地审阅

2026-11-17。状态：本地完成，待评审。

## 验收标准

- 读取本地报告与独立期望身份，拒绝跨执行／候选／函数版本混用。
- 核对既有HTTP及问答覆盖，汇总已记录usage，不输出正文；失败／缺失不能返回成功。
- 只做本地一致性验证，不访问AWS或代替审批；接入现有检查入口并更新学习记录。

## 实现与验证

新增`scripts/checks/review-staging.mjs`及测试，复用现有STG契约清单；在`check.ps1`和`ci.sh`加入离线测试。未修改STG部署、业务或审批逻辑。

`node scripts/checks/test-review-staging.mjs`：5项通过，覆盖CLI退出、身份、缺失／重复／非法usage、正文脱敏及lastInvocation不重复计算。既有STG及Green契约检查通过。

完整`scripts/check.ps1`成功：前端81项及构建、后端45项、Lambda5项、实际ZIP冒烟、81份文档链接、秘密扫描、hooks及路由检查通过；Docker仅做Compose配置检查。PowerShell与Bash检查入口语法通过。日志位于ignored `.local/story-005a-checks.txt`。未提交或推送。

原005拆成005a本地证据审阅和后续005b有预算的云端重复采样。本轮仅合成夹具验证，没有真实采样或新报告验收；资料／模型配置、实际预算及付费范围尚待独立核对。学习过程见[09章](../learning/09-staging-evidence.md)。
