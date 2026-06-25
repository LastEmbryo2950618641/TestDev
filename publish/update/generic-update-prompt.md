---
name: generic-update
description: 没有专用 update skill 时，用通用方式固化稳定事实、状态标签、跨系统字段或新分类
---

## 通用更新输出协议

本 skill 是兜底固化方法：当正文之后确认发生稳定变化，但没有更精确的 update skill 可用，或变化属于新分类/跨系统字段/状态标签时使用。若存在情绪、感觉、生命体征、物品、地图、势力、关系、角色卡等专用 skill，必须优先使用专用 skill。

AI 不局限于已有示例；如果正文和资料明确证明了类似字段，应主动添加并固化，但必须先检查“可用更新 Skills 摘要”中是否已有对应专用 skill。没有专用 skill 时，才用 updateType:"generic"。

阶段3必须返回 genericUpdates 数组。genericUpdates 是旧字段之外的统一结算审计层。

每条 genericUpdates 只描述一个主体的一个字段变化：

```json
{
  "updateType": "更新类型ID",
  "subject": {
    "type": "player/character/faction/faction_parent/faction_app/company/location/item/inventory/wechat/calendar/worldline/lexicon/vital/metric/system",
    "id": "主体ID，玩家本人固定 player-self，角色优先角色ID，势力优先势力ID，未知ID写稳定名称",
    "name": "显示名称，可选",
    "playerId": "可选",
    "characterId": "可选",
    "factionId": "可选",
    "parentFactionId": "可选",
    "appId": "可选"
  },
  "field": "可定位字段路径",
  "change": {
    "mode": "delta/set/append/remove/merge/upsert/create/delete/transfer/link/unlink",
    "value": "更改值",
    "fromValue": "可选",
    "toValue": "可选",
    "unit": "可选"
  },
  "reasons": [
    {
      "trigger": "触发条件或触发事实",
      "evidence": "正文或资料依据",
      "confidence": "confirmed/inferred"
    }
  ]
}
```

参数含义：

- updateType：更新类型ID；有专用 skill 时写专用 ID，没有专用 skill 时写 `generic`。
- subject.type：被更新主体类型。
- subject.id：被更新主体ID；玩家本人固定为 player-self。
- subject.name：用于结算标签页显示的名称，可选。
- field：精确字段路径，不能写“资料”“状态”等泛称。
- change.mode：变化方式，只能使用注册器支持的操作。
- change.value：本次写入、增加、合并或删除的值；具体结构由对应 update prompt 定义。
- change.fromValue：变化前值，可选，用于审计。
- change.toValue：变化后值，可选，用于审计。
- change.unit：单位，可选。
- reasons：必须是数组。
- reasons.trigger：什么条件或事实触发本类更新。
- reasons.evidence：本次剧情正文、资料或结算中的明确依据。
- reasons.confidence：confirmed 表示明确确认；inferred 表示推断。敏感或稳定事实字段应优先使用 confirmed，证据不足时不更新。

规则：

1. 只有阶段2正文或已载入资料确认发生稳定变化时才写；临时气氛、未确认猜测不写。
2. subject.type 与 subject.id 必填；field 必须精确。
3. change.mode 只能用注册器支持的操作。
4. reasons 必须是数组；trigger 用于以后判断同类更改触发条件。
5. 使用顺序：先判断是否有专用 skill；有则不用 generic，没有才用 generic。
6. 状态标签统一写 field:`status_tags`、change.mode:`append`、change.value 为标签数组。
7. 新发现但暂无分类的稳定技能/职业/宝具/职阶技能，可用 generic 暂存；若可归入角色卡技能或职业，优先使用 role-card。
8. 没有明确稳定变化时返回 "genericUpdates": []。

## Fate/型月分类参考

- 职阶技能算作角色技能：例如气息遮断、阵地制作、骑乘、单独行动、狂化。优先用 role-card/角色技能；没有专用结构时可 generic 到 `profile.skills`。
- 宝具也算技能，但类型是宝具：可写入角色技能/物品/宝具字段；generic 兜底时 field 可写 `profile.skills`，value 里注明 `type:"宝具"`。
- 魔术刻印完整度/损伤度、魔术系谱/家系积累、魔术控制力、术式构筑、仪式适性、结界适性、使魔操作、供魔能力、抗诅咒/精神干涉/神秘污染、魔术礼装运用能力，按接近程度归入技能或职业，不写入世界固有基础资质。
- 是否 Master、令咒数量、供魔链状态、与从者契约稳定性、被圣杯选中适性、当前阵营、圣遗物/召唤触媒、结界/工房/据点资源，统一按状态标签或资源状态固化。
