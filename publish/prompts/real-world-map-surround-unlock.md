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
- 返回模式：{{返回模式}}\r
- 玩家所在室内：{{玩家所在室内}}\r
- 上级地点：{{上级地点}}\r
- 已知地图：{{现实地图}}\r
- 地点说明：{{地点说明}}\r
- 当前地点完整JSON：{{当前地点完整JSON}}\r
- 本轮正文：{{本轮正文}}\r
- 玩家行动：{{玩家行动}}\r
- 预置布局模板目录：见下文\r
\r
## 预置 Canvas 布局模板（AI 户型不足时模板兜底）\r
\r
{{布局模板目录}}\r
\r
## 颗粒度规则（重要）\r

### 返回模式规则（最高优先级）

- 系统只做 JSON 形状与字段归一化，不做“完整性是否足够”的业务校验，也不会因为缺少某个房间、楼层、周围 POI 而重试；结构是否足够由你根据上下文一次性判断并直接输出。\r

- `返回模式=full`：说明当前地点没有完整解锁或没有获取到可复用地点结构。你必须返回该地点首次可持久化的完整 JSON：`interiorLayout` + `surroundLocations`。\r
- `返回模式=patch`：说明当前地点已经解锁，系统已经把“当前地点完整JSON”提供给你。你必须先阅读该 JSON，再判断本轮正文是否需要修改地点内部、房间、功能区、大型摆件、容器物品或新增直接相邻 POI。\r
- `patch` 模式禁止复写整栋楼/整套房完整 JSON；只返回发生变化的局部字段。无变化时返回 `{ "responseMode": "patch", "noChange": true, "surroundLocations": [] }`。\r
- `patch` 模式如果正文确认“把某物放在某桌上/打开柜子/移动摆件/看到墙上挂物”等稳定事实，只返回对应楼层、房间、槽位、摆件或 `containerContents` 的局部修改。\r
- 本轮正文中出现远处地点时，只能作为叙事参考；`surroundLocations` 必须围绕“当前地点完整JSON.currentPoi”判断，不能把远处地点挂到当前地点周围。\r

### 当前地点完整JSON使用规则\r

- `currentPoi` 是本次唯一地图锚点；所有 `surroundLocations` 都必须与它直接相邻。\r
- `knownDirectNeighbors` / `existingRouteEdges` 是已解锁周围地点，已存在的不要重复返回，除非本轮正文确认距离、依据或名称需要修正。\r
- `interiorLayout.floors[].rooms[].layout.shapes[]` 是已持久化户型与功能区；点击房间展示依赖这些内容。\r
- `layout.shapes[].objects[]` 与 `slotObjects` 是已持久化大型摆件；`containerContents` 是点击摆件/墙/地板/门/窗等容器时展示的物品。\r
- 若需要修改物品，优先返回最小局部补丁：楼层标识 -> 房间标识 -> `slotObjects` 或 `layout.shapes[].objects[].containerContents`。\r
\r
### surroundLocations（建筑物外一圈）\r
\r
- **最小颗粒度 = 某一栋建筑物**（如「锦苑小区3栋」）或小区级 POI（公园、商店等）。\r
- **禁止**把走廊、楼梯间、单个房间写进 surroundLocations。\r
\r
### interiorLayout.floors（楼层与户内）\r
\r
- 只写**已发现/可确认**的楼层；未发现楼层不要编造。\r
- 每层 `rooms[]` 写户号（如 201、202）与 `residents`（居住人姓名列表）。\r
- 每个有居住人或需要展示布局的房间必须指定 `layout.shapes` 或 `layoutTemplateId`：\r
  - 优先使用 `layout.shapes`：由 AI 生成完整户型，直接输出该房间/住户内部的房间分割、墙体区域、客厅、卧室、厨房、卫生间等可点击区域\r
  - 模板兜底：只有在无法可靠生成户型时，才从上方模板目录选择 `layoutTemplateId`\r
  - `slotAssignments`：若使用模板，把居住人填入模板槽位（如 bed_1、bed_2）；若使用 `layout.shapes`，可把每个 shape 的 `id/slot` 作为摆件挂载槽位\r
  - `slotObjects`：把每个已知槽位内的首次可见大型摆件写成对象数组，每个对象必须包含 `name/x/y/w/h/containerContents`；点击户型图时系统只读取这里保存的摆件，不再临时询问 AI\r
- 同一户内同住的人写在**同一 room** 的 residents 里，不要拆成多个户号。\r
- `zones` 只写建筑物公共区（走廊、楼梯间、单元门厅），不要写各户内部。\r
\r
### slotAssignments / slotObjects 示例\r
\r
四人同住 202（普通单元），选 `four_bedroom_one_living`：\r
```json\r
"layoutTemplateId": "four_bedroom_one_living",\r
"residents": ["刘悠", "刘思琪", "刘思瑶", "刘思怡"],\r
"slotAssignments": { "bed_1": "刘悠", "bed_2": "刘思琪", "bed_3": "刘思瑶", "bed_4": "刘思怡", "living": "客厅", "kitchen": "厨房", "bathroom": "卫生间" },\r
"slotObjects": {\r
  "bed_1": [{ "name": "靠墙单人床", "x": 54, "y": 58, "w": 154, "h": 92, "containerContents": ["床单", "被子", "枕头"] }],\r
  "bed_2": [{ "name": "书桌", "x": 262, "y": 58, "w": 126, "h": 54, "containerContents": ["书本", "台灯", "笔记本"] }],\r
  "bed_3": [{ "name": "衣柜", "x": 54, "y": 196, "w": 118, "h": 54, "containerContents": ["衣服", "收纳盒"] }],\r
  "bed_4": [{ "name": "玩偶架", "x": 300, "y": 178, "w": 86, "h": 58, "containerContents": ["玩偶", "摆件"] }],\r
  "living": [{ "name": "沙发", "x": 58, "y": 70, "w": 170, "h": 58, "containerContents": ["抱枕", "毯子"] }],\r
  "kitchen": [{ "name": "料理台", "x": 56, "y": 56, "w": 340, "h": 46, "containerContents": ["砧板", "调料瓶"] }],\r
  "bathroom": [{ "name": "镜柜", "x": 332, "y": 112, "w": 88, "h": 36, "containerContents": ["护肤品", "梳子"] }]\r
}\r
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

### 距离与路线规则

- 每个 surroundLocations 项都必须写 `distanceMeters` 或 `distanceText`，并写 `basis` 说明估算依据。
- 距离必须符合现实尺度：同小区相邻楼栋/单元通常约 20-80 米，小区门口到楼栋通常约 80-300 米，街区商铺间按道路步行距离估算。
- 不知道距离时不要输出该相邻地点；不要写“很近/不远”这类无法落图的模糊距离。
- surroundLocations 只生成建筑物级 POI；房间、餐厅、客厅、KTV 等只能写入 interiorLayout.floors[].rooms。
## 返回 JSON\r
\r
```json\r
{\r
  "responseMode": "full",\r
  "interiorLayout": {\r
    "summary": "一句话概括该单元内部格局",\r
    "floors": [\r
      {\r
        "id": "floor_2",\r
        "name": "第二层",\r
        "rooms": [\r
          {\r
            "number": "202",\r
            "residents": ["刘悠", "刘思琪", "刘思瑶", "刘思怡"],\r
            "layoutTemplateId": "four_bedroom_one_living",\r
            "slotAssignments": {\r
              "bed_1": "刘悠",\r
              "bed_2": "刘思琪",\r
              "bed_3": "刘思瑶",\r
              "bed_4": "刘思怡",\r
              "living": "客厅",\r
              "kitchen": "厨房",\r
              "bathroom": "卫生间"\r
            },\r
            "slotObjects": {\r
              "bed_1": [{ "name": "靠墙单人床", "x": 54, "y": 58, "w": 154, "h": 92, "containerContents": ["床单", "被子", "枕头"] }],\r
              "bed_2": [{ "name": "书桌", "x": 262, "y": 58, "w": 126, "h": 54, "containerContents": ["书本", "台灯", "笔记本"] }],\r
              "bed_3": [{ "name": "衣柜", "x": 54, "y": 196, "w": 118, "h": 54, "containerContents": ["衣服", "收纳盒"] }],\r
              "bed_4": [{ "name": "玩偶架", "x": 300, "y": 178, "w": 86, "h": 58, "containerContents": ["玩偶", "摆件"] }],\r
              "living": [{ "name": "沙发", "x": 58, "y": 70, "w": 170, "h": 58, "containerContents": ["抱枕", "毯子"] }],\r
              "kitchen": [{ "name": "料理台", "x": 56, "y": 56, "w": 340, "h": 46, "containerContents": ["砧板", "调料瓶"] }],\r
              "bathroom": [{ "name": "镜柜", "x": 332, "y": 112, "w": 88, "h": 36, "containerContents": ["护肤品", "梳子"] }]\r
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
      "name": "锦苑小区4栋",\r
      "parentName": "锦苑小区",\r
      "granularity": "building",\r
      "descriptionFacts": ["位于当前楼栋西侧，隔小区步道相邻"]\r
    }\r
  ]\r
}\r
```


`patch` 模式示例：

```json
{\r
  "responseMode": "patch",\r
  "reason": "正文确认玩家把书放到卧室书桌上。",\r
  "patch": {\r
    "interiorLayout": {\r
      "floors": [\r
        {\r
          "id": "floor_2",\r
          "rooms": [\r
            {\r
              "id": "room_202",\r
              "number": "202",\r
              "slotObjects": {\r
                "bed_2": [\r
                  { "name": "书桌", "containerContents": ["书本", "台灯", "笔记本", "刚放下的书"] }\r
                ]\r
              }\r
            }\r
          ]\r
        }\r
      ]\r
    }\r
  },\r
  "surroundLocations": []\r
}\r
```

## 新增强制边界：持久化、直接相邻、最小知情

1. 本次返回的 `interiorLayout` 会被系统永久写入该建筑节点；下次打开建筑内部会直接使用已保存布局，不会再次询问 AI。因此不要输出临时、猜测或无关的房间构造。
2. `interiorLayout.floors[].rooms[]` 只允许写玩家当前已经进入、看见、被明确告知、或本轮行动必须知晓的房间/户号。未知楼层、未知住户、未接触房间保持缺省，不要为了填满楼层而生成。
3. 有 layout 的 room 必须是“需要展示内部构造”的房间；只知道门牌号但未进入/未观察的房间，允许只写 number/name/residents，不要写 layoutTemplateId、slotAssignments 和 slotObjects。
4. `slotObjects` 是首次地点/房间空间构图的一部分，必须随 `interiorLayout` 一起持久化；只写玩家当前需要知晓的区域摆件，不要为未知房间、未知楼层或未进入区域补全。
5. `surroundLocations[]` 只允许写与当前建筑地点直接相连、步行路线中间没有其他具体地点的地点。
6. 若从当前建筑到目标地点之间存在商店、门口、道路节点、广场、楼栋、门禁、走廊等任何具体地点，则目标地点不是直接相邻，不得写入 `surroundLocations`。例如“我家 -> 商店 -> 公园”时，只能写“商店”，不能写“公园”。
7. 每个 `surroundLocations[]` 项必须额外写：
   - `directNeighbor: true`
   - `noIntermediateLocations: true`
   - `intermediateLocations: []`
8. 如果无法确认是否直接相邻，宁可不输出该地点。

## 最高优先级补充：layout.shapes 可由 AI 生成完整户型

默认优先让 AI 生成完整户型：在 `interiorLayout.floors[].rooms[]` 内写入 `layout.shapes`，系统会优先使用 `layout.shapes` 并持久化；只有缺少有效 `layout.shapes` 时才使用 `layoutTemplateId` 模板兜底。

```json
"layout": {
  "width": 480,
  "height": 320,
  "shapes": [
    { "type": "rect", "id": "bed_2", "x": 40, "y": 52, "w": 154, "h": 104, "label": "刘思琪的卧室" },
    { "type": "rect", "id": "living", "x": 210, "y": 52, "w": 206, "h": 118, "label": "客厅" },
    { "type": "rect", "id": "kitchen", "x": 210, "y": 190, "w": 96, "h": 68, "label": "厨房" },
    { "type": "rect", "id": "bathroom", "x": 320, "y": 190, "w": 82, "h": 68, "label": "卫生间" }
  ]
}
```

- `layout.shapes` 的坐标系统固定为 480×320；每个 shape 必须是 `rect`，包含 `id/x/y/w/h/label`。
- `id` 同时作为 `slotObjects` 的挂载槽位；例如 `id: "bed_2"` 的区域，其大型摆件写入 `slotObjects.bed_2`。
- 户型必须根据建筑类型、住户财力、家庭结构、人物关系、上下文和已知剧情生成；不要把普通公寓生成成豪宅，也不要凭空生成未知房间。
- `layout.shapes` 一旦生成会随房间持久化，后续打开直接复用，不再重新询问 AI。
- 如果没有足够上下文生成完整户型，则输出 `layoutTemplateId` 作为模板兜底。

## 最高优先级补充：slotObjects 必须由 AI 生成物品名与位置

从现在开始，新生成的 `slotObjects` 不得再写字符串数组。每个槽位必须写成对象数组，由 AI 根据当前房间/区域的实际空间构图生成大型可见摆件的名称、位置和容器内容：

```json
"slotObjects": {
  "bed_2": [
    { "name": "靠窗单人床", "x": 54, "y": 58, "w": 154, "h": 92, "containerContents": ["床单", "被子", "枕头"] },
    { "name": "白色衣柜", "x": 54, "y": 196, "w": 118, "h": 54, "containerContents": ["衣服", "裙子", "收纳盒"] },
    { "name": "书桌", "x": 262, "y": 58, "w": 126, "h": 54, "containerContents": ["书本", "台灯", "笔记本"] }
  ]
}
```

- `name` 必须是当前房间真实可见的大型摆件/结构名，由 AI 生成；不要固定为某几种默认家具。
- `x/y/w/h` 是该物品在点击房间后显示的 480×320 房间局部 Canvas 内坐标；`x/y` 为左上角，`w/h` 为尺寸，必须保持在画布内。
- 大型摆件要直接显示在房间平面图里并可点击；床、柜、桌、沙发、隔断、墙面装饰、展示柜、健身器械等只要当前可见且合理，都应作为对象输出。
- `containerContents` 必须在同一次推演里生成，表示该物品上/内/挂载/关联的小物件；后续点击物品时直接读取这里，不再临时询问 AI。
- 大型摆件与 `containerContents` 必须根据人物性格、财力、职业/生活方式、房屋档次、当前时间、玩家行动和本轮上下文推演生成；不要输出与角色经济能力、审美偏好或现场叙事不匹配的物品。
- 大型摆件和其里面/上面/挂着/收纳的小物品必须一次性生成后持久化到 `interiorLayout.floors[].rooms[].slotObjects[].containerContents`；后续点击只读取持久化结果，不重新向 AI 请求。
- 墙、地板、门、窗由运行时提供基础可点击结构；若墙上有明显挂画、照片墙、架子等，请把它们写入相关可见摆件或对应 `containerContents`。
- 只为玩家当前进入、观察到、被明确告知或本轮行动必须知晓的房间/槽位生成摆件；未知房间、未知楼层、未进入区域不要补全。
- 旧的字符串数组示例仅用于兼容历史存档；新回答必须使用对象数组。

