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

实际本地提交80918df（13文件），staged Gitleaks通过；28份文档／181相对链接／29脚本引用及diff通过。尚未push，CLI设备登录仍等待用户完成，未能读取新AWS状态或启动发布。此后续记录留本地待发布收尾同步，不把登录等待算作已上线。

## 登录恢复与实际生产24基线

用户确认登录后SDK已可用。读取实际7e728e3d执行，全部阶段Succeeded，两道人审成功；下载同次STG／Green／部署／前端报告并核对source b8ca8b0、passed及execution一致，生产live24实际CodeSha256与报告ba8caf35…一致、无权重。公开version=b8ca8b0／release4fa9c776…、sourceDirty=false，health200／UP。旧Green冷问答4859.31＋3366.30＝8225.61ms仅是旧版样本，不算新面板验收。此前“生产23／等首审批”的文档快照不能当作当前状态。

新预检无在途候选、费用on、两道人审／Source DetectChanges=false、资料pin及输出1024一致、prod模型HTTP15／STG20秒。新before.json、public-before.json和accepted-prior-release.json保留实际基线；不需停止任何旧执行。capture辅助脚本输出的production23是旧固定提示文字，实际JSON与断言已是动态线上基线；已修正提示，不重复覆盖已记录的基线。

```powershell
python .local/inspect-qa-panel-before.py
python .local/qa-panel-candidate-run.py preflight
python .local/capture-qa-panel-public-before.py
python .local/review-qa-panel-baseline.py
```

下一步只提交SSO／基线文档，应用代码仍与80918df一致；push后显式COMMIT_ID启动新候选，实际源码／执行ID及AWS结果后补。不得复用已完成7e728e3d审批，新面板按新候选两道人审。没有新模型调用、S3资料／IAM／费用开关修改或生产写入。
