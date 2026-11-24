# 构建与测试汇总

## 范围与状态

本轮交付六个文档单元：零基础入口、文件地图、技术导览、维护指南、逐文件整理方案和两份 AI 文档的历史状态修订。项目文件夹没有发生物理搬移。测试按既有 Node 运行器和项目本地构建命令执行；AWS、容器、浏览器和真实模型不在本轮操作范围。

## 测试类型

- 六个单元各 5 项定向 Node 测试；文档检查器已有测试。
- Standard 跨单元集成：入口、链接、清单、U5→U6 边界共跑。
- 前端 npm 与后端 Maven 本地回归均通过：前端 81 项、后端 45 项，两个构建命令退出 0。
- 性能和云端安全动态测试不适用于本次文档文字修改；秘密与路径边界依赖既有仓库检查和人工核对。

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| NFR1 | `requirements.md` NFR1 | 新入口本地 Markdown 链接全部通过 | 最终复测 402 份 Markdown 本地目标通过 | `node scripts/check-docs.mjs`，退出 0 | build-and-test | Met |
| NFR5 | `requirements.md` NFR5 | Git 可见项目手写文件均在清单 | 318 项清单且路径覆盖测试 5/5 | `node --test scripts/checks/test-file-map.mjs`，退出 0 | build-and-test | Met |
| TC-UNIT | 六份 `code-generation-plan.md` Testing Contract | 每个单元 5–8 项定向测试且现有套件保持绿色 | 六单元各 5/5；文档检查器 6/6；前端 81/81、后端 45/45 | [测试结果](test-results.md) | build-and-test | Met |
| TC-INTEGRATION | 六份 Testing Contract Standard 策略 | 关键文档边界集成检查通过 | 串行 36/36；首次并行 35/36，临时夹具竞争已通过运行配置修正 | [集成测试说明](integration-test-instructions.md)、[测试结果](test-results.md) | build-and-test | Met |
| NFR4 | `requirements.md` NFR4 | 首批修订可回退，原入口与链接仍有效 | 原路径和入链保留，U5 方案有逐文件回退步骤 | [整理方案](../../../../../../../docs/learning/cleanup-proposal.md)、`node scripts/check-docs.mjs` | build-and-test | Met |

## 就绪判断

本轮文档交付的本地构建和测试已就绪；所有适用目标为 Met。未验证真实浏览器、Docker/Lambda ZIP、AWS STG/生产、远程链接、hook 执行健康或真实模型效果，不能据此称为已部署。
