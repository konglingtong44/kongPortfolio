# U4 规则与流程维护入口：实施计划

## Summary

- Builds: 给非技术读者的“想改规矩或增加流程去哪里”维护指南。
- Touches: `docs/learning/maintenance-guide.md`、`docs/learning/start-here.md`、`docs/learning/README.md`、`docs/learning/file-map-inventory.md`、`scripts/checks/test-maintenance-guide.mjs`。
- Tests: 5 项规则/流程入口、路径与导航回归，加文档链接和文件清单检查。

## 验收标准

- 读者能按想改的内容，找到 `AGENTS.md`、AI-DLC 活动空间的 `memory/`、项目自写技能、学习资料与 Story 模板的维护入口。
- 清楚区分项目自写约定、AI-DLC 方法层、框架安装件、工具生成记录；说明新增普通项目步骤与新增 AI-DLC 生命周期阶段不是同一件事。
- 每个修改示例给出适用范围、验证方式和可能影响；不暗示直接改审计、状态、生成工具即可改变流程。
- U1 入口和课程目录可到达指南，新增项目自写文件进入逐文件清单，链接检查通过。

## 实施步骤

- [x] Step 1（FR5、NFR2）：核对 `AGENTS.md`、活动空间 `memory/`、`.agents/skills/portfolio-*`、`docs/stories/`、`docs/ai/aidlc-codex.md`、AI-DLC 框架目录的现有边界。
- [x] Step 2（FR1、FR5）：编写 `docs/learning/maintenance-guide.md`，用“想改什么→具体路径→改后检查”表解释约定、方法、技能、资料、Story 与部署步骤。
- [x] Step 3（FR5）：解释 AI-DLC `org → team → project → phase → stage` 方法层与项目可手改入口；说明普通项目流程与框架新增阶段/插件的差别，工具拥有的状态、审计和安装件不直接手改。
- [x] Step 4（FR1、FR3、NFR5）：更新 `docs/learning/start-here.md`、`docs/learning/README.md` 的导航，并把新指南与测试文件加入 `docs/learning/file-map-inventory.md`。
- [x] Step 5（FR5、NFR1）：新增 `scripts/checks/test-maintenance-guide.mjs`，用 Node 内建 `node:test` 做 5 项定向入口和路径检查；运行本单元测试。
- [x] Step 6（FR7、NFR1）：运行 `node scripts/check-docs.mjs`、`node --test scripts/checks/test-file-map.mjs`、`git diff --check`；记录结果与未验证项，完成追踪与摘要。

## 测试配置

沿用 Node 内建 `node:test` 与现有文档链接检查器，不新增测试框架或依赖。当前 Testing Contract 为 `test-after`；本单元是文档，无应用代码行覆盖率指标。

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
