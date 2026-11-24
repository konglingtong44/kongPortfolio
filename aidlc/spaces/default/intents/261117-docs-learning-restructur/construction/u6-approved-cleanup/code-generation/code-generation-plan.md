# U6 首批获准整理：实施计划

## Summary

- Builds: 两份 AI-DLC 入口说明的历史状态文字修正，保持原路径、历史数字、命令、入链和网站/API 行为。
- Touches: `docs/ai/README.md`、`docs/ai/aidlc-codex.md`、`docs/learning/cleanup-proposal.md`、`docs/learning/file-map-inventory.md`、`scripts/checks/test-approved-cleanup.mjs`。
- Tests: 5 项针对过时状态、日期、当前记录入口及保留原事实的回归；文档链接、文件地图、U5 方案和 diff 检查。

## 验收标准

- 仅执行 U5 首批两份文件的可逆文字修正。用户已明确要求本轮持续执行、无需再次逐步确认；该授权仅适用于本批文字修订，不延伸到移动、合并或删除。
- 2026-11-17 的安装、doctor、hook 信任数字和命令仍写成当日事实；正在运行的工作指向本次 AI-DLC 意图记录，不宣称 AWS、hook 健康或模型调用已验证。
- 原路径、入链和网站/API 行为不变；不动 AI-DLC 生成/审计文件、旧课程、Story 或项目 Skill。
- 前后检查均记录结果；U5 表格只把两项可逆文字修正标为本轮已处理，其余候选继续保留或待核实。

## 实施步骤

- [x] Step 1（FR6、NFR2）：核对 U5 首批范围与两份原文，运行修改前 `node scripts/check-docs.mjs`、文件地图和方案测试、`git diff --check`；记录基线。
- [x] Step 2（FR3、FR6、NFR2）：只修订 `docs/ai/README.md` 与 `docs/ai/aidlc-codex.md` 的 2026-11-17 状态语境和现行工作记录入口，保留历史命令、数字和链接。
- [x] Step 3（FR6、FR7）：更新 `docs/learning/cleanup-proposal.md` 两项状态和实施依据，明确未移动、合并或删除；其余候选维持原处理边界。
- [x] Step 4（FR7、NFR1）：新增 `scripts/checks/test-approved-cleanup.mjs` 的 5 项回归，更新 `docs/learning/file-map-inventory.md` 新文件行与数量，运行本单元测试。
- [x] Step 5（FR7、NFR1、NFR4）：运行修改后文档、文件地图、方案、U6 测试与 `git diff --check`，核对原入链、历史数字和命令，记录未验证项。
- [x] Step 6（FR7、NFR2）：写实施摘要、源文件清单和需求追踪；不创建 AWS 资源或部署。

## 测试配置

沿用 Node 内建 `node:test`，不新增依赖。Testing Contract 是 `test-after`；本单元只修改手写文档，不涉及数据、API、前端运行层。单元测试与全仓文档检查覆盖修订边界；无应用代码行覆盖率目标。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "bugfix",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop`, `classic` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "project",
      "text": "- Frontend changes: `npm --prefix frontend test` and `npm --prefix frontend run build`.\n- Backend changes: `mvn -B -ntp -f backend/pom.xml verify`; Lambda changes also require the Lambda profile and actual ZIP smoke check described in the project Story skill.\n- Documentation changes: `node scripts/check-docs.mjs`. The full local check entry remains `scripts/check.ps1`; secret hooks fail closed.\n- Record local tests, real browser/Worker checks, device simulation, physical devices, containers, AWS STG and production separately. An omitted check stays unverified."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Include a targeted regression for the bug or vulnerability.",
      "Keep the existing test suite green."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:f128de2f144eec6a684b0f965d0ce7bb08e8c7c3a33cab78188e330ab851c237",
  "contract_sha256": "sha256:44f25bd8d407db3e8e0c6a4581a816911dc9da569dede7ab521379a82723445a"
}
```
