# U1 测试说明

## 测试框架与配置

使用 Node 内建 `node:test`，不安装依赖。测试文件固定为 `scripts/checks/test-learning-entry.mjs`，复用 `scripts/checks/check-docs.mjs` 的本地链接解析与目标检查；不改全仓库测试配置。

## 本单元命令

从仓库根目录执行：

```powershell
node --test scripts/checks/test-learning-entry.mjs
```

这条命令只运行 U1 的 5 项测试。编写测试前，可用 `node --test scripts/checks/test-docs.mjs` 验证已有检查器和运行器；该命令只运行指定的现有测试文件。实施完成后另运行项目既有 `node scripts/check-docs.mjs`，它检查整个仓库，不计作本单元专属测试命令。

## 预期覆盖与数据

五项测试覆盖学习入口可到达、主题导航、初始文件地图与维护规则入口、旧 00–14 课程可达、线上状态不被入口宣称为本轮已核实。测试只读取仓库内公开 Markdown 和路径，不使用 AWS 凭证、私有资料或网络，也不模拟线上环境。此单元只有文档，代码行覆盖率不适用；`node scripts/check-docs.mjs` 在 Build and Test 核查整仓链接，既存且与本次变更无关的失败单独记录。
