# 12｜目录重构后的浏览器验收

[学习路线](README.md) · [Story010](../stories/010-browser-regression.md)

2026-11-17。本地 Chrome 核心回归已执行。源码为 `fc455d3ac58eb8aa7cad13a01afe6fdbe50cd7cc`，本轮只更新验证文档，没有修改应用代码。

## 环境与证据

使用 `./scripts/dev.ps1` 启动本地前后端，代理 `http://127.0.0.1:5173/api/health` 返回 `UP`，`/api/bedrock/questions` 返回 `enabled=false`。后端访问日志未出现POST请求；本次未调用真实模型或AWS。

浏览器标签接口仍返回host unavailable，但原生窗口接口重试后可用。通过原生鼠标／键盘操作 Chrome 访客窗口，DevTools Responsive 指定视口；安装文件版本 `157.0.8103.79`。这是单一Chromium引擎的交互实测，没有Playwright runner、WebKit或物理手机。

47张原始窗口PNG保存于 ignored `.local/browser-regression/`，包含模拟视口尺寸工具栏；`results.json` 列出截图与SHA256，`backend-check.txt` 保存后端检查日志。截图证明观察到的页面状态，不构成自动测试套件。

## 实际覆盖

| 视口／语言 | 实际动作与结果 | 示例截图文件名 |
|---|---|---|
| 1366×900，日／中／英 | 三语首屏内容及桌面双栏；手动切换均生效且刷新保留；中文项目／架构详情开关，英文技术导航，日语资格收展与正则重置 | `ja-1366-intro.png`、`zh-1366-architecture-dialog.png`、`en-1366-skills.png` |
| 390×844，日／中／英 | 三语首屏与底部导航；日语简介／经历收展、项目横滑、时间线点击定位与卡片打开；中文架构详情；英文03连续滚动和项目02定位 | `ja-390-career-expanded.png`、`zh-390-architecture-dialog.png`、`en-390-skills-middle.png` |
| 320×568，日／中／英 | 中文与英文默认首屏标题／按钮未越界；日语保留展开状态的首屏；日语正则内部滚动，输入／测试按钮及关闭入口可达；英文详情标题换行、时间线独立纵向拖动，右侧项目02不变 | `ja-320-regex-scrolled.png`、`zh-320-intro.png`、`en-320-timeline-scroll.png` |
| 844×390，日／中／英 | 日语正则和中文架构弹窗内部可滚动，关闭入口可见；英文项目02从竖屏切横屏仍保留，卡片能打开对应详情 | `ja-844-regex-controls.png`、`zh-844-architecture-scrolled.png`、`en-844-project-dialog.png` |

日语390px下点击Route 53显示说明气泡，气泡位于弹窗内；再次点击同节点关闭。日语320px关闭正则面板后按空格重新打开，Escape关闭后入口有焦点轮廓，验证了该面板的焦点返回。

## 真实正则Worker

使用页面自身的Worker，没有替换成RegExp单元测试或模拟对象。

| 输入／动作 | 观察结果 | 截图 |
|---|---|---|
| 默认邮箱模式＋`hello@example.com` | 一致しました | `ja-390-worker-match.png` |
| 改为`not-an-email`后测试 | 编辑先清除旧结果，再显示一致しません | `ja-390-worker-no-match.png` |
| 模式`[`后测试 | 显示无效正则提示 | `ja-390-worker-invalid.png` |
| 模式`(a+)+$`，40个`a`后接`!` | 显示停止处理／简化模式提示；页面保持可操作 | `ja-390-worker-timeout.png` |
| 再次启动耗时测试后立即关闭，再重开 | 默认邮箱模式和样例恢复，结果为空；没有观察到旧结果写回 | `ja-390-worker-reopen.png` |
| 桌面把模式改为`^test$`，再点重置 | 恢复默认邮箱模式与图示 | `ja-1366-regex-reset.png` |

页面代码的超时阈值为800ms；此次只观察到超时提示，没有测量精确耗时或独立采集Worker生命周期。前端81项与生产构建也通过，但不替代上面的浏览器实测。

## 未覆盖

继续补测已覆盖：在同一新访客来源`localhost:5173`上，尚未手选语言时依次用Sensors Locale模拟`de-DE`、`en-US`、`zh-TW`、`ja-JP`并刷新，页面分别显示日／英／中／日；首例证明不支持语言回退。手选英文后改为`zh-CN`再刷新仍是英文。五张证据以`language-`开头；随后将Sensors恢复为No override。

关闭设备模拟后，桌面鼠标拖动时间线，右侧项目01保持不变且没有弹窗；明确点击项目04后，其详情按桌面设计打开，见三张`desktop-mouse-`截图。手机时间线点击仅定位，与桌面行为分开记录。

不是所有动作×语言×尺寸的完整交叉矩阵。全部架构节点及空白／图面滚动关闭气泡仍未重测，不能从同节点关闭推断其他关闭方式通过。

未验证WebKit、物理iPhone、软键盘、容器运行或AWS部署；本地模拟通过不代表这些环境通过。
