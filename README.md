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
