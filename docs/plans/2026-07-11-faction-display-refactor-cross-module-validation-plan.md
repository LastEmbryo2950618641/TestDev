# Faction Display Refactor Cross-Module Validation Plan（2026-07-11）

## 1. 目标

验证已经在 `wechat` 模块中反复证明有效的“展示层优先收口”方法，是否可以以同样低风险方式复制到 `faction` 模块。

本轮目标不是扩大 `faction` 的深层重构范围，而是先确认：

- `faction` 是否仍适合按“helper 真正实现 + 旧入口兼容壳 + 模板消费”的方式继续推进
- 哪一类展示切口最适合作为下一刀
- 在不触碰初始化、同步、结构生成和状态写回主链的前提下，能否稳定复制 `wechat` 的执行节奏

## 2. 涉及模块

主要涉及：

- `publish/ui/faction/overview-view-helpers.js`
- `publish/faction-actions.js`
- `publish/index.html`
- `docs/architecture/faction-ui-helper-boundary-2026-07-11.md`

辅助参考：

- `docs/architecture/wechat-display-refactor-playbook-2026-07-11.md`
- `docs/architecture/three-sample-playbook-2026-07-11.md`
- `docs/architecture/module-maturity-overview-2026-07-11.md`

## 3. 权威状态来源

本轮不改动 `faction` 的权威状态来源，只做展示层消费整理。

需要尊重的现有状态入口包括：

- `factionState`
- `selectedFactionId`
- 组织树与详情面板当前依赖的既有读取函数

本轮不新增新的状态主链，不改变谁写入这些状态。

## 4. UI 与交互入口

本轮优先关注：

- `faction` 详情面板中尚未收口的只读文案
- 组织树或详情页中仍然适合对象化的轻量展示切口
- 标题、副标题、badge、empty-state、row、dialog 文案等纯展示元素

本轮不改：

- 打开/关闭面板行为
- 初始化入口
- 组织树生成流程
- 任何同步或写回动作

## 5. 数据与持久化影响

本轮预期：

- 不新增状态字段
- 不修改持久化结构
- 不影响旧存档兼容
- 不引入新的资源生成链

## 6. 提示词 / 规则影响

本轮不涉及提示词主链和阶段规则调整。

若后续发现 `faction` 某些展示规则已被多个读链共享，再单独评估是否进入更接近 `real-world` 的跨读链规则收口。

## 7. 风险点

主要风险包括：

- `publish/faction-actions.js` 历史体量大，且部分区域存在编码/旧串痕迹
- `index.html` 中的 faction 区域可能仍存在旧模板拼装与行内表达式
- 若下一刀误碰初始化、同步或组织树生成链，风险会立刻放大

## 8. 实施步骤

1. 先用现有成熟文档确认 `faction` 当前允许推进的展示边界
2. 在 `index.html` 中锁定一块最小、纯展示、可对象化的切口
3. 先扩展 `publish/ui/faction/overview-view-helpers.js`
4. 再补 `publish/faction-actions.js` 的兼容转发入口
5. 最后替换模板消费并做最小验证
6. 同步更新 faction 边界文档，记录这次复制验证结果

## 9. 验收步骤

至少验证：

- 新 helper 方法名可检索
- `faction-actions.js` 中存在对应兼容壳
- `index.html` 已实际消费新 helper
- 不影响初始化 / 同步 / 组织树生成 / 状态写回主链
- `node --check` 对新增 helper 文件通过
- 文档已同步说明本轮边界与停手位置

## 10. 后续事项

若本轮验证通过，后续可以继续回答两个问题：

1. `wechat` 的“相邻展示岛逐块收口”方法是否可稳定复制到 `faction`
2. `faction` 是否适合作为下一阶段的“跨模块复制样板”，用于再推广到更多高耦合模块

## 11. 低风险结构化改造补充检查

### A. 本轮优先切口

本轮优先从 `faction` 的最小只读展示切口开始，而不是继续追求大面积模板收口。

优先目标类型：

- `title / subtitle / empty-state`
- `row` 列表对象
- `card / view object`
- 小型 dialog 或 panel 文案

### B. 兼容策略

本轮默认采用：

1. 新 helper 文件承接真实实现
2. 旧入口文件保留兼容转发
3. 模板逐步改为消费 helper 对象

### C. 本轮明确不碰的区域

- `initFactionSystem()`
- `syncCompanyFaction()`
- `normalizeFactionStructure()`
- 可见性 / 曝光评分链
- 任何组织关系写回链
- 任何需要重排状态主链的逻辑

### D. 停手条件

出现以下任一情况，本轮应停止继续深拆：

- 下一刀需要进入 `factionState` 写入主链
- 需要同时修改多个高风险旧文件的大段区域
- 继续推进将强依赖修复旧编码污染
- 无法给出 helper / 兼容壳 / 模板消费的最小证据

### E. 最小验证证据

- helper 方法名可检索
- 兼容壳入口存在
- 模板已实际消费 helper
- `node --check` 对新增 helper 文件通过
- faction 边界文档已同步说明复制验证结果

### F. 推荐参考文档

- `docs/architecture/encoding-collaboration-rules.md`
- `docs/architecture/ai-development-workflow.md`
- `docs/architecture/three-sample-playbook-2026-07-11.md`
- `docs/architecture/wechat-display-refactor-playbook-2026-07-11.md`
