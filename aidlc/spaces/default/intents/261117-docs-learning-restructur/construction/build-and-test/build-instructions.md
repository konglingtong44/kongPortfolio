# 构建与检查说明

## 前提

从仓库根目录运行。使用现有 Node/npm、Java 21/Maven；本轮不安装新依赖、不设置 AWS 凭证、不使用 .env 或私有问答资料。

## 本轮必须执行

1. `node scripts/check-docs.mjs`：检查项目 Markdown 本地链接和目标文件。
2. `node --test scripts/checks/test-docs.mjs`：检查文档检查器本身。
3. 六个 U1–U6 单元命令见各单元 `unit-test-instructions.md`；每条只执行一次。
4. `git diff --check`：检查本轮差异格式。

## 项目本地构建与测试

- `npm --prefix frontend test` 与 `npm --prefix frontend run build`：前端已有测试和打包检查。
- `mvn -B -ntp -f backend/pom.xml verify`：后端已有测试和打包检查。

本轮只改文档及 Node 检查脚本，因此前后端命令用于全仓回归观察，不当作网站在浏览器、Lambda ZIP 或 AWS 上已验证。若命令因本机依赖或环境不能运行，记录确切退出码与原因，不宣称通过。

## 故障排查

- 本地链接失败：先看路径大小写、相对目录和目标是否存在；不要修改工具拥有的审计内容来消除报错。
- 文件地图失败：比较 Git 可见项目手写文件与 `file-map-inventory.md`，补用途行后复跑。
- npm/Maven 失败：分辨依赖/环境问题与本次编辑造成的回归，保留原错误证据；不降低测试阈值。
