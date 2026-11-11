# kongPortfolio

日语优先的三语个人博客。当前增量 **S1-01：首页**：自我介绍、技术强项、个人项目、工作案例、经历时间线与一篇可展开的开发手记。完整文章列表和详情功能是下一 Story。

## 本地启动（Windows）

需要 Node.js 24 LTS（含 npm）、JDK 21、Maven 3.9.11+、Git 和 Gitleaks。
本机工具安装在 `D:\software`；已配置用户 PATH 和 JAVA_HOME。新终端自动生效，脚本也会读取用户 PATH。

在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-hooks.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1
```

打开 http://localhost:5173 。脚本先构建后端，再启动两个服务；按 Ctrl+C 停止。日志保存在忽略提交的 `.local/`。

也可以分开启动：

```powershell
# 终端 1
cd backend
mvn spring-boot:run

# 终端 2
cd frontend
npm ci
npm run dev
```

Vite 将同源 `/api` 请求代理到 `127.0.0.1:8080`，无需开放 CORS。原生服务默认只监听本机。

## 验证

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
```

包含前端类型检查/生产构建、语言选择和交互测试、后端 HTTP 集成测试、Gitleaks 工作树扫描，以及可用时的 Compose 配置检查。容器构建需要单独执行。

API：`GET /api/profile?lang=ja|zh|en`；`GET /api/health`。不支持的语言回退到日语。

## Docker / Compose

需要运行中的 Docker Linux 容器引擎和 Compose v2+。从根目录运行：

```powershell
docker compose up --build -d --wait
# 打开 http://localhost:3000
docker compose down
```

多阶段镜像以非 root 用户运行；只开放本机前端端口，后端位于 Compose 内部网络，健康检查通过后启动前端。不使用数据库或 `.env`。

本机已安装 Docker CLI/Compose；Docker Desktop/引擎尚未可用。检测到 Windows 11 build 22621，低于当前 Docker Desktop 的系统要求；需先升级受支持的 Windows、配置 WSL 2 后才能执行容器验收。

## 内容与结构

- `frontend/src/i18n.ts`：三语界面文案、浏览器语言识别、手动选择持久化。
- `backend/src/main/resources/content/profile-{ja,zh,en}.json`：无数据库的三语公开内容；`ProfileService` 启动时加载。
- `compose.yaml`：本地容器编排。
- [PROJECT_PLAN.md](PROJECT_PLAN.md)：短计划与当前 Story；[AGENTS.md](AGENTS.md)：开发约定。

职业内容参考用户提供的 2026 年 10 月简历：第 1 页的简介/资格、第 2–6 页的项目经历。个人项目 kongPortfolio 来自当前仓库；工作案例和团队成果单独标注，AWS 资格只标注 2021 年取得，不表示目前有效。技术手记是本站开发记录初稿。

源简历仅供本地参考，已加入 Git 忽略；网页没有原 PDF 下载，不包含生日、最近车站、内部项目名或客户明细。以后新增个人项目应补充真实经历与链接。AWS、CI/CD、蓝绿部署、Bedrock 仍为后续 Story。

## 安全约定

任何 AWS Key、API key、密码、`.env`（包括示例）、证书都不得提交。`.gitignore` 和 Docker 构建上下文均排除敏感文件；Git hooks 缺少 Gitleaks 时会阻止提交/推送，提交时扫描暂存区、推送前扫描历史。每个新克隆都需运行安装 hooks 脚本；本地 hooks 可被绕过，不能替代后续 CodeBuild 中的强制扫描。

后续 AWS 使用 IAM Role、CodeConnections、SSM Parameter Store；创建付费资源需先得到用户明确确认。本增量未连接或创建 AWS 资源。

提交钩子还需要 Node.js，会检查暂存路径，拦截 `.local/`、常见简历文件名、日志、环境文件和证书，即使通过 `git add -f` 加入也会拒绝。路径检查失败同样拒绝提交。可运行 `node scripts/test-hooks.mjs` 在隔离仓库验证；测试只写入忽略的 `.local/`，不会修改当前项目的暂存区。改名后的任意私人文档仍需人工检查。

历史会话和 `/mnt/data/portfolio_agile_docs/` 在当前环境不可读；仓库内约定文档根据本次消息重建，未冒充原文。

## 当前改版：S1-01H

01 简介布局保留。桌面在 01 下滚一次进入全屏 02；02 合并职业经历与项目，按时间倒序横向浏览，一次手势切换一项，点击打开详情。触屏支持原生横向滑动，键盘支持左右方向键、Home/End，首尾可前往相邻章节。

03 技术栈采用六类 Bento 卡片，补充现有技术的具体实践说明，区分工作经验与本站技术。资格取得记录默认展开。04 保留三个工具模块。

视觉参考星露谷官方场景：蓝天、山谷、红屋顶农舍、明亮草地，以及蜂蜜色木框和纸张面板。原创生成素材保存在 `frontend/public/images/valley-farm.png`；提示词与参考见 [DESIGN_NOTES.md](DESIGN_NOTES.md)。

主要实现：`useChapterWheel.ts` 控制章节与滚轮手势，`ProjectGallery.tsx` 合并经历/项目，`SkillsBento.tsx` 展示技术栈。25 项前端测试已通过。实际桌面/手机视觉和滚轮手感仍待验证，浏览器控制接口不可用；容器镜像构建未验证。

## 当前资料与时间线更新：S1-01T

最新独立预览：http://localhost:5174 。原 5173 服务仍在运行，其旧后端未重启；重启原开发服务后也会载入新资料。

02 增加左侧同步时间线；点击时间项，右侧先滚到对应卡片再打开详情。前往 03 使用大木框按钮。01/02/03 双向章节切换以视口覆盖判断，手动返回 02 后重新读取横向位置。03 按 12 类技术展示，不按项目分类。

项目内容依据用户给出的 2026 年 10 月 PDF 和 2026 年 4 月 XLS 核对：PDF 决定时间，XLS 补充具体职责与技术。职业项目 7 段，每段增加团队规模、职责列表、技术环境及成果。原文件、提取内容不发布；证据映射见 [DESIGN_NOTES.md](DESIGN_NOTES.md)。

### 本地内容更新

当前完整资料预览使用 http://localhost:5174/?v=short-intro#home 。已运行的旧 5173/8080 服务没有替换，请通过此预览地址检查新简介。

`dev.ps1` 现在为后端传入 `portfolio.content-directory`，本地 API 每次请求重新读取公开 JSON；保存内容后刷新页面即可。未设置该属性时，正式打包版本仍从 classpath 加载。该目录仅包含三语公开资料，不包含源简历或私人文件。

小窗口里 01 保持正常纵向滚动，底部内容完整进入视口后，下次滚轮才切到 02。
