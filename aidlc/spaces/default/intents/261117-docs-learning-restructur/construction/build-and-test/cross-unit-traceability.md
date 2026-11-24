# 跨单元需求覆盖

运行 `aidlc engine sensor-traceability --stage build-and-test`：`pass: true`，`uncovered: []`。下表是构建与测试阶段的需求到文件映射；自动追踪证明路径存在，不替代内容语义和线上状态的人工判断。

| ID | 负责单元 | 主要目标文件 | 判定 |
|---|---|---|---|
| FR1 | U1 | `docs/learning/start-here.md` | 已覆盖 |
| FR2 | U2 | `docs/learning/file-map-inventory.md` | 已覆盖 |
| FR3 | U1、U3、U5、U6 | `docs/learning/README.md`、`technology-guide.md`、`cleanup-proposal.md`、`docs/ai/README.md` | 已覆盖 |
| FR4 | U3 | `docs/learning/technology-guide.md` | 已覆盖 |
| FR5 | U4 | `docs/learning/maintenance-guide.md` | 已覆盖 |
| FR6 | U5、U6 | `docs/learning/cleanup-proposal.md` | 已覆盖；仅实施两处可逆文字修订 |
| FR7 | U1–U6 | `docs/README.md`、`docs/learning/start-here.md`、`docs/learning/README.md`、`cleanup-proposal.md` | 已覆盖 |
| FR8 | U6 | `docs/ai/aidlc-codex.md` | 已覆盖；未改运行行为 |
| NFR1 | U1–U4、U6 | `scripts/checks/check-docs.mjs`、各单元文档测试 | 已覆盖；本地链接检查通过 |
| NFR2 | U2、U3、U5 | `file-map-inventory.md`、`technology-guide.md`、`cleanup-proposal.md` | 已覆盖 |
| NFR3 | U2–U6 | `file-map.md`、`technology-guide.md`、`maintenance-guide.md`、`cleanup-proposal.md` | 已覆盖；未调用 AWS/付费模型 |
| NFR4 | U6 | `scripts/checks/test-approved-cleanup.mjs` 与 U5 方案回退栏 | 已覆盖 |
| NFR5 | U2、U4 | `scripts/checks/test-file-map.mjs`、`file-map-inventory.md` | 已覆盖 |

未覆盖 ID：无。测试层面的具体退出码见[测试结果](test-results.md)。
