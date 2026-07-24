---
id: realworld.location.query
category: 现实地点查询
name: 现实地图与地点查询
method: getCurrentLocationContext(), getLocationDetail(locationName), searchLocation(keyword), getNearbyLocations(locationName), listTopLocations(limit)
params: locationName: 地点名称，可为空表示当前地点；keyword: 地点、路线、附近、公司、学校、店铺等关键词
returns: 当前地点、上级地点、子地点、附近地点、地点说明和关键词命中地点
trigger: 现实世界推演中，行动涉及移动、观察周围、路线、导航、附近地点、房间、小区、公司、学校、商店、门口或楼下时查询。
---

# 现实地图与地点查询 Skill

## 激活描述

现实地图会随着剧情增长，现实推演不能默认读取完整地图树。需要移动、观察、找路或引用地点说明时，应按当前地点或关键词查询。

## 可用方法

1. `getCurrentLocationContext()`：读取当前地点、上级地点、子地点和地点说明。
2. `getLocationDetail(locationName)`：按地点名读取详情。
3. `searchLocation(keyword)`：按关键词搜索地点名和地点说明。
4. `getNearbyLocations(locationName)`：读取指定地点附近、同父级或子地点。
5. `listTopLocations(limit)`：只列出顶层地点名称。

## 使用规则

1. 未查询到的旧地点说明不得编造。
2. locationName 必须具体，不得写“玩家住处”“现实地点”“当前位置”。
3. 新增地点或地点说明必须是玩家本回合明确知道的事实。
4. 修改旧地点说明只能通过 locationDescriptionUpdates 返回明确变化。
5. 查询未命中时，返回 `hit:false` / `result:null` 的空结果；不要在地点查询里直接补齐。
6. 若空结果会影响本轮行动，Stage1 不再请求地点图补全；请基于当前上下文做符合逻辑的保守推演，并在正文结束后的 Stage4 地图更新 / Stage9 电子地图周围解锁中根据正文一次性持久化地点、户型、摆件与周围直接相邻地点。
