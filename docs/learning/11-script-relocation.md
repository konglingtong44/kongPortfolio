# 11｜移动Node脚本时保留命令与检查范围

[学习路线](README.md) · [Story006](../stories/006-doc-checks-layout.md)

2026-11-17。本轮把文档检查实现和测试放进`scripts/checks/`，继续按一类一个Story整理目录。

## 路径与兼容入口

```text
scripts/check-docs.mjs       → checks/check-docs.mjs
scripts/test-docs.mjs        → checks/test-docs.mjs
```

日常命令`node scripts/check-docs.mjs`保持可用；自动检查入口`check.ps1`和`ci.sh`改用新路径。旧检查器重新导出`checkLinks`、`localLinks`，导入它不会自动启动整仓扫描；只有直接作为CLI运行才调用main。

Node ESM的`import.meta.url`指当前模块位置。检查器移深一层后，定位仓库根从`../`改为`../../`，不能靠调用者的`process.cwd()`。同目录测试与实现一起移动，其相互导入路径不变。

## 验证不能只看“运行成功”

新测试临时在仓库根写入一份断链Markdown，从仓库外分别调用两个CLI；两者都必须以非零退出，并明确指出那份文件。最后在finally中删除夹具。这样能防止错误根目录造成“只检查子目录却通过”。

测试还核对旧导出与新实现是相同函数。首次编写测试时把夹具目录多退了一层，导致断言失败；修正夹具定位后通过，不放宽断言。

复现：

```powershell
node scripts/test-docs.mjs
node scripts/checks/check-docs.mjs
node scripts/check-docs.mjs
```

文档检查仍只核对本地文件目标，不验证标题锚点、外网链接或产品UI。仅移动工具不代表网站发布、AWS执行或模型采样完成；付费采样草案保持未执行。

## 累计修改也需要检查点

[Story009](../stories/009-local-checkpoint.md)在多轮小迁移后集中审阅：核对新旧文件、命令代码块和引用，执行完整本地检查，再明确选择文件暂存、检查staged差异及秘密扫描，最后本地提交。`git diff`未暂存时通常把移动显示成“删除＋未跟踪新文件”，暂存后再看rename统计更准确。

本地commit是可回退版本，不等于push、AWS CI或部署；`.local/`、target、凭证、私有输入及输出报告不进入提交。真浏览器、真机和云端证据仍分别记录。
