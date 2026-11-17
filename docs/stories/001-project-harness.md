# Story 001：项目知识与 AI 工作入口

2026-11-17。状态：本地完成，待评审。

## 验收标准

- 根 README 可启动本地项目，并能找到架构、部署、运维、AI、产品、学习及历史资料。
- 原有记录分类移动并保留，当前实现和历史状态有清楚边界。
- 提供项目专用 Story／发布证据审阅 Skill，复用已有验证入口与双审批。
- 本地 Markdown 链接检查接入本地与 AWS CI 源码入口，迁移后的链接目标有效。
- 前端、后端 HTTP／Lambda、实际 ZIP 和秘密检查有本轮本地结果；不扩大为云端或容器运行验证。

## 调查结论

已遍历 Git 文件清单，梳理前端功能与导入、Java 资料／问答／Lambda、五个 Terraform 根栈、六个 buildspec、开发／候选／发布／费用脚本、测试入口与文档。大型执行日志按章节与相关记录查阅；二进制图片和历史模型费用工作簿没有逐个视觉复核，未读取 ignored 凭证／资料／State，也未查线上实时状态。

主要问题：前端源码平铺；脚本多种职责共处；README 和多份 Story 混有不同时点的“当前”。本轮先解决知识入口和可执行约束，后续代码迁移见[路线](README.md)。

## 验证

- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1`：成功。前端81项／构建／静态包、后端44项、Lambda5项、实际ZIP冒烟、Gitleaks、私密路径、hooks与CloudFront路由通过；Docker存在，Compose配置检查通过。日志位于 ignored `.local/story-001-checks.txt`。
- `node scripts/test-docs.mjs`：4项通过，覆盖相对／根路径、Unicode／空格、代码与外链排除、断链／越界诊断。`node scripts/check-docs.mjs`：72份Markdown本地链接目标通过；不验证标题锚点或远程网页。
- 两个 Skill 经 `quick_validate.py` 通过。Windows Python 默认GBK导致首次校验读取失败，使用 `python -X utf8` 后通过。
- 候选、STG、Green、部署与前端发布的五组现有离线契约检查通过，无AWS调用。
- 41份文档迁移，核对旧正文及代码围栏；相对链接更新，另将3份部署文档中的旧文件路径改为可点击导航。原记录及历史命令保留。

本轮未执行AWS流水线／Terraform计划或部署、真实模型调用、容器构建运行、浏览器／手机验收；CI源码已接入文档检查，尚未在AWS执行此版本。未提交或推送。下一Story建议002：先迁移一个前端功能目录。
