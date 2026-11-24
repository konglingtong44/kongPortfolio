# 跨单元集成检查说明

## 目标与工具

Standard 策略下，本轮跨单元边界是文档导航、逐文件地图和 U5→U6 首批方案。使用现有 Node 内建测试及 `scripts/check-docs.mjs`，不新增依赖或云端服务。

## 执行

从仓库根目录运行：

```powershell
node --test --test-concurrency=1 scripts/checks/test-docs.mjs scripts/checks/test-learning-entry.mjs scripts/checks/test-file-map.mjs scripts/checks/test-technology-guide.mjs scripts/checks/test-maintenance-guide.mjs scripts/checks/test-cleanup-proposal.mjs scripts/checks/test-approved-cleanup.mjs
node scripts/check-docs.mjs
```

第一条串行运行测试文件，避免文档检查器短暂创建的 `.doc-check-*` 临时夹具被同时运行的文件地图扫描当作项目文件；它共同验证入口、目录地图、技术说明、规则入口及方案/首批状态。第二条验证全仓本地链接目标。另人工抽查 `docs/README.md` → `docs/learning/start-here.md` → 技术/文件/规则说明，以及 `docs/ai/README.md` → 当前意图记录。检查数据是仓库公开文件与 Git 可见路径，不读取私有资料。

## 预期与局限

现有文档检查器 6 项，六个单元各 5 项，共预计 36 项；以实际运行统计为准。无全局行覆盖率指标，因为交付物是文档与路径检查脚本。此检查运行在 Node，不证明真实浏览器、线上 AWS、Bedrock 或部署状态。
