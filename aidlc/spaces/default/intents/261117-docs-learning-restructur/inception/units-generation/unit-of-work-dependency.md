# 工作单元依赖

下列边只表示一个单元的文件、导航或验证确实需要另一个单元的产物，不表达优先级或推荐实施顺序。依据：[工作单元](unit-of-work.md)和[需求](../requirements-analysis/requirements.md)。

```yaml
units:
  - name: u1-learning-entry
    kind: spec
    depends_on: []
  - name: u2-file-map
    kind: spec
    depends_on: [u1-learning-entry]
  - name: u3-technology-guide
    kind: spec
    depends_on: [u1-learning-entry]
  - name: u4-maintenance-guide
    kind: spec
    depends_on: [u1-learning-entry]
  - name: u5-cleanup-proposal
    kind: spec
    depends_on: [u2-file-map, u3-technology-guide, u4-maintenance-guide]
  - name: u6-approved-cleanup
    kind: packaging
    depends_on: [u5-cleanup-proposal]
```

| 依赖方 | 直接依赖 | 具体接口或共享内容 |
|---|---|---|
| U1 | 无 | 现有 `docs/learning/` 入口与相对链接 |
| U2 | U1 | 文件地图加入 U1 的阅读导航；沿用其术语与链接约定 |
| U3 | U1 | 技术专题加入 U1 的阅读导航；来源状态与术语保持一致 |
| U4 | U1 | 维护专题加入 U1 的阅读导航 |
| U5 | U2、U3、U4 | 以已核对的文件目录、文章内容和维护入口判定重复及引用，形成文件级候选表 |
| U6 | U5 | 使用经负责人审核的候选表、影响与回退说明；清理后更新相关文档链接和检查结果 |

U2、U3、U4 彼此无直接依赖；在各自工作副本中只要有 U1 的入口，就能独立编写并验证，之后合并导航变更时解决同一入口文件的编辑冲突。U5 与 U6 是清理方案和执行的明确边界；审批是外部决策，不由 DAG 自动授予删除权限。
