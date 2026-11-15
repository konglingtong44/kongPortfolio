# 2026-11-16 AI问答面板发布记录（执行中）

用户确认新进度条与固定阅读／输入布局，明确要求上线。验收：新源码通过AWS构建、独立STG及既有两道人审流程；使用同次制品发布，公开version／资源／health与报告一致。前端79项、构建及17组浏览器模拟已在前一轮通过，本轮不把本地样例当成生产验收。

23:59 JST开始只读发现，但STS前凭证刷新失败，SSO token已过期；没有读到新的生产或管线状态，没有AWS写入。启动CLI设备登录并通过异步问题给用户发恢复链接，等待登录期间整理提交与新helper；设备码不写入Git。本轮跨入11月16日，使用独立ignored目录`.local/qa-panel-release-20261116/`。

```powershell
git status --short
git log -4 --oneline
Get-Content AGENTS.md -Encoding utf8
python .local/inspect-qa-panel-before.py
& 'D:\software\AWSCLI\aws.exe' sso login --profile kong-dev --no-browser --use-device-code
python .local/prepare-qa-panel-candidate.py
```

新候选helper复用既有带保护的发布入口：记录当前实际live基线而不硬编码旧23；确认无在途候选、无附加权重、资料pin／上限一致、费用on、两道人审和DetectChanges=false。显式COMMIT_ID，start前重新核对生产／费用快照、干净已跟踪工作区及远端源码。报告验证8HTTP／6范围＋4事实展示、semantic-v2、真实usage、实际STG版本hash和生产／费用未变。不调用审批API；已有候选须先看实际阶段再处理，尚未执行停止或新管线启动。

当前只完成发布准备；恢复登录及实际AWS结果后补。私有资料／回答／.local及用户outputs不提交，不改IAM、S3资料版本或费用开关。

先独立完成本地受控提交；恢复登录核对当前管线后再push并启动，避免盲目重复已有执行。前端代码与上一轮79项／17组验证时相同，新增文档记录已获用户上线授权。

```powershell
. ./scripts/tools.ps1
python .local/check_aws_docs.py
git diff --check
$panelPaths = @(git diff --name-only)
$panelPaths += @('docs/aws-commands-20261116.md','docs/bedrock-qa-panel-release.md')
git add -- $panelPaths
node .githooks/check-staged-paths.mjs
git diff --cached --check
git commit -m 'feat: add compact AI answer panel and waiting progress'
```
