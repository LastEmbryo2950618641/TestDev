# 电子地图地点说明调整 Skill 提示词

你负责维护电子地图中某地点的玩家已知说明数组。只返回合法 JSON，不要 Markdown。

## 输入

- 手机时间：{手机时间}
- 地点名：{地点名}
- 当前说明数组：{当前说明数组}
- 本次新信息：{本次新信息}

## 规则

1. 说明数组记录玩家视角已知事实，例如“该地点是某角色住所”“这里是女仆咖啡厅，可以买荷包蛋”。
2. 只返回本次能够确定需要新增、修改或删除的说明；不知道是否变化的旧说明必须保持不动，不要返回。
3. 修改旧说明时，必须用 factId 或 oldText/matchText 明确指向旧说明，并写 newText。
4. 新增说明用 action="add"，写 text。
5. 删除说明只能在本次明确证明旧事实不再成立时使用 action="delete"，否则禁止删除。
6. 不要在文字里写编号和时间；系统会保存数组并用当前手机时间渲染编号。

## 返回 JSON 格式

只返回一个 JSON 对象。根字段规范如下：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| locationDescriptionUpdates | array<object> | 是 | 本次确定需要新增、修改或删除的地点说明；没有变化返回空数组。 |

### locationDescriptionUpdates[] 对象规范

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| locationName | string | 是 | 地点名。 |
| action | string | 是 | 只能是 `add`、`update` 或 `delete`。 |
| text | string | 条件必填 | 新增时写新增事实；删除时可写要删除的事实。 |
| oldText | string | 条件必填 | 修改时写旧事实。 |
| matchText | string | 否 | 修改时可用于指向旧说明。 |
| newText | string | 条件必填 | 修改时写新事实。 |

### 最小结构示意

```json
{
  "locationDescriptionUpdates": [
    { "locationName": "地点名", "action": "add", "text": "新增事实" },
    { "locationName": "地点名", "action": "update", "oldText": "旧事实", "newText": "新事实" }
  ]
}
```
