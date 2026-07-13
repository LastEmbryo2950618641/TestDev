# 2026-07-11 Company Actions Syntax Stabilization Audit

本轮针对 `publish/company-actions.js` 做了第一轮语法稳定化探测与最小修复尝试。

## 1. 已确认的现状

`publish/company-actions.js` 当前不是单点断串，而是前半段存在多处成片历史污染：

- `normalizeCompanyPolicy()` 附近存在未闭合字符串
- `normalizeEmploymentRecords()` 附近存在状态字符串断裂
- `employmentDurationText()` 附近存在模板字符串损坏
- `companyFieldReason()` 是整段高污染区
- `companyPromptContext()` 也存在整段模板字符串破损
- `applyRecruitment()` 附近仍有多处历史断串

## 2. 本轮已做的最小修复

本轮只做了最前面几处明显会阻断 parser 的小修：

- `normalizeCompanyPolicy()` 中的 `workMode` 默认文案
- `normalizeCompanyPolicy()` 中的 `rules` 默认文案
- `normalizeEmploymentRecords()` 中的状态文案
- `employmentDurationText()` 中的返回模板字符串

这些修复用于确认：

- 当前文件是否能通过“少量前置修复”恢复到可继续逐段推进的状态

## 3. 当前判断

结果表明：

- 文件可以被继续往后推进报错点
- 但当前不再是“几行修完”的级别
- 后续会立即进入 `companyFieldReason()` / `companyPromptContext()` 这类成片字符串损坏区域

这意味着：

- 后续若继续修，应该按“块级稳定化批次”处理
- 不应和展示层对象化、功能开发混在同一轮
- 不应在没有专门 validation 记录的前提下继续大面积改写这些提示文本函数

## 4. 风险判断

当前最大风险不是玩法逻辑，而是：

- 提示上下文文案函数中混入大量损坏模板字符串
- 一旦盲修，容易改坏提示结构或误伤后续 AI 生成语义
- 单轮内继续扩大修改面，收益会快速下降

## 5. 建议的下一步

建议后续单独开一轮：

1. 专修 `companyFieldReason()`
2. 再修 `companyPromptContext()`
3. 然后再看 `applyRecruitment()` 与记录状态相关文案
4. 每完成一个块，就重新 `node --check publish/company-actions.js`

## 6. 本轮结论

本轮没有完成 `publish/company-actions.js` 的完全语法恢复。

但本轮已经提供了两个重要结果：

- 证明该文件的污染是“块级问题”，不是零散单点问题
- 给后续稳定化批次标出了最危险、最应该拆开的修复区域
