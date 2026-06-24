# item-update

确认物品、装备、穿着、库存归属或数量变化时，返回 updateType:"item"。

- 绑定卡片：物品所属角色卡；玩家物品绑定玩家卡。
- field：inventory.<物品ID或名称>、wearing.<槽位>、equipment.<槽位>。
- change.mode：create / delete / transfer / delta / set / upsert。
- transfer 必须写 fromValue 与 toValue。
- 购买、赠送、交还、损坏、消耗、遗失都要写原因。

旧 itemActions / lexiconUpdates 可继续返回。