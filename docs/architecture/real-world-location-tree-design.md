# 现实地点图结构与电子地图设计草案

> 状态：设计稿 v0.1  
> 目标：把“地点”从当前扁平地图节点，升级为由 AI 生成、系统持久化的“势力树 + POI 图 + 建筑内部属性树”；电子地图只显示 POI 图节点。

## 1. 结论

当前问题主要不是“画布怎么画”，而是地点数据模型仍偏扁平：

- 现有提示词已经要求“地图节点只写建筑物级 POI”，禁止把走廊、楼梯、房间写成地图节点。
- 现有代码仍允许 `mapNodes[]`、`routeNodes[]`、`current` 等结果被整理进 `realWorldMap.nodes`，再靠 `mapExteriorName()` / `isInteriorLocationName()` 做事后归一化。
- 这会导致 AI 一旦输出“省市区街道社区 + 小区3栋”或“3栋楼梯”，地图层就可能混入非目标层级。

新设计应改为：**AI 必须直接输出“势力归属 + POI 图边 + 建筑内部属性树”的结构；代码只做 schema 校验、缺失检测、持久化与展示，不把错误层级硬凑成正确节点。**

## 2. 目标结构：势力树 + POI 图 + 建筑内部属性树

地点系统不是一整棵单纯的树，而应拆成三层数据结构：

1. **势力 / 行政 / 组织层级是树**：`势力 -> 势力层级1 -> 势力层级2 -> 势力层级N`。
2. **地点 POI 是挂在势力层级 N 下的图节点集合**：同一势力层级下可以有多个 POI，POI 之间通过边表达“直接相邻 / 可达 / 距离”。
3. **建筑内部是 POI 的属性结构**：楼层、房间、户型、功能区、大型摆件和容器物品都属于某个 POI 的 `interiorLayout`，不是电子地图图节点。

推荐结构如下：

```text
势力树 orgTree
└── 势力层级1
   └── 势力层级2
      └── 势力层级N
         └── pois: [地点 POI, 地点 POI, 地点 POI, ...]

POI 图 poiGraph
地点 POI A（地点名，电子地图显示用）
├── edge: 直接相邻 -> 地点 POI B
├── edge: 直接相邻 -> 地点 POI C
└── interiorLayout（POI 属性，不是图边）
   └── 楼层
      └── 房间号 / 房间名
         └── 户型 / 空间布局（room.layout.shapes）
            ├── 房间内的房间（卧室、书房、卫生间、衣帽间等，可继续嵌套）
            │  └── 子房间布局（同样使用 layout.shapes）
            ├── 功能区（客厅区、睡眠区、书桌区、玄关区等）
            │  └── 功能区展示布局（同样使用 layout.shapes）
            └── 大型摆件 / 可点击结构（shape.objects 或 slotObjects）
               └── 容器内 / 上方 / 挂载 / 关联的小物品（containerContents）
```

其中：

- `势力层级N` 只负责归属：它拥有或管辖一组 POI，但不把 POI 当成树形子地点继续展开周边地点。
- `地点 POI` 是电子地图显示层，只能是建筑物级或同级具体地点，例如 `锦苑小区3栋`、`小区门口商店`、`玉林北路便利店`。
- `周围直接相邻地点 POI` 不是当前 POI 的 child，而是 POI 图上的 edge：`fromPoiId -> toPoiId`。
- `directNeighbor` 边表示两个 POI 直接相连，路径中间没有其它具体地点；距离、路线说明、估算依据都应写在边上。
- `楼层`、`房间`、`房间内功能区`、`卧室`、`大型摆件`、`容器物品` 全部属于某个 POI 的内部属性，不显示为电子地图 POI 节点。
- 势力与地点不混在一个 map 节点里；POI 通过 `ownerOrgId` / `effectiveOrgId` / `factionPath` 引用势力树。

## 3. 当前实现对照

| 需求 | 当前实现 | 差距 |
| --- | --- | --- |
| 电子地图显示建筑物 | `realWorldMap.nodes` 扁平保存，`isMapDisplayNode()` 过滤 | 过滤是事后补救，不是源头约束 |
| 建筑内部层级 | `interiorLayout.floors[].rooms[]` 支持楼层/房间 | 支持一部分，但没有统一树路径 |
| 房间内功能区 | `layout.shapes` / `slotObjects` 支持 | 已接近目标，可纳入统一树 |
| 周围地点 | `surroundLocations[]` 由 AI 生成 | 只挂在迷雾解锁流程，不是地点树统一字段 |
| 先查询是否满足 | 目前多处直接补齐或归一化 | 缺少“树完整性检查 -> AI JSON patch”的闭环 |
| 势力层级 | 另有 org/territory 系统 | 尚未与地点树形成清晰引用结构 |

## 4. 新数据模型建议

### 4.1 顶层结构

顶层应显式拆成 `orgTree`、`poiGraph` 和 `interiors` 三类，而不是把“周围地点”塞进当前 POI 的 `children`。

```json
{
  "locationTreeVersion": 2,
  "orgTree": {
    "rootOrgId": "country-china",
    "nodes": [
      {
        "id": "community_jinyuan",
        "type": "org",
        "name": "锦苑小区",
        "parentId": "yulin-street",
        "children": []
      }
    ]
  },
  "poiGraph": {
    "nodes": [
      {
        "id": "poi_jinyuan_3",
        "type": "poi",
        "name": "锦苑小区3栋",
        "displayName": "锦苑小区3栋",
        "ownerOrgId": "community_jinyuan",
        "effectiveOrgId": "community_jinyuan",
        "ownerRefs": [{ "type": "org", "id": "community_jinyuan", "name": "锦苑小区物业", "role": "管理方" }],
        "effectiveAuthorityRef": { "type": "org", "id": "community_jinyuan", "name": "锦苑小区", "reason": "该 POI 位于锦苑小区势力/管理范围内，拥有最高解释权。" },
        "factionPath": ["country-china", "sichuan", "chengdu", "wuhou", "yulin-street", "community_jinyuan"],
        "mapVisible": true,
        "known": true,
        "interiorId": "interior_poi_jinyuan_3"
      },
      {
        "id": "poi_shop_1",
        "type": "poi",
        "name": "小区门口便利店",
        "displayName": "小区门口便利店",
        "ownerOrgId": "community_jinyuan",
        "ownerRefs": [{ "type": "entity", "id": "shop-operator", "name": "便利店经营者", "role": "经营者" }],
        "effectiveAuthorityRef": { "type": "org", "id": "community_jinyuan", "name": "锦苑小区", "reason": "位于小区门口管辖范围内。" },
        "mapVisible": true,
        "known": true
      }
    ],
    "edges": [
      {
        "id": "edge_jinyuan3_shop1",
        "fromPoiId": "poi_jinyuan_3",
        "toPoiId": "poi_shop_1",
        "relation": "direct-neighbor",
        "directNeighbor": true,
        "noIntermediateLocations": true,
        "intermediateLocations": [],
        "distanceMeters": 85,
        "distanceText": "约85米",
        "travelMode": "walk",
        "basis": "从3栋单元门沿小区主路到门口商铺估算。",
        "routeDescription": "出3栋单元门后沿小区主路向南，经过中心绿化带到门口商铺。"
      }
    ]
  },
  "interiors": {
    "interior_poi_jinyuan_3": {
      "poiId": "poi_jinyuan_3",
      "summary": "锦苑小区3栋的已知内部结构。",
      "floors": []
    }
  }
}
```

关键约束：

- `orgTree.nodes[].children` 只能指向势力/行政/组织子层级，不指向 POI。
- `poiGraph.nodes[]` 是电子地图图节点集合；这些 POI 通过 `ownerOrgId` / `effectiveOrgId` 归属到势力层级。
- `poiGraph.edges[]` 表达 POI 与 POI 的直接相邻、可达、距离和路线，不进入 `children`。
- `interiors[interiorId]` 是 POI 的内部属性树，承载楼层、房间、户型、功能区、大型摆件和容器物品。

### 4.2 节点唯一标识

所有 `org / poi / floor / room / zone / object / container-item` 节点都必须有唯一标识。

硬性规则：

1. 节点 `id` 必须由代码生成，AI 不允许生成最终 id。
2. 每张地图/每个存档维护自己的全局递增计数器，例如 `locationGraph.nextNodeSeq`。
3. 新节点落库时，代码分配 `nodeId = "loc_" + nextNodeSeq`，然后 `nextNodeSeq += 1`。
4. AI 只能返回 `tempRef`、`name`、`type`、`parentTempRef`、`semanticPath` 等临时引用，代码 merge patch 时把它们映射成真实递增 id。
5. 任何节点被角色卡、合同、事件、日程、地图边引用时，都必须引用代码生成的 `id`。
6. 节点 id 一旦生成不得改名、不得复用；节点显示名变化只改 `name/displayName`。

示例：

```json
{
  "locationGraph": {
    "nextNodeSeq": 128,
    "nodesById": {
      "loc_101": { "id": "loc_101", "type": "poi", "displayName": "锦苑小区3栋" },
      "loc_102": { "id": "loc_102", "type": "room", "name": "202号房" },
      "loc_103": { "id": "loc_103", "type": "zone", "name": "刘思琪的卧室" }
    }
  }
}
```

### 4.3 节点类型

| type | 是否显示地图 | 说明 |
| --- | --- | --- |
| `org` | 否 | 势力/行政/公司/家庭组织节点，只参与归属路径 |
| `poi` | 是 | 电子地图显示用地点；建筑物、小店、公园、门口等同层具体地点 |
| `floor` | 否 | 建筑内部楼层 |
| `room` | 否 | 房间号或房间名，如 `101`、`刘思琪的卧室` |
| `zone` | 否 | 房间内功能区，可嵌套 |
| `object` | 否 | 大型摆件/可点击物品 |
| `container-item` | 否 | 物品上/内/挂载的小物件 |

### 4.4 AI 返回 JSON patch

当系统发现当前树不满足本轮推演所需时，AI 返回：

```json
{
  "patchType": "location-tree-fill",
  "reason": "玩家要前往刘思琪房间，当前只知道锦苑小区3栋，缺少楼层与房间路径。",
  "currentPoi": {
    "name": "锦苑小区3栋",
    "displayName": "锦苑小区3栋",
    "type": "poi"
  },
  "poiGraphPatch": {
    "nodes": [],
    "edges": [
      {
        "fromPoiId": "poi_jinyuan_3",
        "toPoiId": "poi_shop_1",
        "relation": "direct-neighbor",
        "directNeighbor": true,
        "noIntermediateLocations": true,
        "intermediateLocations": [],
        "distanceText": "约85米"
      }
    ]
  },
  "interiorPath": [
    { "type": "floor", "name": "第二层", "order": 2 },
    { "type": "room", "name": "202", "roomCode": "202" },
    { "type": "zone", "name": "刘思琪的卧室" }
  ],
  "rooms": [
    {
      "floorName": "第二层",
      "name": "202",
      "roomCode": "202",
      "known": true,
      "layout": {
        "width": 480,
        "height": 320,
        "shapes": [
          { "type": "rect", "id": "zone_siqi_bedroom", "label": "刘思琪的卧室", "x": 40, "y": 48, "w": 168, "h": 128 }
        ]
      }
    }
  ],
  "layout": {
    "width": 480,
    "height": 320,
    "shapes": []
  },
  "slotObjects": {}
}
```

### 4.5 归属人与最高解释权

从 `地点 POI` 到建筑内部的 `floor / room / zone / object / container-item`，每个可被叙事引用、AI 推演引用或 UI 点击的节点都应带归属信息。

归属不只限于个人，也可以是组织或实体：

- 个人：某人的卧室、某人的书桌、某人的衣柜。
- 组织：学校教室、公司会议室、物业管理的门厅。
- 实体：店铺经营者、房东、家庭、社团、临时活动主办方。

推荐字段：

```json
{
  "ownerRefs": [
    { "type": "character", "id": "char_liu_siqi", "name": "刘思琪", "role": "主要使用者" },
    { "type": "org", "id": "family_liu", "name": "刘家", "role": "家庭归属" }
  ],
  "effectiveAuthorityRef": {
    "type": "org",
    "id": "community_jinyuan",
    "name": "锦苑小区",
    "reason": "该空间位于锦苑小区3栋内，所在势力/管理层级拥有最高解释权。"
  },
  "ownershipBasis": "从角色卡住所、当前推演正文和已知地图归属推断。",
  "usageContracts": []
}
```

字段含义：

- `ownerRefs[]`：实际归属/使用/管理对象，可以多值；必须写清 `type/id/name/role`。
- `effectiveAuthorityRef`：最高解释权对象，通常来自 POI 所在的 `factionPath` 或 `effectiveOrgId`；当个人归属与势力规则冲突时，以该字段解释空间边界和规则。
- `ownershipBasis`：AI 给出归属判断依据，避免凭空把空间归给某人。

继承规则：

1. 子节点默认继承父节点的 `effectiveAuthorityRef`，除非 AI 给出明确变更依据。
2. 子节点可以覆盖 `ownerRefs`：例如 `202号房` 属于刘家，`刘思琪的卧室` 主要属于刘思琪，`书桌` 属于刘思琪，`客厅沙发` 属于家庭共用。
3. `ownerRefs` 不等于最高解释权；个人拥有卧室使用权，但小区/房屋/家庭规则仍可能拥有更高解释权。
4. AI 不能只因为名字里出现人物名就强行归属，必须结合角色卡、住所、正文、历史事实或已知地图归属。
5. 不确定归属时写 `ownerRefs: []`，但仍应继承或填写 `effectiveAuthorityRef`，并在 `ownershipBasis` 中说明未知。

示例：

```json
{
  "id": "zone_siqi_bedroom",
  "type": "zone",
  "name": "刘思琪的卧室",
  "ownerRefs": [{ "type": "character", "id": "char_liu_siqi", "name": "刘思琪", "role": "主要使用者" }],
  "effectiveAuthorityRef": { "type": "org", "id": "family_liu", "name": "刘家", "reason": "该卧室位于刘家住宅内。" },
  "ownershipBasis": "角色住所与房间名共同确认。"
}
```

### 4.6 使用权合同字段

`ownerRefs` 只说明所属权/管理权，不能直接代表使用权。使用权必须由该节点自己的 `usageContracts[]` 字段约束。

该字段必须挂在具体节点上，而不是只放全局表：

- POI 可以有合同：例如整栋楼、商铺、车位、房屋出租。
- floor 可以有合同：例如整层办公区承租。
- room 可以有合同：例如 `202号房` 出租给某人。
- zone / 功能区可以有合同：例如摊位、工位、储物间、卧室借住。
- object 也可以有合同：例如租用储物柜、展示柜、设备。

推荐字段：

```json
{
  "usageContracts": [
    {
      "id": "contract_room_202_siqi",
      "type": "oral-free-use",
      "status": "active",
      "subjectNodeId": "room_202",
      "ownerRefs": [{ "type": "org", "id": "family_liu", "name": "刘家", "role": "所属者/收款方" }],
      "userRefs": [{ "type": "character", "id": "char_liu_siqi", "name": "刘思琪", "role": "使用者/付款方" }],
      "monthlyRent": 0,
      "debtAmount": 0,
      "currency": "CNY",
      "billingCycle": "monthly",
      "dueDay": 1,
      "paymentPolicy": "auto-deduct",
      "debtPolicy": {
        "onInsufficientFunds": "schedule-daily-debt-event",
        "eventTitle": "房租催缴",
        "startAfterDays": 1,
        "repeat": "daily-until-paid"
      },
      "contractBasis": "家人免费提供房间使用，属于口头约定。",
      "createdAt": "2026-07-17",
      "lastSettledMonth": "2026-07"
    }
  ]
}
```

合同类型：

- `oral-free-use`：口头免费使用，`monthlyRent: 0`。
- `written-free-use`：书面免费使用，`monthlyRent: 0`。
- `oral-rent`：口头租赁，`monthlyRent > 0`。
- `written-rent`：书面租赁，`monthlyRent > 0`。
- `temporary-borrow`：临时借用，可设置到期日。
- `management-use`：组织/管理方授权使用。

债务字段：

- `debtAmount` 必须属于节点合同字段，表示当前该合同已欠金额。
- `debtAmount: 0` 表示无欠款，不触发催债事件。
- `debtAmount > 0` 表示存在欠款，代码每天都必须触发或确保存在当天的催债事件，直到债务归零。
- 扣款失败时，代码把本期 `monthlyRent` 累加到 `debtAmount`；后续成功偿还时再递减。

结算规则：

1. 代码按月扫描所有节点的 `usageContracts[]`，只处理 `status=active` 且 `billingCycle=monthly` 的合同。
2. `monthlyRent === 0` 的合同视为免费使用，记录结算成功，不扣资金、不加资金。
3. `monthlyRent > 0` 时，代码根据 `userRefs` 查找使用者角色卡，扣除资金；根据 `ownerRefs` 查找所属者/收款方角色卡，增加资金。
4. 若付款方或收款方任一方没有角色卡，则该方视为结算成功：没有付款方角色卡时不阻塞扣款；没有收款方角色卡时不阻塞入账。
5. 只有当存在付款方角色卡且扣款失败时，才视为合同结算失败。
6. 扣款失败后，代码必须把本期 `monthlyRent` 累加到该合同的 `debtAmount`，并在使用者的日程中新增次日事件，与事件系统联动：事件类型为 `debt-collection` / `rent-arrears`。
7. 每日扫描时，只要任一节点合同 `debtAmount > 0`，就必须为当天生成或保持一个催债事件；`debtAmount === 0` 时不触发。
8. 欠款事件不能由 AI 临时口胡生成；它是合同债务字段驱动的系统事件，后续 Stage1/Stage2/Stage4 可以读取并推演。
9. 成功扣款后更新 `lastSettledMonth`、追加 `settlementHistory[]`，避免同月重复扣款；成功还款后递减 `debtAmount`，归零后停止每日催债。

事件示例：

```json
{
  "type": "rent-arrears",
  "title": "房租催缴",
  "date": "2026-08-02",
  "people": ["刘思琪"],
  "locationNodeId": "room_202",
  "contractId": "contract_room_202_siqi",
  "content": "202号房使用合同月租扣款失败，收款方开始催缴。",
  "status": "active",
  "repeat": "daily-until-paid"
}
```

字段关系：

- `ownerRefs`：节点所属/管理对象。
- `usageContracts[].userRefs`：当前使用者/付款方。
- `usageContracts[].ownerRefs`：合同收款方，可默认继承节点 `ownerRefs`，也可覆盖。
- `effectiveAuthorityRef`：合同解释冲突时的最高解释权来源；通常来自所在势力/管理组织。

### 4.7 与现有电子地图室内视图的兼容约束

现有电子地图室内视图不能直接消费“卧室 / 具体空间”作为树的最终叶子节点。它实际消费的是：

```text
building.poi
  -> interiorLayout.floors[]
    -> floor.rooms[]
      -> room.layout.shapes[]              // 户型/空间布局，描述房间内各部分
        -> child room 或 functional zone    // 房间内房间或功能区，展示规则与 room 相同
          -> child.layout.shapes[]          // 子房间/功能区自己的展示布局
            -> shape.objects[] 或 slotObjects // 该空间内可见的大型摆件
              -> object.containerContents[]  // 大型摆件内/上/挂载/关联的小物品
```

因此地点树落库时必须满足以下兼容规则：

1. `楼层` 下面挂 `rooms[]`，这里的 room 首先是房间号/房间名，例如 `202号房`、`刘思琪的房间`、`客房`。
2. 房间必须有户型/空间布局，即 `room.layout.shapes`；它描述该房间内部各个部分是什么。
3. 户型里的部分可以是“房间内的房间”，例如卧室、书房、卫生间、衣帽间、阳台，也可以是“功能区”，例如客厅区、睡眠区、书桌区、玄关区、收纳区。
4. 房间内房间与功能区的展示规则完全一致：只要可进入、可点击、可展示，就必须继续有自己的 `layout.shapes` 或可由当前 shape 进入局部布局。
5. `layout.shapes[]` 表示该 room / 子房间 / 功能区内部的可点击空间区域或结构，坐标固定为 480×320，`type` 目前应为 `rect`。
6. `shape` 可以代表空间分区，例如 `刘思琪的卧室`、`客厅区`、`厨房区`、`卫生间`；点击这类可 drill 的 shape 后，会进入该区域的局部布局。
7. `shape.objects` 或 `room.slotObjects[shape.id]` 必须挂载该空间内可见的大型摆件，例如床、衣柜、书桌、沙发、墙面装饰、地板、门、窗、展示柜、健身器械等。
8. 大型摆件必须是对象形式，至少包含 `name`，建议包含 `id/x/y/w/h/containerContents`；坐标同样落在 480×320 局部布局中。
9. 大型摆件的 `containerContents` 必须在同一次 AI 补齐中生成并持久化，表示其里面/上面/挂着/关联的小物件。
10. 墙、地板、门、窗不是例外：现有运行时会提供基础可点击结构；若 AI 知道墙上挂画、地板上散落物、门上挂钩、窗台盆栽等，应写入对应对象或 `containerContents`。
11. 如果 AI 只返回“卧室/功能区”而没有 `layout.shapes` 和大型摆件，电子地图只能显示一个空空间，无法满足点击查看物品的需求；这种结果应视为本轮语义审计未完成。

最小兼容示例：

```json
{
  "floors": [
    {
      "id": "floor_2",
      "name": "第二层",
      "rooms": [
        {
          "id": "room_202",
          "number": "202",
          "name": "202号房",
          "residents": ["刘思琪"],
          "ownerRefs": [{ "type": "character", "id": "char_liu_siqi", "name": "刘思琪", "role": "主要使用者" }],
          "effectiveAuthorityRef": { "type": "org", "id": "family_liu", "name": "刘家", "reason": "该房间位于刘家住宅内。" },
          "ownershipBasis": "从住户、角色卡住所和当前地点上下文确认。",
          "usageContracts": [
            {
              "id": "contract_room_202_siqi",
              "type": "oral-free-use",
              "status": "active",
              "monthlyRent": 0,
              "debtAmount": 0,
              "currency": "CNY",
              "userRefs": [{ "type": "character", "id": "char_liu_siqi", "name": "刘思琪", "role": "使用者" }],
              "ownerRefs": [{ "type": "org", "id": "family_liu", "name": "刘家", "role": "所属者" }]
            }
          ],
          "layout": {
            "width": 480,
            "height": 320,
            "source": "ai",
            "shapes": [
              {
                "type": "rect",
                "id": "bedroom_siqi",
                "x": 34,
                "y": 42,
                "w": 184,
                "h": 132,
                "label": "刘思琪的卧室",
                "objects": [
                  { "id": "bed", "name": "靠窗单人床", "x": 42, "y": 54, "w": 128, "h": 76, "containerContents": ["床单", "被子", "枕头"] },
                  { "id": "desk", "name": "白色书桌", "x": 196, "y": 58, "w": 108, "h": 52, "containerContents": ["课本", "台灯", "笔记本"] }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
}
```

设计含义：

- “房间号/房间名”下面必须先有户型/空间布局。
- 户型中的“房间内房间”和“功能区”展示规则一样，都必须能转成电子地图 canvas 的 `layout.shapes`。
- “卧室 / 具体空间 / 功能区”不是终点；它必须有自己的布置。
- 大型摆件不是写死的默认家具；由 AI 根据上下文生成名称、位置和容器内容。
- 物品点击不再临时问 AI，只读取持久化的 `containerContents`。

## 5. 查询与补齐流程

### 5.0 完整性判断由谁负责

完整性判断应由 **AI 负责语义审计**，代码不做“地点/建筑/楼层/房间是否合理”的关键词约束。

原因：

- “是否是一个可显示在地图上的具体建筑/地点”是语义问题，不是关键词问题；例如“锦苑小区3栋”“商业街东侧入口”“地下停车场B区入口”都可能合法。
- “周围直接相邻地点是否齐全”依赖上下文、行动目标、可见范围、路径阻隔与叙事需要，代码无法仅靠规则判断。
- “楼层多少才算齐全”“房间是否需要继续嵌套”“卧室内是否还有衣帽间/浴室/阳台”也应由 AI 根据人物、财力、建筑类型和当前推演需要判断。
- 若代码用“楼梯/走廊/门厅/房间”等关键词强行拦截，会导致大量合法地点或特殊空间过不了，反而破坏生成。

因此职责改为：

- **AI**：判断地点树是否满足当前行动与展示需求；若不完整，返回本轮需要的 JSON patch。
- **代码**：只校验 JSON 可解析、字段类型、id 唯一性、parent 是否存在、patch 是否能安全 merge、是否能持久化；不判断语义是否“像建筑”。
- **UI**：只消费 AI 已分类好的 `type` / `displayName` / `mapVisible`，不再靠 `mapExteriorName()` 之类函数把错误文本硬改成建筑名。

### 5.1 查询现有树

每次需要地点结构时，先查持久化树：

1. 当前行动是否已有可定位的 `currentPoi`。
2. `currentPoi` 是否已有 AI 确认的 `displayName`，作为电子地图显示名。
3. 当前行动是否需要周围直接相邻 POI。
4. 当前行动是否需要进入建筑内部。
5. 当前建筑是否已有 AI 确认的楼层列表。
6. 当前目标是否已有 AI 确认的房间号/房间名。
7. 当前房间是否已有 AI 确认的内嵌空间、floorplan、大型摆件与容器内容。

代码不在这里判断“这些是否足够合理”，只把现有树、当前行动、玩家位置、已知人物、历史事实交给 AI 做审计。


### 5.1.1 新增前强制查询与判定

现有流程里“新增地点”不能直接落库，必须先走查询，再让 AI 判断是复用、补全还是新增。新设计覆盖这个前置流程，并把它作为 Stage1/Stage4 的共同入口：

1. **提取候选目标**：从本轮行动、Stage1 新增地点请求、Stage4 周围解锁请求中提取候选地点、人物房间、路线关键词。
2. **先查已有节点**：按顺序调用查询能力，优先使用稳定 `nodeId`，其次用模糊名称：
   - `realworld.property.searchNode(keyword)`：查 POI、楼层、房间、功能区、物品、容器物品。
   - `realworld.property.nearbyBfs(nodeId, depth=1)`：查当前 POI 的直接相邻地点。
   - `realworld.property.getNode(nodeId, includeInterior=true, includeContracts=true)`：读取候选命中节点的完整子结构。
   - 兼容旧数据时，临时回退到 `realworld.location.query.searchLocationOne/getNearbyLocations/getLocationDetail`。
3. **组装审计输入**：把“查询命中/未命中”“当前节点路径”“周围 POI 边”“内部结构摘要”“合同/归属字段”一起传给 AI。
4. **AI 做语义判定**：AI 返回 `audit.decision`，只能是：
   - `reuse-existing`：已有节点已经满足本轮需要，只返回命中的 `nodeId`/路径，不新增。
   - `patch-existing`：已有节点语义正确但缺楼层、房间、户型、周围边、摆件、合同等字段，只返回 patch。
   - `create-new`：现有节点没有覆盖该具体 POI/内部节点，才允许新增 patch。
   - `defer-unknown`：本轮不需要知道或证据不足，不新增、不补全。
5. **代码只 merge 合法 patch**：代码根据 schema、引用、权限、递增 id、持久化规则合并；不替 AI 做建筑语义裁剪。

因此，`realworld.map.location.add` 后续应降级为系统内部 merge 能力，不能作为 AI 可绕过查询直接调用的新增入口。AI 面向的新增入口应该是 `location-tree-audit-fill`：它包含查询结果、审计结论和 patch。

### 5.2 不满足时调用 AI

触发地点结构需求时，调用 AI 返回 **completion audit + patch**，让 AI 同时判断完整性与补齐缺口。

AI 输出应包含：

- `audit.isComplete`：当前结构是否满足本轮需要。
- `audit.requiredScope`：本轮需要知道到哪一层，例如 `poi-neighbors`、`building-floors`、`floor-rooms`、`room-layout`、`object-containers`。
- `audit.missing`：AI 认为缺少什么，以及为什么缺。
- `patch`：只补齐本轮需要知道的部分。
- `defer`：明确哪些结构暂时不需要生成，避免一次性生成全世界。

补齐原则：

- 缺建筑级 POI：补 `poi`，`displayName` 必须是地图显示名，例如“锦苑小区3栋”。
- 缺周围直接相邻地点：补 `poiGraph.edges[]` 中的 `direct-neighbor` 边，必须连接两个同层级 POI，且路径中间没有其它具体地点。
- 缺楼层：补本建筑在当前推演中需要知道的楼层列表；楼层数量由 AI 根据建筑类型和上下文判断。
- 缺房间：补当前楼层需要知道的房间号/房间名；公寓可为“101/102”，自宅可为“刘思琪的卧室/客房”。
- 缺房间内嵌空间：由 AI 判断是否需要“衣帽间/卫生间/阳台/储物间”等嵌套房间。
- 缺房间布局：补 floorplan 所需的 `room.layout.shapes`；房间号/房间名下面必须有户型，户型中的房间内房间与功能区必须按同一规则展示。
- 缺大型摆件与容器内容：在 `shape.objects` 或 `slotObjects[shape.id]` 下根据人物性格、财力、上下文一次性生成并持久化，不写死物品名。

### 5.2.1 AI 审计与补齐提示词草案

```text
你是现实地点树语义审计与补齐器，只返回严格 JSON，不要 Markdown。

任务：
根据【当前地点树】、【玩家行动】、【玩家当前位置】、【已知人物/势力/财力/性格】、【历史事实】判断地点树是否满足本轮推演与展示需求。

核心结构：
势力 -> 势力层级1 -> 势力层级2 -> ... -> xxxx地点(地点名，显示到地图用) -> 楼层 -> 房间号/名 -> 户型/空间布局 -> 房间内的房间或功能区 -> 子房间/功能区布局 -> 大型摆件 -> 容器物品。

强制规则：
1. 完整性由你做语义判断，不要依赖关键词；判断依据是当前行动需要、可见范围、上下文、人物与地点设定。
2. 代码不会替你判断“这是不是建筑/地点”，所以你必须在 JSON 中明确 type、displayName、parentId、mapVisible。
3. xxxx地点(displayName) 是电子地图显示名，必须是同层级具体地点/建筑，例如“锦苑小区3栋”“小区门口便利店”“东侧公园入口”。
4. 省/市/区/街道/社区/组织路径写入 factionPath 或 parentOrg，不得混入 poi.displayName。
5. `poiGraph.edges[]` 只写与当前 POI 直接相邻、路线中间没有其它具体地点的同层级 POI 边；如果中间有商店，就不能把商店后面的公园连成 direct-neighbor edge。
6. 每个 directNeighbor 必须给 distanceMeters 或 distanceText，并给 basis、routeDescription、travelMode、directNeighbor、noIntermediateLocations、intermediateLocations。
7. 楼层数量、房间数量、房间嵌套、room layout、大型摆件和容器内容，都由你根据上下文判断本轮需要补到哪里。
8. 房间号/房间名下面必须有户型/空间布局；户型里的房间内房间与功能区展示规则相同，不能只作为叶子文本，必须写入 `layout.shapes`，并在对应 shape 下生成大型摆件与 `containerContents`。
9. 从地点 POI 到楼层、房间、功能区、大型摆件和容器物品，凡是本轮生成或补齐的节点都必须写 `ownerRefs`、`effectiveAuthorityRef`、`ownershipBasis`；归属可以是个人/组织/实体，但所在势力或管理层级拥有最高解释权。
10. 若本轮确认某节点存在使用权关系，必须在该节点写入 `usageContracts[]`；免费使用也必须写合同，且 `monthlyRent: 0`。
11. 只生成本轮需要知道的结构；未知且当前不需要的部分写入 defer，不要展开。
11. 已知树中已有节点不得随意改名；需要修正时写 factsPatch，并说明原因。
12. 大型摆件与其内部/上方/挂载物品必须匹配人物性格、财力、空间用途与上下文，并在生成后持久化。

输入：
- currentTree: {{当前地点树}}
- action: {{玩家行动}}
- currentLocation: {{玩家当前位置}}
- knownCharacters: {{相关人物}}
- knownFactions: {{相关势力}}
- historyFacts: {{历史事实}}
- visibleNeed: {{当前 UI / 推演需要，例如地图、楼层列表、floorplan、房间物品}}

输出 JSON Schema：
{
  "patchType": "location-tree-audit-fill",
  "audit": {
    "isComplete": false,
    "requiredScope": [],
    "missing": [
      { "type": "", "reason": "", "neededNow": true }
    ],
    "semanticBasis": ""
  },
  "patch": {
    "pois": [],
    "poiGraphEdges": [],
    "floors": [],
    "rooms": [],
    "zones": [],
    "layout": null,
    "slotObjects": {},
    "containerContents": {},
    "factsPatch": [],
    "ownershipPatch": []
  },
  "defer": [
    { "type": "", "reason": "" }
  ],
  "selfCheck": {
    "satisfiesCurrentNeed": true,
    "remainingUnknowns": [],
    "reason": ""
  }
}
```


补充字段要求：`location-tree-audit-fill.audit` 必须包含 `decision`、`queriedBeforeDecision` 和 `queryEvidence[]`。其中 `queriedBeforeDecision=true` 表示 AI 已基于查询结果判断；`queryEvidence[]` 记录调用过的查询 skill、参数摘要、命中的 `nodeId` 列表和结论摘要，方便后续排查为什么复用/补全/新增。

### 5.2.2 Stage1 / Stage4 触发关系

这套“地点树语义审计 + 补齐”逻辑必须在两个阶段复用，不能拆成两套：

- **Stage1：电子地图新增地点**。当推演产生新地点、玩家当前位置变化、或需要把文本地点落到电子地图时，触发一次 `location-tree-audit-fill`，负责解锁当前 POI、地图显示名、必要的上级路径、必要楼层/房间/内部结构。
- **Stage4：电子地图周围解锁**。当滑动结算后需要展示当前位置周围可见地点时，再触发同一个 `location-tree-audit-fill`，重点检查并补齐 `poiGraph.edges[]` 中的 `direct-neighbor` 边、距离字段、路径说明，以及本轮可见范围内必须知道的相邻 POI。
- 两者使用同一份地点树、同一套 schema、同一个 AI 审计提示词、同一个 patch merge 流程、同一套缓存与持久化。
- 两者差异只体现在 `visibleNeed` / `requiredScope`：Stage1 偏向“当前地点落树与进入链路”，Stage4 偏向“周围直接相邻地点解锁”。
- 推演过程中允许检查两次：Stage1 先保证当前地点可落树；Stage4 再保证周围直接相邻地点满足电子地图展示。
- 如果 Stage1 已补齐了 Stage4 需要的 `direct-neighbor edges`，Stage4 应命中缓存，只记录 `cache hit`，不再次调用 AI。
- 如果 Stage1 只补齐了当前 POI，Stage4 可以继续调用 AI 补齐周围地点，但仍然 merge 到同一棵树上。

推荐统一入口：

```ts
ensureLocationTreeForStage({
  stage: 'stage1' | 'stage4',
  trigger: 'map-new-poi' | 'surround-unlock',
  currentTree,
  currentLocation,
  action,
  visibleNeed,
  knownCharacters,
  knownFactions,
  historyFacts
})
```

该入口内部只做：读取缓存 -> 调 AI 审计或命中缓存 -> merge patch -> 持久化 -> 返回同一份地点树视图。

### 5.2.3 轮询策略

不做无限轮询，但也不由代码做语义完整性判断。

推荐策略：

1. 每次触发“需要地点结构”的入口时，代码读取当前树并调用一次 AI 审计。
2. AI 返回 `audit.isComplete=true` 且 `patch` 为空时，直接复用缓存。
3. AI 返回 `audit.isComplete=false` 时，代码 merge 本次 `patch` 并持久化。
4. 如果 JSON 无法解析或 schema 类型不合法，允许最多一次 repair retry。
5. 如果 repair 后仍不是合法 JSON / 无法 merge，本次保留待补齐状态，不继续轮询。
6. 如果 AI 自评仍有 `remainingUnknowns`，但不影响本轮需要，则保存到 `defer`，下次相关入口再审计。

也就是说：**一次触发最多一次语义审计 + 一次 JSON repair**。完整不完整由 AI 判断，但是否继续消耗 token 由流程限制。

### 5.4 满足时直接复用缓存

只要 AI 审计认为树结构已满足本轮需求：

- 不再补齐同一需求。
- 直接读取持久化树。
- 电子地图、楼层列表、floorplan、房间物件点击都消费同一份树。
- 缓存命中日志应显示对应 stage 与 `cache hit`，方便排查是否重复调用 AI。

### 5.5 周围直接相邻地点 POI 图边距离字段

`poiGraph.edges[]` 中 relation 为 `direct-neighbor` 的边必须包含距离信息。建议字段：

```json
{
  "id": "poi_shop_1",
  "type": "poi",
  "displayName": "锦苑小区门口便利店",
  "directNeighbor": true,
  "noIntermediateLocations": true,
  "intermediateLocations": [],
  "distanceMeters": 85,
  "distanceText": "约85米",
  "basis": "从锦苑小区3栋出楼门沿小区主路到门口商铺，按小区内部步行距离估算。",
  "travelMode": "walk",
  "routeDescription": "出3栋单元门后沿小区主路向南，经过中心绿化带到门口商铺。"
}
```

规则：

- `distanceMeters` 优先；无法给精确数值时至少给 `distanceText`。
- `basis` 必须写估算依据，禁止只写“AI估算”。
- 是否“直接相邻”由 AI 根据路径语义判断，而不是代码用关键词判断。
- 如果中间存在其它具体地点，不能写为 directNeighbor，必须把中间地点作为本轮或下次补齐目标。

## 5.6 角色卡房产反向索引

节点是房产/空间事实的真源，但角色卡需要显示与该角色相关的房产摘要。

角色卡新增字段建议：

```json
{
  "properties": {
    "owned": [
      {
        "nodeId": "loc_102",
        "displayPath": "锦苑小区3栋 / 第二层 / 202号房",
        "monthlyRentIncome": 2000,
        "currency": "CNY",
        "userRefs": [{ "type": "character", "id": "char_liu_siqi", "name": "刘思琪" }],
        "contractId": "contract_room_202_siqi"
      }
    ],
    "using": [
      {
        "nodeId": "loc_103",
        "displayPath": "锦苑小区3栋 / 第二层 / 202号房 / 刘思琪的卧室",
        "monthlyRentCost": 1000,
        "currency": "CNY",
        "ownerRefs": [{ "type": "org", "id": "family_liu", "name": "刘家" }],
        "contractId": "contract_zone_siqi_bedroom"
      }
    ]
  }
}
```

身份证 UI 显示格式：

```text
所有：锦苑小区3栋/202号房（标识: loc_102，+2000租金（使用者: 刘思琪））
使用：锦苑小区3栋/202号房/刘思琪的卧室（标识: loc_103，-1000租金（所属者: 刘家））
```

同步规则：

1. 房产真源仍是地点节点上的 `ownerRefs`、`usageContracts[]`、`debtAmount`。
2. 角色卡 `properties` 是反向索引/展示缓存，可由代码从节点扫描生成。
3. 当合同、所有者、使用者或租金变化时，代码更新相关角色卡 `properties`。
4. 角色卡没有对应人物时，不阻塞地点节点和合同结算；只是不生成该角色卡的反向显示。
5. 身份证 UI 点击 `标识: loc_xxx` 时，应调用节点精确查询 skill 展示完整路径和节点信息。

## 5.7 房产与地点查询 Skills

这些 skills 必须注册到工具目录，让 AI 能按节点标识或姓名查询地点图与房产关系；其中新增/补全节点必须走 `realworld.property.node.ensure`，不能再走旧 `realworld.map.location.add`。

### 5.7.1 节点路径查询

```text
skill: realworld.property.pathByNodeId
params: { nodeId: string }
returns: 从根到该节点的完整路径：势力 -> 势力层级1 -> ... -> POI -> 楼层 -> 房间 -> 功能区/物件，并返回该节点摘要、ownerRefs、usageContracts。
```

说明：完整路径必须从根开始，不能只返回局部名称。

### 5.7.2 周围地点广度查询

```text
skill: realworld.property.nearbyBfs
params: { nodeId: string, depth: number }
returns: 以该节点所属 POI 为中心，在 `poiGraph.edges[]` 上做 BFS，按 depth 限制返回周围 POI、距离、路线说明、所属势力、可见状态。
```

规则：

- 若传入的是 room/zone/object，先向上找到所属 POI，再从 POI 图开始 BFS。
- depth=1 只返回直接相邻 POI。
- depth=N 返回 N 层以内图邻居，必须标明每个结果的层数与经过路径。

### 5.7.3 节点模糊查询

```text
skill: realworld.property.searchNode
params: { keyword: string, limit?: number }
returns: 名称、displayName、ownerRefs、usageContracts、路径中包含 keyword 的相关节点列表。
```

用于“找所有叫卧室/锦苑/便利店/刘思琪相关”的节点。

### 5.7.4 姓名房产查询

```text
skill: realworld.property.searchByPerson
params: { name: string, mode?: "owner|user|both" }
returns: 该姓名作为所有者/使用者出现的所有节点、合同、租金、债务、完整路径。
```

用于角色卡房产展示和 AI 判断某人住在哪里、拥有哪些空间、欠不欠租。

### 5.7.5 节点精确查询

```text
skill: realworld.property.getNode
params: { nodeId: string, includeInterior?: boolean, includeContracts?: boolean }
returns: 从顶层势力层级到该节点，以及该节点地点内所有信息；includeInterior=true 时返回该 POI 下完整内部结构。
```

### 5.7.6 合同/债务查询

```text
skill: realworld.property.searchContracts
params: { nodeId?: string, personName?: string, status?: "active|ended|debt" }
returns: 命中的 usageContracts、monthlyRent、debtAmount、付款方、收款方、下次应付日、催债事件状态。
```

### 5.7.7 节点上行归属查询

```text
skill: realworld.property.authorityPath
params: { nodeId: string }
returns: 节点 ownerRefs、effectiveAuthorityRef、factionPath，以及为什么所在势力拥有最高解释权。
```

### 5.7.8 Skills 注册原则

1. 所有查询都以代码生成的 `nodeId` 为稳定主键。
2. 模糊查询和姓名查询只能返回候选，不得代替精确查询落库。
3. AI 需要执行地点、房产、租金、债务相关推演前，应优先调用这些 skills，而不是凭文本猜。
4. 查询结果必须包含 `nodeId`，便于后续精确追踪。

## 6. 提示词职责

AI 提示词必须改成“语义审计 + 树补齐器”，而不是“文本地点归一化器”：

1. AI 判断当前地点树是否满足本轮行动和 UI 展示需求。
2. AI 直接输出合法树形 JSON，而不是输出扁平 mapNodes 再让代码猜。
3. AI 明确 `poi/floor/room/zone/object/container-item` 的类型与父子关系。
4. AI 决定哪些是地图 POI、哪些是建筑内部层级、哪些是房间内可点击物件。
5. AI 决定直接相邻地点、楼层数量、房间数量、嵌套房间、room layout、大型摆件和容器内容是否齐全。
6. AI 必须保证可展示房间兼容电子地图：`room.layout.shapes -> child room/functional zone -> child.layout.shapes -> shape.objects/slotObjects -> containerContents`。
7. AI 必须为本轮生成/补齐的 POI、楼层、房间、功能区、物件写清归属：`ownerRefs` 表示个人/组织/实体归属，`effectiveAuthorityRef` 表示所在势力或管理层级的最高解释权。
8. AI 必须把使用权关系写成节点自身的 `usageContracts[]`；免费使用 `monthlyRent=0`，租赁使用 `monthlyRent>0`。
9. AI 只展开本轮需要知道的部分，其余写入 `defer`。
7. AI 必须返回 JSON，不再用中文 K:V 承载这类结构。

## 7. 代码职责

代码不负责语义判断，也不负责“猜 AI 本来想表达什么”，只负责工程约束：

- JSON 校验：能否解析，字段是否存在，类型是否符合 schema。
- 引用校验：节点 `id` 由代码全局递增生成；`parentId` / `ownerRefs[].id` / `effectiveAuthorityRef.id` 是否能解析或保留为待解析引用，patch 是否能 merge。
- 安全持久化：把合法 patch merge 到地点树，保留历史 facts、节点内 `usageContracts[]` 与缓存版本。
- 流程控制：一次触发最多一次 AI 语义审计；JSON 坏了最多一次 repair。
- 合同结算：按月扫描节点内 `usageContracts[]`，自动扣除使用者资金、增加所属者资金；角色卡不存在的一方视为成功，付款方角色卡扣款失败才生成次日催债日程事件。
- 查询缓存：根据 `audit.requiredScope` 和已持久化结果决定是否需要再次发起审计。
- 展示消费：电子地图显示 `type=poi && mapVisible=true`；建筑内部读取 `floor/room/zone/object/container-item`。
- 旧入口重构：旧 `realWorldMap.nodes` 与 `interiorLayout` 的对外读写表现保持可用，但新增、补全、周围解锁、室内结构生成必须统一走 audit-fill 与 patch merge，不再把旧扁平结构作为新数据真源。

代码明确不做：

- 不用关键词判断“楼梯/走廊/卧室/小区/公园”是否能成为 POI。
- 不根据字符串裁剪 `displayName` 来伪造建筑名。
- 不判断 `direct-neighbor edges` 是否语义齐全。
- 不判断楼层、房间、房间嵌套、摆件数量是否“足够”。
- 不把 AI 输出的错误层级硬归一化成正确层级；这类问题应回到 AI 审计提示词修正。

## 8. 与现有模块的旧入口重构关系

| 现有模块 | 新职责 |
| --- | --- |
| `real-world-map.js` | 保持旧 UI facade；`update/addLocation/upsertNode` 外部写入改走 `ensureLocationTreeForStage()`，内部只负责投影与安全 merge |
| `real-world-map-fog.js` | Stage4 周围解锁改走同一套 audit-fill；只应用 `poiGraph.edges[]`，不再直接把周围地点 upsert 为子节点 |
| `real-world-map-interior.js` | 消费 POI 子树中的 floor/room/zone/object |
| `real-world-agent-location-fill.js` | 改为调用 location-tree-fill JSON patch |
| `real-world-agent-loop.js` | Stage1/Stage4 调用同一个 `ensureLocationTreeForStage()`，只改变 `visibleNeed` / `requiredScope`，不直接生成扁平 mapNodes |
| `map-update-prompt.md` | 从 K:V “地图节点”逐步迁移为 JSON patch |
| `real-world-map-surround-unlock.md` | 并入 location-tree-fill，避免周围地点与内部布局分散生成 |


## 8.1 旧入口重构方案：外观不变，底层改为 AI 驱动与执行

目标不是简单“兼容旧入口”，而是把旧入口重构成新地点图的门面层。也就是说，现有按钮、UI、存档字段和调用方短期看起来仍然可用，但所有会改变地点结构的能力都必须收敛到同一套 AI 审计与 patch 执行流程。

### 8.1.1 重构原则

1. **表面功能不破坏**：现有电子地图、建筑内部面板、房间点击、周围解锁、地点查询仍能按旧 UI 工作。
2. **旧入口只做 facade**：`realWorldMap.addLocation()`、`realWorldMap.upsertNode()`、`realWorldMap.update()`、`realWorldMapFog.applySurroundUnlock()` 不再被视为业务真源，只作为读取旧字段、调用新 graph 服务或合并 patch 的外壳。
3. **AI 驱动判断**：新增、复用、补全、延后必须由 AI 在 `location-tree-audit-fill.audit.decision` 中判断，代码不做建筑/房间/周边语义硬裁剪。
4. **代码执行落库**：AI 不生成最终 `id`，只返回语义 patch；代码负责全局递增 id、引用映射、schema 校验、merge、缓存和持久化。
5. **Stage1/Stage4 共用核心**：Stage1 电子地图新增地点与 Stage4 周围解锁都调用同一个 `ensureLocationTreeForStage()`，只传不同的 `stage`、`visibleNeed`、`requiredScope`。
6. **旧字段可读可投影**：短期仍可把新结构投影回 `realWorldMap.nodes[]`、`edges[]`、`interiorLayout`，供现有 UI 使用；但新增数据真源是 `locationGraph/orgTree/poiGraph/interiors`。

### 8.1.2 旧入口对应的新职责

| 旧入口 | 当前问题 | 重构后职责 |
| --- | --- | --- |
| `realWorldMap.update(state, locationName, result)` | 直接按文本地点 upsert，仍会调用 `mapExteriorName()` 修正层级 | 只收集本轮当前位置与候选目标，调用 `ensureLocationTreeForStage(stage1)`；成功后更新 current/currentId 到新 graph 映射节点 |
| `realWorldMap.addLocation(state, payload, time)` | 可被多处直接调用并绕过查询 | 调用方必须重构：禁止继续直接调用；新增节点统一改调新增节点 skill / `ensureLocationTreeForStage()`，旧函数只保留为内部投影/兼容 facade |
| `realWorldMap.upsertNode(map, data)` | 名称派生 id，任何入口都能直接创建节点 | 调用方必须重构：外部不得直接 upsert 新节点；新增节点必须走新增节点 skill，由代码在 merge 阶段调用 `allocateLocationNodeId()` 分配全局递增 id |
| `realWorldMapFog.generateSurroundUnlock()` | Stage4 单独生成 `surroundLocations`，和 Stage1 不是同一套判断 | 改为调用 `ensureLocationTreeForStage(stage4, requiredScope=['poi-neighbors','interior-needed'])` |
| `realWorldMapFog.applySurroundUnlock()` | 直接把 `surroundLocations` upsert 成子/同级节点 | 只应用已经校验的 `poiGraph.edges[]` 和 POI patch，并投影到旧地图显示 |
| `real-world-agent-location-fill.fillCharacterLocation()` | 未命中后直接让 AI 生成 routeNodes + addLocation | 改为先查 `realworld.property.searchNode`，再让 AI 返回 `reuse-existing/patch-existing/create-new/defer-unknown` |
| `realworld.location.query.*` | 只能查旧扁平节点与同父/子节点 | 保留为旧查询 facade，同时新增 `realworld.property.*` 查询完整 graph、路径、BFS、合同与归属 |


### 8.1.2.1 新增节点 Skill 与调用方重构

为了解决旧入口绕过审计的问题，不能只在 `addLocation/upsertNode` 内部打补丁，而要把所有调用方改为显式调用新的“新增/补全节点”能力。

建议新增系统写入 skill：

```text
skill: realworld.property.node.ensure
params: {
  stage: "stage1|stage4|manual",
  intent: "reuse-or-create|patch-existing|create-neighbor|create-interior",
  targetKeyword: string,
  currentNodeId?: string,
  currentLegacyLocationName?: string,
  requiredScope?: string[],
  visibleNeed?: string,
  actionText?: string
}
returns: {
  decision: "reuse-existing|patch-existing|create-new|defer-unknown",
  nodeId?: string,
  path?: string[],
  changedNodeIds: string[],
  cacheHit: boolean,
  queryEvidence: []
}
```

职责边界：

1. 该 skill 是 AI 可请求的唯一新增/补全地点入口；`realworld.map.location.add` 后续不再暴露给 AI 作为新增工具。
2. skill 内部先执行 `realworld.property.searchNode/getNode/nearbyBfs`，再把查询证据交给 AI 审计。
3. AI 只能返回语义 patch 与 `decision`，不能直接写 `id`，不能直接写旧 `realWorldMap.nodes[]`。
4. 代码 merge patch 后，再投影旧地图字段，确保 UI 表面不变。

必须重构的调用方：

| 调用方 | 当前行为 | 重构目标 |
| --- | --- | --- |
| `realWorldMap.update()` 处理 `result.locationName/mapNodes/mapLinks` | 直接 `upsertNode/addLocation` | 改调 `realworld.property.node.ensure(stage1)`；`mapNodes` 仅作为候选输入，不直接落库 |
| `realWorldAgentLocationFill.fillCharacterLocation()` | 未命中后生成 `routeNodes` 并 `addLocation` | 改调 `realworld.property.node.ensure(stage1, intent=reuse-or-create)` |
| `realWorldAgentLocationFill.applyRouteNodes()` | 把 routeNodes 逐个 `addLocation` | routeNodes 改成 audit patch 的 `pathCandidates/interiorPath`，由 merge 层统一分配 id |
| `realWorldMapFog.applySurroundUnlock()` | `surroundLocations` 逐个 `upsertNode` | 改调 `realworld.property.node.ensure(stage4, intent=create-neighbor)`，写入 `poiGraph.edges[]` |
| `realWorldMapGeopolitical` / `orgTerritory` 相关补点 | 可能直接 `upsertNode` 保证地图锚点 | 只允许查询或引用已有 `nodeId`；需要新节点时走 ensure skill |
| 测试脚本或调试入口 | 直接构造 `realWorldMap.nodes[]` | 改用 graph fixture 或新增节点 skill fixture |

### 8.1.2.2 ID 改造：新增时全局递增，旧名称 ID 只做 legacy alias

当前 `nodeId(name)` 是名称派生，导致改名、重名、同名不同房间/摆件时不可稳定引用。新设计要求“新增节点时分配全局递增 id”，因此 ID 改造也必须和调用方重构一起做。

规则：

1. 每个存档维护 `locationGraph.nextNodeSeq`，初始值由旧数据扫描后取最大序号 + 1；没有旧序号时从 1 开始。
2. 所有新节点通过 `allocateLocationNodeId(state)` 生成：`loc_1`、`loc_2`、`loc_3`……
3. AI patch 中允许写 `tempRef`、`semanticKey`、`name`、`parentTempRef`，但不得写最终 `id`。
4. merge 层建立 `tempRef -> loc_N` 映射，并把 parent、edge、contract、owner/user 引用全部替换成真实 id。
5. 旧的 `nodeId(name)` 不再用于新增，只保留为 legacy alias / 查询兼容：
   - `legacyId = nodeId(name)` 可记录到 `legacyAliases[]`。
   - 查询时允许用旧 id 命中真实 `loc_N`。
   - 新写入、合同、角色卡房产、事件引用一律使用真实递增 id。
6. 旧 `realWorldMap.nodes[].id` 若已存在名称派生 id，首次迁移时不强制重写 UI 引用；但新 graph 中必须分配 `nodeId: loc_N`，并记录 `legacyMapNodeId`。

调用方改造要求：

- 外部代码不得再用 `nodeId(name)` 预测新节点 id。
- 所有“创建后继续引用”的流程必须读取 ensure skill 返回的 `nodeId`。
- UI 点击、合同、角色卡房产、事件、日程、地图边都必须逐步改为保存 `loc_N`。
- `upsertNode()` 如果收到不存在的名称，只能返回 `null` 或触发 ensure skill，不能自行创建名称派生 id 节点。

### 8.1.3 新核心服务

建议新增一个集中模块，例如 `real-world-location-graph.js`，由它持有所有写入和查询的稳定入口：

```text
ensureLocationTreeForStage(state, { stage, action, currentNodeId, targetKeyword, requiredScope, visibleNeed })
  -> query existing graph
  -> build audit input
  -> call AI location-tree-audit-fill when needed
  -> validate patch
  -> allocate ids
  -> merge graph
  -> project legacy realWorldMap fields
  -> return { decision, changedNodeIds, currentNodeId, cacheHit }
```

该服务至少包含：

- `ensureGraphState(state)`：初始化 `locationGraph/orgTree/poiGraph/interiors` 与 `nextNodeSeq`。
- `allocateLocationNodeId(state)`：按存档全局递增生成 `loc_N`。
- `queryExistingLocationContext(state, keyword, currentNodeId)`：统一执行模糊查询、精确查询、周围 BFS 和旧数据回退查询。
- `buildLocationAuditInput(...)`：把查询证据、当前行动、已有路径、周围边、室内结构、归属/合同打包给 AI。
- `applyLocationAuditPatch(state, patch)`：校验 patch、分配 id、合并 POI/楼层/房间/功能区/摆件/合同。
- `projectLocationGraphToLegacyMap(state)`：把新 graph 投影为旧 UI 仍能消费的 `realWorldMap.nodes[]/edges[]/interiorLayout`。
- `rebuildCharacterPropertyIndex(state)`：根据节点 `ownerRefs/usageContracts` 重建角色卡 `properties.owned/using`。
- `settleUsageContracts(state, date)`：按月租合同扣款/加款，失败时写 `debtAmount` 并联动日程催债。

### 8.1.4 执行顺序

1. **第一步：加 graph facade，不改 UI**。新增 graph state 与查询/投影层，旧 UI 仍读 `realWorldMap`。
2. **第二步：重构写入口**。把 `update/addLocation/upsertNode/fog/applyRouteNodes` 的外部写入改为 `ensureLocationTreeForStage()`。
3. **第三步：注册 property skills**。新增 `realworld.property.getNode/pathByNodeId/nearbyBfs/searchNode/searchByPerson/searchContracts/authorityPath`。
4. **第四步：统一 Stage1/Stage4 prompt**。`real-world-map-location-add` 与 `real-world-map-surround-unlock` 合并为 `location-tree-audit-fill` 或共享同一 schema。
5. **第五步：房产与合同执行**。实现 `usageContracts` 结算、债务事件、角色卡房产反向索引和身份证 UI 展示。
6. **第六步：逐步切 UI 真源**。当投影稳定后，地图和室内 UI 可以直接读 graph，但这不是第一阶段必要条件。

### 8.1.5 验收标准

- 旧 UI 操作不退化：地图、建筑内部、楼层、房间、摆件点击仍可用。
- 所有新增/补全/周围解锁在日志中都能看到 `queryEvidence[]` 与 `audit.decision`。
- `upsertNode()` 不再能从外部绕过审计创建新业务节点。
- 同一个地点在 Stage1 与 Stage4 不重复生成；缓存命中时只记录 `cacheHit`。
- 地图显示只展示 AI 判定为 `type=poi && mapVisible=true` 的节点。
- 房间、功能区、大型摆件、容器物品都有代码分配的唯一 id，并可通过 property skills 查询完整路径。


### 8.1.6 分阶段落地清单：先换底层，不动表面

为了避免一次性重写导致地图、室内、存档再次损坏，旧入口重构必须按以下顺序推进。每一阶段都要求旧 UI 可运行，下一阶段只依赖上一阶段的稳定结果。

#### Phase 0：只加新底座，不接管旧入口

新增文件建议：

| 文件 | 职责 |
| --- | --- |
| `publish/real-world-location-graph.js` | 新地点图状态、递增 id、节点索引、路径查询、BFS、旧数据投影 |
| `publish/real-world-location-graph-skills.js` | `realworld.property.*` 查询 skill 与 `realworld.property.node.ensure` 写入 skill 的运行时实现 |
| `publish/prompts/location-tree-audit-fill.md/js` | 统一 Stage1/Stage4 的 AI 审计与 patch prompt |
| `tests/location-graph-id.test.js` | 验证递增 id、legacy alias、重复名不冲突 |
| `tests/location-graph-query.test.js` | 验证路径查询、BFS、模糊查询、姓名房产查询 |

Phase 0 验收：

- 不改现有 `realWorldMap.update/addLocation/upsertNode` 行为。
- 能从旧 `realWorldMap.nodes[]/edges[]/interiorLayout` 构建 graph view。
- 能分配 `loc_N`，并把旧名称派生 id 记录为 `legacyAliases[]`。
- 新 skills 可查询旧地图投影结果，但还不负责写入。

#### Phase 1：接管新增节点，不改变 UI 数据形状

改造重点：

1. `realworld.property.node.ensure` 开始负责新增/补全节点。
2. `realWorldMap.addLocation()` 外部调用改为 ensure skill；函数本身保留，但只允许内部 merge 后投影旧节点。
3. `realWorldMap.upsertNode()` 增加保护：外部调用若要创建不存在节点，必须走 ensure skill；内部 merge 可带 `__fromLocationGraphMerge: true`。
4. `realWorldMap.update()` 不直接处理 `mapNodes` 落库，而是把 `locationName/mapNodes/mapLinks` 作为候选输入交给 ensure skill。

Phase 1 验收：

- 旧地图 UI 仍读 `realWorldMap.nodes[]`。
- 新增地点日志里能看到 `queryEvidence[]` 和 `audit.decision`。
- 同名不同节点能拿到不同 `loc_N`。
- 旧 `nodeId(name)` 不再参与新节点真源 id 生成。

#### Phase 2：统一 Stage1 与 Stage4

改造重点：

1. Stage1 电子地图新增地点调用：
   - `stage: "stage1"`
   - `requiredScope`: `['current-poi','path-to-target','interior-needed']`
2. Stage4 周围解锁调用：
   - `stage: "stage4"`
   - `requiredScope`: `['poi-neighbors','direct-neighbor-edges','interior-needed']`
3. `real-world-map-surround-unlock` prompt 不再单独决定新增节点，只作为 `location-tree-audit-fill` 的 Stage4 模式。
4. `surroundLocations[]` 落库改为 `poiGraph.edges[]`；旧 `map.edges[]` 由投影层生成。

Phase 2 验收：

- Stage1 已经补过的 POI/室内结构，Stage4 不再重复 AI 生成。
- Stage4 只补缺失的直接相邻 POI 边。
- 地图显示仍只出现同层级 POI，不出现楼梯/走廊/房间节点。

#### Phase 3：室内节点与物品节点全量 id 化

改造重点：

1. `floor/room/zone/object/container-item` 都进入 graph 索引，并分配 `loc_N`。
2. `layout.shapes[].id` 仍可作为 Canvas 局部 id，但必须绑定真实 `nodeId`，例如 `shape.nodeId = "loc_123"`。
3. 点击房间、功能区、大型摆件、墙、地板、门、窗时，UI 优先使用 `nodeId` 查询完整路径与容器内容。
4. `slotObjects[].containerContents` 从字符串兼容升级为可索引对象：每个容器物品也可有 `nodeId/name/ownerRefs`。

Phase 3 验收：

- 点击任意可见大型摆件，都能定位到真实 `loc_N`。
- 旧字符串 `containerContents` 仍能显示；新生成内容使用对象节点。
- 房间布局仍保持持久化，不因刷新重新生成。

#### Phase 4：合同、房产、债务执行

改造重点：

1. `usageContracts[]` 成为节点字段，由 graph 扫描。
2. `settleUsageContracts()` 按月扣租/加租。
3. `debtAmount > 0` 每天生成或保持催债事件。
4. `rebuildCharacterPropertyIndex()` 更新角色卡 `properties.owned/using`。
5. 身份证 UI 显示所有/使用房产，并能通过 `nodeId` 精确查询。

Phase 4 验收：

- 免费使用合同 `monthlyRent=0` 不扣款但可展示。
- 付款方有角色卡且扣款失败时累计债务，并联动次日催债事件。
- 无角色卡的一方视为结算成功。

### 8.1.7 调用方重构优先级

优先级按“最容易继续污染旧数据”的程度排序：

1. **P0：`realWorldMap.upsertNode()` 保护**：先阻止外部直接创建名称派生 id 新节点。
2. **P0：`realWorldMap.addLocation()` 外部调用替换**：这是当前最主要绕过审计入口。
3. **P0：`realWorldAgentLocationFill.applyRouteNodes()`**：routeNodes 最容易把走廊/楼梯/房间误写成地图节点。
4. **P1：`realWorldMapFog.applySurroundUnlock()`**：周围解锁要改写 graph edges，而不是 parent/child。
5. **P1：`realWorldMap.update()` 的 `mapNodes/mapLinks`**：把 AI 旧字段当候选，不直接落库。
6. **P2：material/query facade**：让 `realworld.location.query` 走新 graph 投影，同时引导 AI 使用 `realworld.property.*`。
7. **P2：UI 点击链路**：地图、楼层、房间、摆件逐步从旧 id 切到 `loc_N`。

### 8.1.8 风险与回滚边界

- **不能一上来删除旧字段**：`realWorldMap.nodes[]/edges[]/interiorLayout` 是当前 UI 真源，第一阶段必须继续投影。
- **不能一上来全量重写存档**：旧数据先按需投影和 alias，只有节点被修改/补全时才写入新 graph 真源。
- **不能让 AI 生成真实 id**：所有 patch 里的 id 都必须当作 `tempRef` 或 legacy 输入处理。
- **不能把 `upsertNode()` 简单改成抛错**：很多旧 UI/初始化仍会调用它；必须通过内部标记或 facade 层逐步收紧。
- **回滚点**：只要 `projectLocationGraphToLegacyMap()` 输出仍正确，UI 可回退读旧 `realWorldMap`；graph 写入失败时本轮不落库，不破坏旧状态。


### 8.1.9 `realworld.property.node.ensure` 详细协议

该 skill 是新增/补全地点节点的唯一 AI 可见写入口。它不等于直接写库，而是“查询 -> AI 审计 -> patch -> 代码执行”的编排入口。

#### 输入参数

```json
{
  "stage": "stage1",
  "intent": "reuse-or-create",
  "targetKeyword": "刘思琪的卧室",
  "currentNodeId": "loc_12",
  "currentLegacyLocationName": "锦苑小区3栋",
  "requiredScope": ["current-poi", "path-to-target", "interior-needed"],
  "visibleNeed": "玩家本轮要前往刘思琪卧室，需要知道当前建筑、楼层、户号、卧室与必要摆件。",
  "actionText": "去刘思琪房间门口敲门"
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `stage` | 是 | `stage1`、`stage4` 或 `manual`，用于日志、缓存和 requiredScope 默认值 |
| `intent` | 是 | `reuse-or-create`、`patch-existing`、`create-neighbor`、`create-interior` |
| `targetKeyword` | 是 | 候选地点/空间/人物房间/周围 POI 的语义目标 |
| `currentNodeId` | 否 | 已知当前节点真实 `loc_N`；没有时用 legacy 名称回查 |
| `currentLegacyLocationName` | 否 | 旧 `realWorldMap.current` 或 `state.realWorldLocationName` |
| `requiredScope` | 否 | 本轮必须确认的结构范围 |
| `visibleNeed` | 否 | 为什么本轮需要这些地点结构，由调用方根据阶段填写 |
| `actionText` | 否 | 玩家行动/本轮正文摘要，供 AI 判断知情边界 |

#### 内部执行步骤

1. `ensureGraphState(state)`：保证 graph 容器存在。
2. `resolveCurrentNode()`：用 `currentNodeId`、legacy id、名称依次查找当前节点。
3. `queryExistingLocationContext()`：执行 `searchNode/getNode/nearbyBfs` 与旧查询回退。
4. `buildAuditInput()`：组装 `queryEvidence[]`、当前路径、候选节点、周围边、室内结构、合同/归属。
5. `shouldSkipAiByCache()`：若 requiredScope 已满足，直接返回 `reuse-existing` 或 `cacheHit=true`。
6. `call location-tree-audit-fill`：只有缺口影响本轮行动时才调用 AI。
7. `validateLocationAuditPatch()`：只做 JSON、schema、引用、字段类型校验。
8. `applyLocationAuditPatch()`：分配递增 id，merge graph，更新合同/归属。
9. `projectLocationGraphToLegacyMap()`：投影旧 `realWorldMap`，保证 UI 可用。
10. 返回 `decision/nodeId/changedNodeIds/cacheHit/queryEvidence`。

#### 返回值

```json
{
  "decision": "patch-existing",
  "nodeId": "loc_42",
  "path": ["中国", "四川省", "成都市", "锦苑小区", "锦苑小区3栋", "第二层", "202", "刘思琪的卧室"],
  "changedNodeIds": ["loc_42", "loc_43", "loc_44"],
  "cacheHit": false,
  "queryEvidence": [
    { "skill": "realworld.property.searchNode", "paramsSummary": "刘思琪的卧室", "hitNodeIds": ["loc_18"], "summary": "命中刘家202但缺卧室布局" }
  ]
}
```

### 8.1.10 `location-tree-audit-fill` AI patch schema

AI 只返回语义 patch，不返回最终真实 id。所有 `id` 风格字段都必须视为临时引用。

```json
{
  "patchType": "location-tree-audit-fill",
  "audit": {
    "decision": "patch-existing",
    "queriedBeforeDecision": true,
    "isComplete": false,
    "reason": "已命中锦苑小区3栋与202户，但缺刘思琪卧室与本轮可见摆件。",
    "requiredScope": ["interior-needed", "room-layout", "object-containers"],
    "queryEvidenceRefs": ["qe_1"],
    "missing": [
      { "type": "zone", "reason": "需要确认刘思琪卧室在202户型中的位置", "neededNow": true }
    ],
    "defer": [
      { "type": "floor", "reason": "未进入其它楼层，本轮不生成" }
    ]
  },
  "tempRefs": {
    "poiHome": "existing:loc_12",
    "room202": "existing:loc_18",
    "siqiBedroom": "temp:siqiBedroom"
  },
  "patch": {
    "orgTreePatch": {},
    "poiGraphPatch": {
      "nodes": [],
      "edges": []
    },
    "interiorsPatch": [
      {
        "targetPoiRef": "poiHome",
        "operation": "merge",
        "floors": [
          {
            "tempRef": "floor2",
            "type": "floor",
            "name": "第二层",
            "order": 2,
            "rooms": [
              {
                "tempRef": "room202",
                "type": "room",
                "name": "202",
                "roomCode": "202",
                "zones": [
                  {
                    "tempRef": "siqiBedroom",
                    "type": "zone",
                    "name": "刘思琪的卧室",
                    "layout": {
                      "width": 480,
                      "height": 320,
                      "shapes": [
                        { "type": "rect", "tempRef": "bed", "label": "靠窗单人床", "x": 40, "y": 52, "w": 150, "h": 86 }
                      ]
                    },
                    "objects": [
                      {
                        "tempRef": "bed",
                        "type": "object",
                        "name": "靠窗单人床",
                        "x": 40,
                        "y": 52,
                        "w": 150,
                        "h": 86,
                        "containerItems": [
                          { "tempRef": "quilt", "type": "container-item", "name": "浅色被子" }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

强制规则：

1. `audit.queriedBeforeDecision` 必须为 `true`；否则代码拒绝 patch。
2. `audit.decision=create-new` 时，必须解释为什么查询命中都不能复用。
3. `patch` 只能包含 `requiredScope` 所需内容；未接触/未知结构写入 `defer`。
4. 所有新增节点只能写 `tempRef`；真实 `loc_N` 由代码分配。
5. `existing:loc_N` 只能引用查询证据里出现过的节点。
6. `ownerRefs/effectiveAuthorityRef/usageContracts` 若本轮能确定则写入；不确定时保留空并写 `ownershipBasis`。
7. `poiGraph.edges[]` 必须包含距离字段和 `directNeighbor/noIntermediateLocations`，否则不允许作为周围直接相邻 POI 落库。

### 8.1.11 缓存键与失败策略

缓存不能只按 prompt 文本缓存，必须按“结构需求”缓存，避免 Stage4 重复生成 Stage1 已补过的结构。

建议缓存键：

```text
locationTreeAudit:${stage}:${currentPoiNodeId}:${targetKeywordHash}:${requiredScopeHash}:${graphVersion}
```

缓存命中条件：

- `currentPoiNodeId` 相同。
- `requiredScope` 已由 graph 满足。
- 相关节点 `updatedAt/version` 未变化。
- 上次结果不是 JSON repair 失败或 merge 失败。

失败策略：

1. AI JSON parse 失败：最多 repair 一次。
2. repair 后仍失败：本轮不落库，返回旧结构，日志写 `auditFailed`。
3. schema 失败：拒绝 patch，不做部分 merge。
4. merge 失败：回滚本次 graph 变更，旧 `realWorldMap` 不更新。
5. AI 判断 `defer-unknown`：不视为失败，记录 `defer`，本轮继续使用已有结构。

## 9. 实施阶段

### 阶段 A：只写设计与 schema

- 新增 `location-tree` schema 文档。
- 明确 `poi/floor/room/zone/object` 合法 parent 关系。
- 不改运行时代码。

### 阶段 B：新增树校验与查询

- 新增纯函数：`locationTreeHasRequiredPath(action, tree)`。
- 新增纯函数：`validateLocationTreePatch(patch)`。
- 加测试覆盖：楼梯不能是 POI；完整地址不能作为 displayName；缺楼层时需要 AI patch。

### 阶段 C：AI JSON patch 接入

- 新增统一入口 `ensureLocationTreeForStage()`。
- Stage1 `电子地图新增地点` 调用该入口，补齐当前 POI 与必要内部路径。
- Stage4 `电子地图周围解锁` 调用同一入口，补齐 `poiGraph.edges[]` 中的 `direct-neighbor` 边与距离信息。
- 两个阶段共用同一提示词、schema、缓存、patch merge 和持久化逻辑。
- patch 合法才落库；非法 JSON 最多 repair 一次，否则保留现状。

### 阶段 D：UI 消费树

- 电子地图只显示 `poi`。
- 点击 POI 展示楼层列表。
- 点击楼层显示 floorplan。
- 点击房间/区域显示物件。
- 点击物件显示 container contents。

### 阶段 E：旧数据迁移

- 旧 `realWorldMap.nodes` 迁移为 `poi`。
- 旧 `interiorLayout.floors[].rooms[]` 迁移为 `floor/room/zone`。
- 旧 `slotObjects` 迁移为 `object/container-item`。

## 10. 验收标准

1. 电子地图上只出现 AI 标记为 `type=poi && mapVisible=true` 的同层级具体地点，例如 `锦苑小区3栋`、`便利店`、`小区门口`。
2. AI 不应把完整行政地址、楼梯、走廊、房间、卧室混入地图 POI；如确有特殊空间需要作为地点，必须在 `semanticBasis` 中说明。
3. 玩家进入建筑后，先看到楼层列表。
4. 点击楼层后看到 floorplan。
5. 点击房间后先看到该房间的户型/空间布局 `layout.shapes`。
6. 户型中的房间内房间与功能区展示规则一致；点击后都能看到该区域的大型摆件，再点击大型摆件、墙、地板等可展示物后，看到其内部/上方/挂载物。
7. 已生成的树结构持久化，下次直接复用。
8. 缺失路径时才调用 AI，不重复生成已有结构。
9. 完整性由 AI 审计判断；代码只做 JSON/schema/merge/persistence 校验，不做关键词语义拦截。
10. AI 返回的 `audit.requiredScope`、`defer`、`selfCheck` 能解释为什么本轮生成这些、不生成那些。
11. 从 POI 到楼层、房间、功能区、大型摆件和容器物品，已知节点都能看到 `ownerRefs` 与 `effectiveAuthorityRef`；个人/组织/实体归属不覆盖所在势力的最高解释权。
12. 存在使用权关系的节点都带 `usageContracts[]`；免费使用 `monthlyRent=0`，租赁使用 `monthlyRent>0`。
13. 每个合同都带 `debtAmount`；`debtAmount=0` 不触发催债，`debtAmount>0` 每天触发或保持催债事件。
14. 月租合同由代码自动结算：有角色卡则扣/加资金，无角色卡一方视为成功；付款方扣款失败时累加 `debtAmount`，次日起由日程系统持续触发催债事件。
15. 每个节点 id 都由代码针对该地图/存档全局递增生成，AI 不得生成最终 id。
16. 角色卡身份证 UI 能显示 `所有/使用` 房产摘要，并能通过节点标识跳转精确查询。
17. 房产查询 skills 覆盖节点路径、周围 BFS、模糊节点、姓名房产、节点精确、合同债务、最高解释权查询。

18. 任何新增 POI/楼层/房间/功能区/摆件/容器物品前，必须先查询已有节点，并由 AI 在 `reuse-existing / patch-existing / create-new / defer-unknown` 中做一次审计判定；代码不得绕过查询直接新增。

19. `realworld.map.location.add/upsertNode` 不再是 AI 可直接调用的新增入口；所有新增/补全节点必须走 `realworld.property.node.ensure`，并由调用方读取返回的真实递增 `nodeId`。
20. 新增节点 id 必须由 `allocateLocationNodeId()` 按存档全局递增生成；`nodeId(name)` 只能作为 legacy alias，不能再用于新增真源节点。

## 11. 回答当前问题

当前截图中出现“完整行政地址”和“楼梯类节点”，根因不是应该靠 `mapExteriorName()` 继续硬处理，而是当前链路还没有强制 AI 输出并审计地点树：

- **提示词层**：需要明确让 AI 直接输出树形 JSON，并由 AI 判断 `poi/floor/room/zone/object` 的语义层级。
- **数据层**：需要持久化“势力路径 -> 地图 POI -> 楼层 -> 房间 -> 内嵌空间 -> 物件/容器”的树，而不是继续以扁平 `mapNodes` 为主结构。
- **代码层**：代码只校验 JSON、字段、引用、merge 和缓存，不用关键词判断“楼梯/走廊/卧室/小区/公园”是否能成为 POI。

最终修复方向：

1. AI 做语义完整性审计并返回 `location-tree-audit-fill` JSON。
2. 代码保存合法 patch，但不把文本地点硬裁剪成建筑名。
3. UI 只展示 AI 明确标记为地图 POI 的 `displayName`。
