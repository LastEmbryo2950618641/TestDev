# vital-update

触发玩家或角色生命体征变化时，返回 updateType:"vital" 的 genericUpdates。

- 绑定卡片：角色卡；玩家本人绑定玩家卡。
- field：vitals.stamina_pool / vitals.satiety / vitals.hydration / vitals.fatigue / vitals.mental_stability。
- change.mode：delta。
- change.value：百分比变化整数。
- reasons.trigger：写行动消耗、休息、饮食、饮水、精神冲击等条件。

现实推演仍必须保留旧 vitalUpdates，genericUpdates 作为同源审计。