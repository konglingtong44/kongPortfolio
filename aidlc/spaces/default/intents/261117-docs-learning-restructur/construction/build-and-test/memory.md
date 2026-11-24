<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-11-24 — 六单元均交付项目文档和 Node 定向测试，Build and Test 的适用范围是本地文档导航、路径覆盖与既有前后端回归；不把本地构建视为 AWS 或浏览器验证。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-11-24 — 首次并行跨单元运行 35/36：文档检查器短暂创建的根目录临时夹具与文件地图 Git 可见扫描竞争。改用 Node `--test-concurrency=1` 串行运行后 36/36；未降低断言或覆盖目标。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
