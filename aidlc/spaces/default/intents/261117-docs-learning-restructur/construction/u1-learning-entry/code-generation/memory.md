<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs.

## Interpretations
- 2026-11-23T09:25:58Z — U1 的入口必须直接带读者找到初始文件地图和规则入口；U2、U4 后续再扩展，而不是让 U1 依赖尚未交付的页面。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-11-23T09:25:58Z — 编辑前全仓文档检查已有一条 AI-DLC 审计分片中的无效示例链接；审计记录由工具管理，本单元不手改它。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-11-23T09:28:40Z — 旧 `docs/learning/README.md` 是面向有终端经验读者的操作课程；本单元只加零基础入口与导览，保留 00–14 章及历史链接，避免把历史操作状态改写成当前云端状态。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
