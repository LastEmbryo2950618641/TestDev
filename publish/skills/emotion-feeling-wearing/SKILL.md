---
id: emotion.feeling.wearing.assess
category: 状态判定
name: 情绪感觉穿着合并判定
method: assessEmotionFeelingWearing(target, context)
params: target: 玩家本人/被操控角色/微信联系人；context: 本次现实推演、异世界推演或微信聊天上下文
returns: metricUpdates 与 lexiconUpdates，可一次返回一个或多个情绪、感觉、穿着变化
trigger: 每一次现实推演、异世界推演以及微信聊天结束时，都应由 AI 基于已有值判断角色的情绪、对玩家感觉与穿着是否变化；若变化则给出变化值与原因，例如 { key: "恐惧", delta: 3, reason: "因鬼故事害怕" }，穿着变化通过 lexiconUpdates kind:"穿着" 返回，例如 { slot:"上衣", name:"未穿戴", action:"脱下", reason:"想着发生关系" }。
---

# 情绪感觉穿着合并判定 Skill

## 激活描述

每一次现实推演、异世界推演以及微信聊天结束时，都应由 AI 基于目标当前已有值判断角色的情绪、对玩家感觉与穿着是否变化。

若变化，则 AI 给出变化值与变化原因，例如：

```json
{
  "metricUpdates": {
    "emotions": [{ "key": "恐惧", "delta": 3, "status": "恐惧因鬼故事明显上升", "reason": "因鬼故事害怕" }],
    "playerFeelings": [{ "key": "好感", "delta": 2, "status": "好感因被安慰小幅上升", "reason": "你安慰了她的害怕" }]
  },
  "lexiconUpdates": [
    {
      "kind": "穿着",
      "name": "未穿戴",
      "value": { "slot": "上衣", "name": "未穿戴", "action": "脱下" },
      "reason": "想着发生关系，明确脱下上衣"
    }
  ]
}
```

## 判定范围

1. 情绪：使用固定 emotions 字段，只返回本次确实变化或需要解释的项。
2. 对玩家感觉：使用固定 playerFeelings 字段，只返回本次确实变化或需要解释的项。
3. 穿着：通过 lexiconUpdates 返回 kind:"穿着"，可以一次返回一个或多个槽位变化。

## 输出规则

1. 不要改写所有字段，只返回发生变化的项。
2. delta 是基于已有值的变化量，不是最终值。
3. delta 必须是 -30 到 30 的整数。
4. status 描述变化后的状态含义。
5. reason 必须写具体触发原因，不要写“根据上下文”“系统结算”。
6. 穿着变化必须有明确动作或事实证据，例如脱下、穿上、换装、破损、洗浴、睡眠、外出更衣。
7. 信息不足不能把基础槽位写成“未穿戴”。
8. “未穿戴”表示该部位真实空置。
9. 没有变化时不要返回空占位。

## 穿着槽位

可写：内衣、上衣、内裤、下衣、袜子、鞋子、外套、手套、头部、颈部、腰部、包具、饰品、装备。

饰品和装备可不写数字，系统会自动分配饰品1、装备1等编号槽位。
