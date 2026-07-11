# Worldline Helper Boundary（2026-07-11）

本文档记录 `worldline` 模块在当前阶段的低风险结构化边界。

## 本次已落地

真实实现新增：

- `publish/domain/worldline/format-helpers.js`

既有真实实现继续保留：

- `publish/ui/worldline/view-helpers.js`

兼容入口继续保留：

- `publish/worldline-actions.js`

## 当前已归类的职责

### `ui/worldline`

当前继续承载：

- 世界线面板中的选择态 helper
- 展开 / 收起 helper
- 世界线时间线列表展示 helper
- 现实世界情节列表与选中态展示 helper
- 时间线 meta 拼装 helper

说明：

- 这一层以只读展示与交互派生值为主。
- 不承担世界线写回。

### `domain/worldline`

当前开始承载：

- `worldlineSafeId`
- `worldlineTurnEventId`
- `worldlineTurnDetail`
- `connectionWorldlineEvent`
- `factionAttrs`
- `factionRelations`

这些 helper 的共同特点：

- 纯构造 / 纯格式化
- 不直接写回 world lore
- 不直接操作 sqlite / storage
- 适合作为未来多端共用的世界线规则格式化层

### `worldline-actions.js`

当前仍保留：

- 世界线应用打开 / 关闭
- 兼容转发到 `ui/worldline/view-helpers.js`
- `realWorldline()` / `loreWorldline()` 这类数据读取组合
- `updateWorldlineFromTurn()` / `appendWorldlineEvent()` 等写回主链
- 与 `worldlinePlots`、`sqliteSave` 的协作调用

说明：

- 当前仍然是兼容壳 + 数据读取 + 写回编排混合入口。
- 但其中最稳的一簇纯构造 helper 已经收进 `domain/worldline`。

## 当前结论

`worldline` 当前最稳的阶段定位是：

- `ui/worldline` 已稳定
- `domain/worldline` 已开始落地极小纯构造 helper
- `worldline-actions.js` 仍保留写回编排与数据组合职责

这意味着它当前更接近：

- `ui + 极小 domain + 兼容壳`

而不是：

- 完整 `ui + domain + app`

## 当前停手边界

当前不建议继续深拆以下部分：

- `updateWorldlineFromTurn()`
- `appendWorldlineEvent()`
- `ensureWorldline()`
- `realWorldline()`
- `loreWorldline()`

原因：

- 这些逻辑已经进入数据组合、worldline 写回或持久化协作链。
- 与 `sqliteSave`、`worldlinePlots`、现实世界日志状态存在更强耦合。
- 在 `publish/worldline-actions.js` 有历史结构损坏记录的前提下，继续细碎替换风险高于收益。

## 后续建议

如果后续继续推进 `worldline`，推荐顺序是：

1. 继续以整簇为单位迁移纯构造 helper，不做零散替换。
2. 若要再引入 `domain/worldline` 新 helper，优先选择纯读取、纯格式化、纯派生逻辑。
3. 只有在读写链出现更明确边界后，才考虑是否需要单独的 `app/worldline` 或更深的 domain 切分。

## 本轮经验

本轮再次验证了一个重要规则：

- 对历史上修复过的旧大文件，不要在不稳定区域持续做多轮零碎替换。
- 更稳的做法是：先确定一个安全簇，再做一次整簇兼容壳重写。

这条经验对后续处理其它 repaired legacy file 同样适用。
