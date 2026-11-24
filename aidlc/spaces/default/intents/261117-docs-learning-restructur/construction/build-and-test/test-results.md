# 构建与测试结果

核对日期：2026-11-24（Asia/Tokyo）。运行目录：`D:\study\kongPortfolio`。本轮未调用 AWS、真实模型或容器。

## 执行结果

| 命令 | 结果 | 证据与范围 |
|---|---|---|
| `node --test scripts/checks/test-learning-entry.mjs` | 退出 0，5/5 | U1 零基础入口 |
| `node --test scripts/checks/test-file-map.mjs` | 退出 0，5/5 | U2 Git 可见文件清单及路径 |
| `node --test scripts/checks/test-technology-guide.mjs` | 退出 0，5/5 | U3 技术说明与证据链接 |
| `node --test scripts/checks/test-maintenance-guide.mjs` | 退出 0，5/5 | U4 规则与流程维护入口 |
| `node --test scripts/checks/test-cleanup-proposal.mjs` | 退出 0，5/5 | U5 候选字段及边界 |
| `node --test scripts/checks/test-approved-cleanup.mjs` | 退出 0，5/5 | U6 两份历史状态修订 |
| `node --test scripts/checks/test-docs.mjs` | 退出 0，6/6 | 文档检查器，含审计目录排除回归 |
| `node --test --test-concurrency=1 scripts/checks/test-docs.mjs scripts/checks/test-learning-entry.mjs scripts/checks/test-file-map.mjs scripts/checks/test-technology-guide.mjs scripts/checks/test-maintenance-guide.mjs scripts/checks/test-cleanup-proposal.mjs scripts/checks/test-approved-cleanup.mjs` | 退出 0，36/36 | 跨单元串行集成检查 |
| `node scripts/check-docs.mjs` | 退出 0，最终复测检查 402 份 Markdown | 本地链接目标；远程链接和锚点不在本检查范围 |
| `npm --prefix frontend test` | 退出 0，81/81 | 10 个前端测试文件 |
| `npm --prefix frontend run build` | 退出 0 | TypeScript 编译及 Vite 打包 |
| `mvn -B -ntp -f backend/pom.xml verify` | 退出 0，45/45 | Java 测试及 Spring Boot JAR 构建 |
| `git diff --check` | 退出 0 | 仅有工作区 LF→CRLF 提示，无格式错误 |

## 集成检查修正

首次并行运行七个 Node 测试文件时为 35/36，文件地图测试扫描到文档检查器短暂创建的 `.doc-check-*.md` 夹具。各文件独立运行均通过。把跨单元运行命令改为 `--test-concurrency=1` 后 36/36 通过；未降低断言或覆盖目标。并行方式存在已知夹具隔离问题，后续若要恢复并行应先隔离临时文件。

## 覆盖与未验证项

六单元各 5 项定向测试，共 30 项；文档检查器 6 项。项目没有为文档文字修改定义应用源码行覆盖率目标，本轮不报虚构百分比。前后端测试虽通过，不证明真实浏览器行为、Lambda ZIP、Docker 镜像、AWS STG/生产、远程链接、hook 执行健康或真实模型效果。未做部署。
