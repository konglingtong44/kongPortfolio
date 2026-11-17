# Story008：个人介绍与技能展示归类

2026-11-17。状态：本地完成，待评审。

## 验收标准

- 时间线、技能展示、相关样式与既有测试归入`frontend/src/features/profile/`。
- App与共享依赖导入正确，保持三语内容、手机展开逻辑及CSS加载顺序。
- 前端测试／构建、文档、diff与秘密检查通过，学习记录更新。

## 实现与验证

移动5个文件：`IntroTimeline.tsx`、`IntroTimeline.test.tsx`、`intro.css`、`SkillsBento.tsx`、`skills.css`。组件与测试仅调整共享导入，已与迁移前副本比较；两份CSS原文不变。App的intro样式导入保持原位置，只改路径；skills样式仍由SkillsBento导入。

共享Profile数据类型、i18n、滚动手势和PixelGarden暂留原位，未将本轮扩成共享层重构，也未改个人事实。

`npm.cmd --prefix frontend test`：10个文件、81项通过，含三语里程碑、手机折叠保留内容、返回简介和App既有检查。`npm.cmd --prefix frontend run build`成功，52个模块。日志在ignored `.local/story-008-frontend-test.txt`及`.local/story-008-frontend-build.txt`。

87份Markdown本地链接、`git diff --check`及Gitleaks扫描通过。本轮仅本地代码与单元／构建验证，未新增浏览器视觉或物理iPhone验收；后端／Lambda／容器／AWS未改、未重验，未提交或部署。学习过程见[07章](../learning/07-ai-workflow.md)。
