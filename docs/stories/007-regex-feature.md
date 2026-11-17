# Story007：正则工具按功能归类

2026-11-17。状态：本地完成，待评审。

## 验收标准

- 组件与既有测试同放`frontend/src/features/regex/`。
- 更新App及共享模块导入，保留正则解析、图形展示与Worker调用逻辑。
- 前端测试／构建、文档链接与秘密检查通过，学习记录更新。

## 实现与验证

移动`RegexLab.tsx`与`RegexLab.test.tsx`，App改用新路径。组件仅调整i18n和modules两处导入；测试正文保持不变，已与Git原文逐字比较。共享文案与全局样式保留原位，避免改变CSS顺序。

`npm.cmd --prefix frontend test`：10个文件、81项通过，包含正则解析及App打开工具／恢复焦点的既有检查。`npm.cmd --prefix frontend run build`成功，52个模块；实际输出见本轮终端记录，未另存原始日志。文档链接86份、diff及Gitleaks扫描通过。

前端测试不覆盖真实浏览器Worker执行或手机视觉；本轮不扩大为这些验收。后端、Lambda、容器与AWS未改／未重验，未提交、推送或部署。学习过程见[07章新增段落](../learning/07-ai-workflow.md#6-继续按功能整理正则工具)。
