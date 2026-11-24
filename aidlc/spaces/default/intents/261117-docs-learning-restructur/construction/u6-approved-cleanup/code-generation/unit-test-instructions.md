# U6 测试说明

## 测试框架与配置

Node 内建 `node:test`；新增 `scripts/checks/test-approved-cleanup.mjs`，不添加依赖、不读取私有资料、不访问 AWS。

## 本单元命令

从仓库根目录执行：

```powershell
node --test scripts/checks/test-approved-cleanup.mjs
```

测试 5 项：两份入口均明确 2026-11-17 历史状态、现行工作记录入口有效、过时的“下一 Story”措辞不再被当成当前状态、旧数字/命令保留、方案状态与实际改动一致。另运行 `node scripts/check-docs.mjs`、`node --test scripts/checks/test-file-map.mjs`、`node --test scripts/checks/test-cleanup-proposal.mjs` 与 `git diff --check`。

## 覆盖与边界

自动测试证明文字结构和链接可达，不证明 AWS 线上状态、hook 执行健康、真实模型效果或历史数字的外部真实性。修改前后分别记录检查；无网站/API、容器或部署改动。
