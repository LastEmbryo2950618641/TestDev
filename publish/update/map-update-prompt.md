# map-update

确认地点、地图节点、上级地点、地点说明、路线事实变化时，返回 updateType:"map"。

- 绑定卡片：地图卡。
- subject.type：location。
- field：current、parent、descriptionFacts、mapNodes、routeLinks。
- change.mode：set / append / update / upsert。
- reasons.trigger：写玩家到达、观察、导航、确认路线等触发条件。

旧 mapNodes/newLocations/locationDescriptionUpdates 仍可返回。