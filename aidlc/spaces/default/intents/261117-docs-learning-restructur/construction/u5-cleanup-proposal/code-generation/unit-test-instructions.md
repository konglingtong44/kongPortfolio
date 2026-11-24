# U5 测试说明

## 测试框架与配置

Node 内建 `node:test`，读取公开 Markdown 和 Git 文件清单；不使用 AWS 或私有资料。

## 本单元命令

从仓库根目录执行：

```powershell
node --test scripts/checks/test-cleanup-proposal.mjs
```

只运行 U5 的 5 项方案结构和引用测试。另运行全仓 `node scripts/check-docs.mjs` 以及现有文件地图测试；它们不算 U5 单元专属命令。

## 覆盖与边界

测试应检查候选表必需字段、候选路径存在、处理状态和 U6 首批边界、入口与新文件清单；自动化不能代替判断历史价值或批准具体删改。本单元不执行删除、移动、发布或云端查询；没有应用代码行覆盖率目标。
