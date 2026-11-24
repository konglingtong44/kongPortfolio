# U4 测试说明

## 测试框架与配置

Node 内建 `node:test`，复用项目现有本地链接检查函数；无需新增依赖。

## 本单元命令

从仓库根目录执行：

```powershell
node --test scripts/checks/test-maintenance-guide.mjs
```

这条命令只跑 U4 的 5 项定向测试。完成后另跑全仓 `node scripts/check-docs.mjs` 与既有文件地图测试，分别检查链接目标和新增手写文件是否入清单。

## 覆盖与边界

测试覆盖项目约定、AI-DLC 项目规则、项目自写技能、学习/Story 资料路径和入口，以及安装/生成文件边界。它不修改规则，不运行 AI-DLC 安装或升级，也不触发 AWS。准确性需人工核对现行文件；本单元没有应用代码行覆盖率要求。
