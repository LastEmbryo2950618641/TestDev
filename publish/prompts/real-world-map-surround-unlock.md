# 电子地图周围一圈解锁\r
\r
你负责在玩家**首次抵达**某建筑物级地点、且该建筑物在地图上**尚无同级邻点**时，推演：\r
1. 该**建筑物内部**的楼层与户内布局（interiorLayout）\r
2. 该建筑物**周围一圈**可步行抵达的相邻地点（surroundLocations）\r
\r
只返回合法 JSON，不要 Markdown。\r
\r
## 输入\r
\r
- 手机时间：{{手机时间}}\r
- 地图锚点（建筑物）：{{地图锚点}}\r
- 玩家所在室内：{{玩家所在室内}}\r
- 上级地点：{{上级地点}}\r
- 已知地图：{{现实地图}}\r
- 地点说明：{{地点说明}}\r
- 本轮正文：{{本轮正文}}\r
- 玩家行动：{{玩家行动}}\r
- 预置布局模板目录：见下文\r
\r
## 预置 Canvas 布局模板（只能从中选择 layoutTemplateId）\r
\r
{{布局模板目录}}\r
\r
## 颗粒度规则（重要）\r
\r
### surroundLocations（建筑物外一圈）\r
\r
- **最小颗粒度 = 某一栋建筑物**（如「锦苑小区3栋2单元」）或小区级 POI（公园、商店等）。\r
- **禁止**把走廊、楼梯间、单个房间写进 surroundLocations。\r
\r
### interiorLayout.floors（楼层与户内）\r
\r
- 只写**已发现/可确认**的楼层；未发现楼层不要编造。\r
- 每层 `rooms[]` 写户号（如 201、202）与 `residents`（居住人姓名列表）。\r
- 每个有居住人或需要展示布局的房间必须指定：\r
  - `layoutTemplateId`：从上方模板目录选一个 id\r
  - `slotAssignments`：把居住人填入模板槽位（如 bed_1、bed_2）；非床位槽位可填「客厅」「厨房」等\r
- 同一户内同住的人写在**同一 room** 的 residents 里，不要拆成多个户号。\r
- `zones` 只写建筑物公共区（走廊、楼梯间、单元门厅），不要写各户内部。\r
\r
### slotAssignments 示例\r
\r
四人同住 202（普通单元），选 `four_bedroom_one_living`：\r
```json\r
"layoutTemplateId": "four_bedroom_one_living",\r
"residents": ["刘悠", "刘思琪", "刘思瑶", "刘思怡"],\r
"slotAssignments": { "bed_1": "刘悠", "bed_2": "刘思琪", "bed_3": "刘思瑶", "bed_4": "刘思怡" }\r
```\r
\r
**豪宅/高端住宅**请从目录【豪宅/高端】段选用，常见对应关系：\r
- 城市顶级**大平层** → `luxury_penthouse`\r
- **复式/跃层**豪宅 → `duplex_luxury`\r
- **独栋别墅**（带花园门厅） → `standalone_villa`\r
- **合院**（中庭围合） → `courtyard_villa`\r
- **庄园大宅**（多套房+佣人/酒窖/健身） → `mansion_estate`\r
- **空中别墅**（整层+露台） → `sky_villa`\r
\r
正文或地点说明出现「豪宅、别墅、大平层、复式、合院、庄园」等词时，优先选上述 luxury 模板，不要用普通「三室一厅」代替。\r
\r
## 返回 JSON\r
\r
```json\r
{\r
  "interiorLayout": {\r
    "summary": "一句话概括该单元内部格局",\r
    "floors": [\r
      {\r
        "id": "floor_2",\r
        "name": "第二楼",\r
        "rooms": [\r
          {\r
            "number": "202",\r
            "residents": ["刘悠", "刘思琪", "刘思瑶", "刘思怡"],\r
            "layoutTemplateId": "four_bedroom_one_living",\r
            "slotAssignments": {\r
              "bed_1": "刘悠",\r
              "bed_2": "刘思琪",\r
              "bed_3": "刘思瑶",\r
              "bed_4": "刘思怡"\r
            }\r
          }\r
        ]\r
      }\r
    ],\r
    "zones": [\r
      { "name": "走廊", "kind": "走廊", "position": "中", "description": "连接各户与楼梯间" }\r
    ]\r
  },\r
  "surroundLocations": [\r
    {\r
      "name": "锦苑小区3栋1单元",\r
      "parentName": "锦苑小区",\r
      "granularity": "building",\r
      "descriptionFacts": ["位于当前单元西侧，同属3栋"]\r
    }\r
  ]\r
}\r
```