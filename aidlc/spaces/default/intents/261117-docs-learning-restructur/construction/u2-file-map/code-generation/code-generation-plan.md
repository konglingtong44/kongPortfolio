# U2 项目文件地图：实施计划

## Summary

- Builds: 给零基础读者的目录导览，以及逐项说明项目手写文件用途与修改时机的文件清单。
- Touches: `docs/learning/file-map.md`、`docs/learning/file-map-inventory.md`、`docs/learning/start-here.md`、`docs/learning/README.md`、`scripts/checks/test-file-map.mjs`。
- Tests: 5 项文件清单覆盖、路径与导航回归，加现有 Markdown 链接检查。

## 验收标准

- 每个有效项目目录都有用途说明；Git 已跟踪的项目手写文件逐一出现在清单中，列明路径、所属功能、用途与修改时机。
- AI-DLC 安装件、运行记录、依赖下载和构建产物按类别说明来源与管理者，不把自动生成的内部文件逐项当成手写文件。
- 清单标明核对日期、范围、无法核实项与新增/移动文件后的更新办法；新读者从 U1 入口可以找到地图。
- 所有新添本地链接可解析；不移动、删除项目文件或改变网站/API 和 AWS 行为。

## 实施步骤

- [x] Step 1（FR2、NFR2）：盘点 `git ls-files` 和当前工作树中 U1 新增的手写文件；按项目手写、框架安装/运行记录、依赖/构建生成和私有忽略内容分类，并核对典型目录代码/配置来源。
- [x] Step 2（FR2、NFR5）：编写 `docs/learning/file-map.md`，用非技术语言解释每个有效目录、文件地图使用方法、生成目录管理者、核对日期及维护步骤。
- [x] Step 3（FR2、NFR2、NFR5）：编写 `docs/learning/file-map-inventory.md`，按目录逐一记录纳入范围的项目手写文件的真实路径、所属功能、用途与修改时机；对无法核实者写待核实，不推断。
- [x] Step 4（FR1、FR2、FR3）：从 `docs/learning/start-here.md` 和 `docs/learning/README.md` 加入文件地图入口，保留 U1 和现有 00–14 课程导航。
- [x] Step 5（FR2、NFR1、NFR5）：新增 `scripts/checks/test-file-map.mjs`，用现有 Node `node:test` 检验路径覆盖、分类边界、链接目标和导航等 5 项；仅运行该单元测试文件。
- [x] Step 6（FR7、NFR1）：运行 `node scripts/check-docs.mjs`、`git diff --check`；记录验证范围与未核实内容，完成追踪和实施摘要。

## 测试配置

沿用 Node 内建 `node:test` 与现有文档检查器，不新增测试依赖。仅有文档与文档回归脚本，没有应用代码行覆盖率目标。当前 Testing Contract 为 `test-after`：先完成地图，再编写并运行该单元测试。

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
