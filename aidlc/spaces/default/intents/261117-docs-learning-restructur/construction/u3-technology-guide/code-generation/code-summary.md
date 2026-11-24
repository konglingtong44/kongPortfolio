# U3 技术导览：实施摘要

## 文件变化

- 新建 `docs/learning/technology-guide.md`：用零基础语言解释前端、后端、本地运行、Terraform/AWS、交付与 Bedrock/Qwen 问答，并逐项链接到项目源码或配置。
- 更新 `docs/learning/start-here.md` 和 `docs/learning/README.md`：加入技术导览入口。
- 更新 `docs/learning/file-map-inventory.md`：纳入本单元新增的手写文档和测试文件。
- 新建 `scripts/checks/test-technology-guide.mjs`：5 项导航、技术依据与教学比较边界回归。

## 决定与边界

技术选项的收益按本项目规模与代码说明；替代做法被明确标为“教学比较”，不伪称历史决策。AWS/Bedrock 的配置与旧发布证据均不能证明本轮实时运行状态。AI-DLC/Codex 属开发工作流程，访客问答运行时仍是后端通过 Bedrock 调用 Qwen。没有增加框架、资源或付费调用。

## 验证

- `node --test scripts/checks/test-technology-guide.mjs`：5 项通过。
- `node --test scripts/checks/test-file-map.mjs`：5 项通过，新增手写文件已进入清单。
- `node scripts/check-docs.mjs`：退出 0；初跑检查 374 份、审阅后补充复测检查 376 份项目 Markdown 的本地目标。
- `git diff --check`：退出 0。

未运行前后端构建、Docker、浏览器、真机、AWS STG/生产或真实模型采样；本单元只修改文档和 Node 定向测试，以上检查不证明线上状态。

## 与计划的偏差

审阅指出前端、后端、本地运行和 AWS 交付缺少替代方案教学比较。已在导览表中补充 React/TypeScript/Vite、Spring Boot/Maven、Docker/Compose、静态网站交付、AWS CI/CD 与模型资料方式，并在现有定向测试加入这些类别的断言。补充后测试与链接检查通过；原审阅发生在补充之前，未把它表述为复审结论。
