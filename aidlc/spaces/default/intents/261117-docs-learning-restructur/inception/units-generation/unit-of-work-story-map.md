# 需求到工作单元的映射

User Stories 阶段未纳入本计划，因此按已批准的功能需求 ID 映射。单元目录见[工作单元](unit-of-work.md)；依赖见[依赖图](unit-of-work-dependency.md)。一行列多个单元表示需求跨成果，单元内部的具体文件与验收步骤在实施计划中细化。

| 需求 ID | 实现单元 ID | 单元目录 | 对应部分 |
|---|---|---|---|
| FR1 | U1 | `u1-learning-entry` | 零基础入口、阅读顺序和术语 |
| FR2 | U2 | `u2-file-map` | 目录与逐文件地图、来源分类 |
| FR3 | U1; U3; U5; U6 | `u1-learning-entry`; `u3-technology-guide`; `u5-cleanup-proposal`; `u6-approved-cleanup` | 入口连接旧文章、专题修订、重复候选与获准整理 |
| FR4 | U3 | `u3-technology-guide` | 技术与替代方案、证据状态 |
| FR5 | U4 | `u4-maintenance-guide` | 规则、技能和流程维护入口 |
| FR6 | U5; U6 | `u5-cleanup-proposal`; `u6-approved-cleanup` | 文件级方案、审核后执行 |
| FR7 | U1; U2; U3; U4; U5; U6 | `u1-learning-entry`; `u2-file-map`; `u3-technology-guide`; `u4-maintenance-guide`; `u5-cleanup-proposal`; `u6-approved-cleanup` | 每项成果独立验收，变更时更新链接和检查证据 |
| FR8 | U6 | `u6-approved-cleanup` | 清理时维持网站/API 和 AWS 边界 |

## 跨单元质量条件

| 需求 ID | 适用单元 | 验证重点 |
|---|---|---|
| NFR1 | U1; U2; U3; U4; U6 | 新增或修改的本地 Markdown 链接通过项目检查器 |
| NFR2 | U2; U3; U5 | 文件用途与技术说明有来源，未核实之处标注 |
| NFR3 | U2; U3; U4; U5; U6 | 不纳入秘密和私有资料，不触发付费 AWS 操作 |
| NFR4 | U6 | 获准改动可回退，相关本地检查前后可对比 |
| NFR5 | U2; U4 | 文件地图有核对日期及更新入口 |

所有 FR1–FR8 均有至少一个实现单元；U1–U6 均承担至少一项功能需求。单元内部不在此指定经济顺序；每个实施计划应从其映射需求选择可验证的验收条件。
