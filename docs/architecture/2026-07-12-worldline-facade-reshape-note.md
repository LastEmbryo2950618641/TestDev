# Worldline Facade Reshape Note (2026-07-12)

## 当前结论

`publish/worldline-actions.js` 中的 `worldlineViewHelperForwarders` 不是纯死代码，也不是可直接删除的重复层。
它当前承担的是“向 store / 模板暴露稳定 worldline action 名称”的 facade 责任。

## 证据

1. 模板直接消费的是 action 名称，而不是底层 helper 名称。
例如 `publish/index.html` / Android 镜像 `index.html` 中直接使用：
- `controlWorldLores()`
- `toggleWorldline(lore)`
- `isWorldlineOpen(lore)`
- `realWorldTag()`
- `realWorldLore()`
- `selectWorldlineDebugSection(name)`
- `isWorldlineDebugSection(name)`
- `selectRealWorldPlot(id)`

2. `worldlineActions` 当前通过 `worldlineViewHelperForwarders` 将上述稳定 action 名称映射到：
- `selectDebugSection`
- `isDebugSection`
- `toggleLore`
- `isLoreOpen`
- `controlLores`
- `realTag`
- `realLore`
- `worldlineEventsNewestFirst`
- `selectRealWorldPlot`

3. 因此 forwarder 当前不是“无人使用的中间层”，而是 action 命名面与 view helper 内部命名之间的适配层。

## 结构问题

虽然不能直接删除，但它仍有重构空间：

1. action 层与 `ui.worldline.viewHelpers` 当前耦合偏紧。
2. `worldlineViewHelperForwarders` 作为字典式映射，维护成本较低，但也隐藏了调用边界。
3. 若未来继续收口，可考虑：
- 将部分与状态相关的方法下沉到 `stateService`
- 将查询型方法下沉到 `queryService`
- 将纯展示格式方法继续留在 helper 层
- 保持 action 名称稳定，但减少 action -> ui helper 的直接耦合

## 当前建议

1. 暂不删除 `worldlineViewHelperForwarders`。
2. 第二阶段若继续处理 worldline，应以“重组 action 与 service/helper 的职责边界”为目标，而不是直接删除 forwarder 项。
3. 在未调整模板调用和 store 暴露边界前，应继续保留当前 action 名称面。
