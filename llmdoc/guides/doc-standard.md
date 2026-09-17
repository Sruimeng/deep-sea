---
id: doc-standard
type: guide
---

# 文档规范

- 所有文档包含 YAML frontmatter：`id`、`type`。
- `type` 使用 `guide`、`reference`、`architecture` 或 `strategy`。
- 先写类型、结构与约束，再写流程。
- 流程优先用紧凑伪代码：`输入 → 校验 → 处理 → 输出`。
- 一篇只解释一个概念或流程，只记录确认事实。
- 不写“简介”“总结”等元叙述，不重复代码细节。
- 结构变化时同步 `index.md`；启动必读顺序集中在 `startup.md`。
