# U1 零基础学习入口：实施计划

## Summary

- Builds: 面向完全不懂技术、AI 和 AWS 的中文项目入口，说明阅读顺序、基本术语、现有文件和规则入口。
- Touches: `docs/learning/start-here.md`、`docs/learning/README.md`、`docs/README.md`、`scripts/checks/test-learning-entry.mjs`。
- Tests: 5 项入口导航与事实边界回归，加本地 Markdown 链接检查。

## 验收标准

- 读者从 `docs/README.md` 或 `docs/learning/README.md` 一步进入零基础入口。
- 按入口可找到项目用途、前后端、AWS、AI、文件用途与维护规则；首次出现的技术词汇有通俗解释。
- 入口对当前代码、历史发布记录与未经本轮线上核实的状态作清楚区分；已有 00–14 操作课程仍可找到。
- 新增或改动的本地链接能定位；不改网站/API、Terraform 或线上资源。

## 实施步骤

- [x] Step 1（FR1、FR3、FR7、NFR1）：核对 `docs/README.md`、`docs/learning/README.md`、`docs/architecture/overview.md`、`docs/ai/README.md` 和现有 `scripts/checks/test-docs.mjs`；确认 Node 内建 `node:test` 可用，不新增测试框架或配置。
- [x] Step 2（FR1、FR3）：在 `docs/learning/start-here.md` 写一页中文零基础导览，以日常比喻解释网站、前端、后端、API、云、AI 模型；给出清楚阅读顺序和现有课程入口。
- [x] Step 3（FR1、FR5、U1 验收）：在新入口放入可用的初始文件/目录地图与规则入口，覆盖 `frontend/`、`backend/`、`infra/`、`scripts/`、`docs/`、`aidlc/`、`AGENTS.md`、`.agents/skills/`；后续 U2/U4 再扩展逐文件说明与维护手册。
- [x] Step 4（FR1、FR3）：只修改 `docs/learning/README.md` 的入口指引及 `docs/README.md` 的学习入口和过时状态句；保留 00–14 课程与历史链接。
- [x] Step 5（FR1、FR3、NFR1）：新增 `scripts/checks/test-learning-entry.mjs`，使用现有 `node:test` 与文档链接检查函数做 5 项有针对性的导航/边界测试；运行本单元测试。
- [x] Step 6（FR7、NFR1）：运行 `node scripts/check-docs.mjs`、`git diff --check`；记录全仓库既存缺陷和本轮未验证范围，完成追踪与总结文件。

## 测试配置

沿用 Node 内建 `node:test` 和现有 `scripts/checks/check-docs.mjs`；无需修改 Vitest、Jest 或项目依赖。测试先于正文运行器确认，正文完成后写并运行测试，符合当前 `test-after` Testing Contract。纯文档单元没有可量化的代码行覆盖率要求；以导航、路径和事实边界验收。

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
