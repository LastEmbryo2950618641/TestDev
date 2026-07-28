---
id: realworld.property.searchNode
category: 现实地点图
name: 现实地点图与房产查询
method: searchNode(keyword), getNode(nodeId), pathByNodeId(nodeId), nearbyBfs(nodeId, depth), searchByPerson(name, mode), searchContracts(params), authorityPath(nodeId)
params: keyword/nodeId/name/depth
returns: 地点图节点、完整路径、周围 POI、合同、归属、债务与最高解释权
trigger: 需要只读查询地点图、建筑/楼层/房间/功能区/摆件/容器物品、房产、租约、周围直接相邻 POI 时使用。
---

# 现实地点图与房产查询 Skill

## 使用规则

1. 本 skill 只提供查询，不提供 Stage1 地图新增或补全入口。
2. 地点未命中时，不要在 Stage1 请求地点图补全；根据上下文做符合逻辑的保守推演。
3. 地图、户型、摆件、容器物品与周围直接相邻 POI 的持久化，统一交给正文结束后的 Stage4 地图更新 / Stage10 电子地图周围解锁。
4. 查询房产、租约和债务时，以节点上的 `ownerRefs`、`usageContracts[]`、`debtAmount` 为真源。
5. 周围地点必须是 POI 图中的直接相邻地点；楼梯、走廊、房间、卧室、摆件只属于建筑内部树。

## 方法说明

- `searchNode(keyword)`：模糊查询 POI、楼层、房间、功能区、大型摆件、容器物品。
- `getNode(nodeId)`：按真实 `loc_N`、旧地图 id 或名称读取节点详情。
- `pathByNodeId(nodeId)`：返回从顶层到目标节点的完整路径。
- `nearbyBfs(nodeId, depth)`：以节点所属 POI 为中心查询周围直接相邻地点。
- `searchByPerson(name, mode)`：按所有者/使用者查询相关房产节点。
- `searchContracts(params)`：查询合同、月租、欠款与催债状态。
- `authorityPath(nodeId)`：查询归属与最高解释权。

