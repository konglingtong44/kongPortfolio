# U3 技术、AI 与 AWS 入门：实施计划

## Summary

- Builds: 零基础技术导览，解释实际使用的前后端、AI、AWS、交付技术及各自取舍。
- Touches: `docs/learning/technology-guide.md`、`docs/learning/start-here.md`、`docs/learning/README.md`、`docs/learning/file-map-inventory.md`、`scripts/checks/test-technology-guide.mjs`。
- Tests: 5 项证据链接、实际/教学比较边界和导航测试，另跑项目文档链接检查。

## 验收标准

- 读者能理解 React/TypeScript/Vite、Java 21/Spring Boot、Docker/Compose、Terraform、AWS 发布链路与 Bedrock/Qwen 各负责什么、带来哪些好处。
- 每一项当前项目使用事实指向实际源码、构建或 Terraform 配置；与替代技术的比较标明“教学比较”，不伪称项目曾选择或部署它。
- 清楚区分仓库代码、历史发布证据与本轮未查询的实时线上状态；不把 AI-DLC、Codex 或自主 Agent 写成网站运行时能力。
- 从零基础入口与学习总目录可找到本篇；文件清单同步新增路径，已有课程仍可达。

## 实施步骤

- [x] Step 1（FR4、NFR2）：核对前端依赖/入口、后端构建/入口、Docker/Compose、五个 Terraform 根栈、AWS 构建与问答源文件，记下实际事实和未核实边界。
- [x] Step 2（FR1、FR4）：编写 `docs/learning/technology-guide.md`，先用非技术语言解释网站访问与开发/部署，再按前端、后端、本地运行、基础设施、交付、AI 分段说明实际技术、为什么这样组织及收益。
- [x] Step 3（FR4、NFR2）：为每项技术加真实文件依据；教学比较单列并标注非历史决策，线上状态只引用带日期历史证据，不写成实时部署保证。
- [x] Step 4（FR1、FR3、FR7、NFR5）：从 `docs/learning/start-here.md`、`docs/learning/README.md` 加本篇入口，并把本篇和测试文件加入 `docs/learning/file-map-inventory.md`。
- [x] Step 5（FR4、NFR1）：新增 `scripts/checks/test-technology-guide.mjs`，使用现有 Node `node:test` 写 5 项定向导航、证据链接与表述边界测试；运行该单元测试。
- [x] Step 6（FR7、NFR1）：运行 `node scripts/check-docs.mjs`、`node --test scripts/checks/test-file-map.mjs`、`git diff --check`，记录结果和未运行项，完成追踪与摘要。

## 测试配置

沿用 Node 内建测试运行器、文档链接检查器，不增依赖；纯资料单元不适用应用代码行覆盖率。当前 Testing Contract 为 `test-after`，先写技术资料再写并运行对应测试。

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
