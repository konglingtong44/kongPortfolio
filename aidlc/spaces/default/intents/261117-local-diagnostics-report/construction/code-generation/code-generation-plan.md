# 本地只读诊断报告实施计划

范围：零 Unit 的 `express` 本地增量，依据 `requirements.md` 中 FR1–FR6、NFR1–NFR2。只改 PowerShell 入口、Story/学习文档；报告样例保留在被忽略的 `.local/aidlc/`。

## 实施步骤

- [ ] 1. 在 `scripts/ai/codex.ps1` 加入 `Report` 动作；在任何 Probe 初始化前拒绝 `Report -Probe`。
- [ ] 2. 隔离报告流程：读取 PowerShell 版本，尽力查询 AI-DLC 与 Codex CLI 版本；不因工具缺失、版本不符或退出码异常提前退出。
- [ ] 3. 调用本机 `aidlc doctor --json --offline` 并记录状态、退出码、原始诊断结果或错误；不调用 Configure、Launch、在线检查、AWS 或模型接口。
- [ ] 4. 以安全的时间戳文件名将同一事实集写为 JSON、Markdown；在两份写入成功时返回零，即使诊断状态异常。输出路径；写入失败返回非零。
- [ ] 5. 添加有意义的本地 PowerShell 检查，覆盖报告结构/未验证项、写入结果退出码策略、工具与 doctor 异常、`Report -Probe` 拒绝和既有动作回归。（已覆盖本机报告与 Probe 拒绝；其余分支仍待验证。）
- [ ] 6. 写一条短 Story，记录需求、实现和验收；更新 `docs/learning/README.md` 并新增中文学习记录，区分模拟测试和本机结果，列明未验证项。
- [ ] 7. 运行本地 PowerShell 检查、本机 `Report` 烟测、`node scripts/check-docs.mjs`；检查两格式内容与退出码，并通过前后读取确认模型/认证/项目配置未改变。（前三项已做；配置前后比较未做。）

## 假设与决定

- 采用 `Report`、UTC 时间戳文件名 `<timestamp>-codex-diagnostics.json` / `.md`；报告同时表达 `reportWritten` 与 `diagnosticsPassed`，防止两者混淆。
- 对 doctor 输出尽量保留在本地报告中；错误文本需限制长度并转义，绝不枚举或序列化环境变量、认证文件、完整配置。
- AI-DLC 或 Codex 缺失时记录不可用状态；可用的其余检查继续运行。
- PowerShell 结构检查覆盖范围及诊断故障注入方式按仓库现状选择最小可维护方案；真实本机报告单独记录。任何未能故障注入的路径不得宣称已验证。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
  "test_strategy": "minimal",
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
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
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
  "input_sha256": "sha256:4957b892a2faf1735e326805987097be44d68982d116e7f687565deea78a5cb7",
  "contract_sha256": "sha256:eefaa0edf5b985abbf77fe44e488c07be4528c79278e5fe1a54e64cb31360e81"
}
```
