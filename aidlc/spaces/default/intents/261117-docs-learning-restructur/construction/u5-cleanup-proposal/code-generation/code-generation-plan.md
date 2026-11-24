# U5 文件级整理方案：实施计划

## Summary

- Builds: 可逐项审核的文档/目录清理候选表，说明保留、合并、移动或修正的依据与回退。
- Touches: `docs/learning/cleanup-proposal.md`、`docs/learning/README.md`、`docs/learning/file-map-inventory.md`、`scripts/checks/test-cleanup-proposal.mjs`。
- Tests: 5 项候选完整性、目标路径、清理边界和导航测试，加现有文档/文件地图检查。

## 验收标准

- 每个候选有精确路径、现有用途、仓库引用证据、历史价值、处理建议、影响、验证和回退；证据不足的候选明确保留或待核实。
- 不因 AI-DLC 已安装而默认删除项目文档、技能或历史记录；不移动五个 Terraform 根栈或更改状态键。
- 方案只记录建议和待审核状态，本单元不移动/删除文件，也不改变网站/API、CI/CD 或 AWS 资源。
- 首批可执行范围足够小，供 U6 按明确的文件级选择实施；导航和清单保持可达。

## 实施步骤

- [x] Step 1（FR6、NFR2）：对照 `docs/README.md`、`docs/learning/`、`docs/ai/`、`docs/stories/`、项目技能与 AI-DLC 方法/安装目录，使用 `rg` 与 Git 列表核对候选的用途、相互引用和历史日期。
- [x] Step 2（FR6、FR8）：编写 `docs/learning/cleanup-proposal.md`，每项候选逐文件列出路径、用途、引用证据、历史保存价值、建议、影响、验证、回退与审核状态；明确保留、待核实与可进入首批的边界。
- [x] Step 3（FR3、FR6）：对多处资料重复但各有读者/证据作用的文件写保留或导航整理理由；不把旧发布结果写成实时状态，不触动生成的 AI-DLC 审计/状态文件。
- [x] Step 4（FR3、FR7、NFR5）：从 `docs/learning/README.md` 增加方案入口，并把新增项目手写文档和测试文件纳入 `docs/learning/file-map-inventory.md`。
- [x] Step 5（FR6、NFR1）：新增 `scripts/checks/test-cleanup-proposal.mjs`，用 Node 内建 `node:test` 写 5 项方案完整性、路径和无删改边界回归；运行本单元测试。
- [x] Step 6（FR7、NFR1）：运行 `node scripts/check-docs.mjs`、`node --test scripts/checks/test-file-map.mjs`、`git diff --check`，记录验证与未核实项，完成追踪和摘要。

## 测试配置

沿用 Node 内建 `node:test`、现有文档检查器与文件地图测试，不新增依赖。当前 Testing Contract 为 `test-after`；此单元只产出整理方案和导航，没有应用代码覆盖率指标。实际文件改动留给 U6。

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
