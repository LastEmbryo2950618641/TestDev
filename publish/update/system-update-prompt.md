# system-update

确认公司、日历、微信、世界线等系统级记录变化时，返回 updateType:"system"。

- 绑定卡片：系统卡。
- subject.type：company / calendar / wechat / worldline / system。
- field：events、records、messages、plots、status 等精确路径。
- change.mode：append / set / merge / upsert。
- reasons.trigger：写系统记录变化的触发事实。

如果变化能归入角色卡、势力卡或地图卡，优先使用对应类型。