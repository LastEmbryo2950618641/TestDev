window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerPrompt?.('generic-update', `## 通用更新输出协议
阶段3必须返回 genericUpdates 数组。genericUpdates 是旧字段之外的统一结算审计层，可与 vitalUpdates、metricUpdates、lexiconUpdates、factionUpdates、itemActions 同时存在。

每条 genericUpdates 只描述一个主体的一个字段变化：
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
  "change": { "mode": "delta/set/append/remove/merge/upsert/create/delete/transfer/link/unlink", "value": "更改值", "fromValue": "可选", "toValue": "可选", "unit": "可选" },
  "reasons": [{ "trigger": "触发条件或触发事实", "evidence": "正文或资料依据", "confidence": "confirmed/inferred" }]
}

规则：
1. 只有阶段2正文或已载入资料确认发生稳定变化时才写；临时气氛、未确认猜测不写。
2. subject.type 与 subject.id 必填；field 不许写“资料”“状态”等泛称。
3. change.mode 只能用注册器支持的操作。
4. reasons 必须是数组；trigger 用于以后判断同类更改触发条件。
5. 没有明确稳定变化时返回 "genericUpdates": []。
`);
