# Phase 1 验证记录

日期：2026-11-11。没有创建 AWS 资源、操作 DNS、真实 Bedrock 调用或向 GitHub 提交/推送。本地代码、文档和 CodeBuild CI 定义已准备；AWS 资源、Webhook、GitHub Branch Protection、CI/CD 在线运行、双审批与蓝绿均未实现。

## 已通过

- 前端 40 项测试和 TypeScript/Vite 生产构建；包括三语弹窗、POST 成功/网络/HTTP/响应错误、重复点击保护、子弹窗关闭不影响父弹窗、现有 S1-01 交互。
- Maven verify：9 项测试；覆盖 profile 三语、健康、Bedrock 准备状态、API INFO 文件/控制台输出和查询参数脱敏。
- 独立临时 checkout 中完整执行 `scripts/check.ps1`，包含 npm ci（避开正在运行的 Windows Vite 文件锁）、构建、测试、扫描、hooks、Compose 配置。原仓库暂存区和历史未改动。
- CI 脚本在独立、干净的合成提交快照中以 Git Bash 执行 all 成功，生成固定快照 SHA 的验证制品；合成提交仅在忽略的 `.local` 测试仓库中，不是本项目提交。
- CodeBuild buildspec YAML、runtime/制品范围检查、Bash 语法、PowerShell 脚本语法通过。固定扫描器版本和无关变更跳过分支也经隔离快照验证。没有 GitHub Actions 配置。
- 两个实际 Docker 镜像构建成功，前/后容器分别 healthy、非 root；前端仅绑定 `127.0.0.1:3000`，后端未映射宿主机端口。
- 3000 经 Nginx 调用 `POST /api/bedrock` 返回 PREPARING 和 Cache-Control no-store，三语各 8 个项目/12 类技术；INFO 文件含请求状态/耗时，不含合成查询参数。
- 强制重建后端后，日志卷保留旧请求，Nginx 可重新连接新后端，前端/后端为独立容器。
- 普通与 `/releases/<SHA>/` base 构建验证：HTML、favicon、JS/CSS 图片路径带正确前缀；验证 tar 每个文件 SHA256 与 manifest 一致。未提交工作树标为 sourceDirty=true，不能作为已批准 release。
- Gitleaks 当前历史和工作树无发现；15 种强制加入私密路径均被钩子阻止，正常源码可通过，缺扫描器时拒绝提交。

## 未验证 / 未实现

AWS CodeBuild managed image 中的真实运行、远程 Source/Webhook/状态回写、审批/切流/回滚/费用均未执行；buildspec 是准备好的配置，不代表已创建 CI。容器与本地脚本测试不能代替 AWS 验证。

本次未做真实浏览器宽/窄屏视觉验收；像素弹窗样式和交互有组件测试，最终外观仍请在 http://localhost:3000 检查。5173 开发模式若后端仍是旧 JVM，需要重启 scripts/dev.ps1 才加载新 Java 代码。

## 文件清单

见下方本次工作树清单，含上轮未提交的 Bedrock 按钮改动；未加入日志、验证包、源简历或构建产物。

- `.githooks/check-staged-paths.mjs`
- `.gitleaks.toml`
- `AGENTS.md`
- `PROJECT_PLAN.md`
- `README.md`
- `backend/.dockerignore`
- `backend/Dockerfile`
- `backend/src/main/java/dev/kongortfolio/bedrock/BedrockController.java`
- `backend/src/main/java/dev/kongortfolio/logging/ApiAccessLogFilter.java`
- `backend/src/main/resources/logback-spring.xml`
- `backend/src/test/java/dev/kongortfolio/BedrockApiTest.java`
- `codebuild/ci.yml`
- `compose.yaml`
- `docs/architecture.md`
- `docs/aws-cost.md`
- `docs/cicd.md`
- `docs/deployment-plan.md`
- `docs/verification.md`
- `frontend/.dockerignore`
- `frontend/nginx.conf`
- `frontend/src/App.test.tsx`
- `frontend/src/App.tsx`
- `frontend/src/BedrockEntry.test.tsx`
- `frontend/src/BedrockEntry.tsx`
- `frontend/src/Modal.tsx`
- `frontend/src/PixelGarden.tsx`
- `frontend/src/bedrock.css`
- `scripts/check.ps1`
- `scripts/ci.sh`
- `scripts/package-frontend.mjs`
- `scripts/test-hooks.mjs`
