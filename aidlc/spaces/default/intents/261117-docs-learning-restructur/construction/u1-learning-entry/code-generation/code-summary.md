# U1 零基础学习入口：实施摘要

## 文件变化

- 新建 `docs/learning/start-here.md`：按项目、访问链路、阅读路线、初始目录地图、规则入口与证据状态组织中文零基础导览。
- 更新 `docs/learning/README.md`：在现有 00–14 操作课程前增设零基础入口，保留原有章节。
- 更新 `docs/README.md`：把零基础入口挂在文档总导航中，并把过时的“首次工作流尚未执行”表述改为指向实际工作记录。
- 新建 `scripts/checks/test-learning-entry.mjs`：5 项定向导航与状态边界回归，沿用 Node 内建测试运行器和现有本地链接检查函数。
- 更新 `scripts/checks/check-docs.mjs` 和 `scripts/checks/test-docs.mjs`：将 AI-DLC 自动生成的审计分片排除在手写项目文档检查范围外，并增加相应回归测试；其他项目 Markdown 仍被检查。

## 决定与验收

本单元只建立入门路线和可用的初始文件/规则入口；逐文件地图、技术取舍、详细维护手册与文件级清理方案分别在后续单元完成。文档把仓库实现、历史发布证据和当前线上状态分开描述，没有调用 AWS、部署或修改访客可见行为。

## 检查结果

- `node --test scripts/checks/test-learning-entry.mjs`：5 项通过。
- `node --test scripts/checks/test-docs.mjs scripts/checks/test-learning-entry.mjs`：11 项通过（原有文档检查器 5 项、审计范围回归 1 项、新入口 5 项）。
- `node scripts/check-docs.mjs`：范围修正前因 AI-DLC 自动生成的审计分片中 2 条路径文本退出 1；范围修正后退出 0，检查 361 份项目 Markdown 的本地目标。工具拥有的审计历史未手动改写。
- `git diff --check`：退出 0。

未运行前端、后端、Docker、浏览器、真机、AWS STG 或生产验证；本单元没有更改对应实现。本次仅能证明本地文档和定向导航检查结果，不能证明实时云端状态。

## 与计划的偏差

计划外增加了文档检查器的范围修正与 1 项回归测试。原因是获准的单元验证命令被机器生成的审计记录阻断；审阅指出失败数增加至 2 后，核实两个目标都不属于手写项目文档。没有删除、移动或改写审计记录。此前的审阅发生在这项修正之前；本单元最终验证结果以上述复测为准。
