# TimelineItems Candidate Assessment Note (2026-07-12)

## 目的

这份说明用于回答：

- `timelineItems` 是否适合作为 `timelineMeta` 之后的下一批 `worldline` compat 收缩候选
- 它和 `timelineMeta` 相比，风险点具体高在哪里
- 若后续真的推进，应先补什么前置条件

它不是实现方案，也不是删除脚本。

## 当前背景

当前已知：

1. `timelineMeta` 已完成主真源 + Android + desktop main + desktop minimal 的首轮跨端验证
2. `timelineItems` 在此前的残余 compat 清单中，已被标记为下一批更值得观察的只读入口之一
3. 当前目标不再是证明它“可能能动”，而是判断它是否已经具备复制试点路径的前提

## 当前真实调用关系

### 1. 主模板层

当前 `publish/index.html` 已不再细粒度直接调用：

- `timelineItems(lore)`

它现在消费的是：

- `loreTimelinePanelView(lore)`
- `realWorldTimelinePanelView()`

这说明从模板视角看，`timelineItems` 已经退到 panel contract 的内部上游。

### 2. view helper 层

当前 `timelineItems` 仍通过以下链路流动：

- `publish/ui/worldline/timeline-view-helpers.js`
  - 真实实现位置
- `publish/ui/worldline/view-helpers.js`
  - 对外 facade
- `publish/worldline-actions.js`
  - 动作层兼容桥接
- `publish/ui/worldline/timeline-panel-view-helpers.js`
  - `loreTimelinePanelView(lore)` 中消费
  - `realWorldTimelinePanelView()` 中消费

### 3. panel contract 层

`timelineItems` 当前直接承担：

1. lore 世界线 rows 的原始输入
2. real world timeline rows 的原始输入
3. 事件与原著剧情索引的统一拼装

也就是说，它比 `timelineMeta` 更靠近“行数据骨架”，不是单纯 meta 文本细节。

## 与 timelineMeta 的关键区别

### `timelineMeta`

更接近：

- row 内部一个字段的拼装逻辑
- 主要影响 `meta` 文本
- 试点时可先做本地 helper 内部化，而不改变 rows 结构

### `timelineItems`

更接近：

- rows 列表的源头数据拼装器
- 同时影响 lore / real 两个 timeline panel
- 涉及事件排序、story index 注入、kind / order 归一化

因此：

- `timelineItems` 虽然也是只读入口
- 但它的“结构影响半径”明显高于 `timelineMeta`

## 当前适合度判断

### 适合度：中等偏高，但尚未达到可直接实施

支持它作为下一批候选的证据：

1. 主模板已不再直接细粒度消费它
2. 它已经主要退化为 panel contract 的内部上游
3. 它仍属于只读数据拼装，不是 UI 写入点

阻止它立即进入实现的证据：

1. lore / real 两条 panel contract 都依赖它
2. 若直接削 facade，容易同时影响两条展示链
3. 当前 rows contract 还没有完全独立于 `timelineItems` 自身含义
4. 它和 `worldlineEventsNewestFirst` 的耦合比 `timelineMeta` 更深

## 若后续推进，前置条件应是什么

在 `timelineItems` 进入真实试点前，建议先补以下前置条件：

### 1. rows contract 再上移一步

最好先形成更明确的中间 contract，例如：

- lore timeline rows builder
- real world timeline rows builder

目标是让：

- `timelineItems` 不再直接等同于 panel rows 的源接口
- 而退化为更底层的内部拼装细节

### 2. 与排序 helper 的边界先分清

当前 `timelineItems` 内部直接使用：

- `worldlineEventsNewestFirst`

因此若不先明确：

- 排序逻辑归谁
- row list 归谁

后续容易把两个候选混成同一刀，增大风险。

### 3. Lore / Real 两条链要分别验证

因为它同时服务于：

- `loreTimelinePanelView(lore)`
- `realWorldTimelinePanelView()`

所以即使是最小试点，也必须分别证明：

1. lore panel rows 不回退
2. real panel rows 不回退
3. Android / desktop main / desktop minimal 都能跟上

## 当前不建议做的事

1. 直接从 `worldlineActions` 中删除 `timelineItems`
2. 直接删除 `view-helpers.js` 里的 `timelineItems` facade
3. 在没有 rows contract 过渡层的前提下，强行把它内联到多个 panel helper
4. 把 `timelineItems` 和 `worldlineEventsNewestFirst` 当同一刀一起处理

## 当前最合理的下一步

若继续沿这条线推进，建议顺序是：

1. 先补一份 rows contract 拆分草案
2. 明确 lore / real 两条 timeline panel 的上游边界
3. 再决定 `timelineItems` 是否能像 `timelineMeta` 一样先做“局部内部化试点”

## 当前结论

`timelineItems` 的确是 `timelineMeta` 之后最自然的下一批候选之一。

但和 `timelineMeta` 不同，它已经接近 rows 列表骨架层，而不是单个字段层。

因此当前更准确的判断是：

- 候选成立
- 适合继续推进
- 但还不适合直接实施删除/收缩
- 真正进入试点前，必须先补一层 rows contract 边界澄清
