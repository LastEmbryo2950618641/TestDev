---
id: item.query
category: 物品系统
name: 物品查询生成转移删除购物
method: listCharacterItems(target), searchKnownItem(keyword), generateItemSkill(payload), addItemToTarget(target,item), transferItemSkill(from,to,itemName,quantity,reason), deleteItemSkill(target,itemName,quantity,reason), purchaseItemSkill(target,item)
params: target/from/to: player-self或角色id/姓名；keyword/name/itemName: 物品关键词；item: {name,kind,description,price,equipSlots,quantity}
returns: 角色持有物、世界已知物品命中结果，或新增/转移/删除/购物操作结果
trigger: 现实推演中涉及检查、使用、赠送、交还、收到、丢弃、损坏、消耗、遗失、购买、付款、购物、包裹、快递、钥匙、证件、衣物、工具、食品或随身物时使用。
---

# 物品查询生成转移删除购物 Skill

## 激活描述

现实推演需要处理玩家或角色持有物时使用。物品系统分两层：

1. 角色背包/穿着：记录玩家或角色当前持有、穿戴、可调用的物品。
2. 世界已知物品表：记录已经被玩家检查、详细观察或实际到手后固化过的物品细节。

## 可用方法

1. `listCharacterItems(target)`：查询玩家或指定角色当前持有物与已穿戴物。
2. `searchKnownItem(keyword)`：搜索世界已知物品。每次生成新物品细节前必须先调用。
3. `generateItemSkill(payload)`：生成世界已知物品。仅当搜索未命中，且玩家明确检查、详细观察或实际到手时使用。
4. `addItemToTarget(target, item)`：无付款地新增物品给玩家或角色，例如收到、捡到、被赠送。
5. `transferItemSkill(from, to, itemName, quantity, reason)`：玩家与角色之间转移已有物品，例如赠送、交还、递给、拿走。
6. `deleteItemSkill(target, itemName, quantity, reason)`：删除玩家或角色物品，例如损坏、丢弃、消耗、遗失。
7. `purchaseItemSkill(target, item)`：购物获得物品。必须先检查玩家余额，余额足够才扣钱并新增物品。

## 推演要求

1. 涉及“当前是否持有某物”时，先用 `listCharacterItems` 查询目标背包，不要凭空假设。
2. 需要固化一个新物品细节前，先用 `searchKnownItem` 查询世界已知物品；命中则复用，不要重复生成。
3. 只是正文背景中出现的普通名词，不要生成物品，也不要写入背包。例如“桌上一支笔”但玩家没拿、没检查，只写正文即可。
4. 玩家明确检查、详细观察、打开包装、拿到手、购买成功、被赠送成功时，才可生成或新增详细物品。
5. 赠送、交还、递给、拿走用转移；损坏、丢弃、消耗、遗失用删除；被赠送、捡到、领到用新增；付款购买用购物。
6. 购物必须区分余额不足和购买成功。余额不足时，不要返回购买操作，只在 narration 里写失败和原因。
7. 每个物品操作必须写清 reason，说明现实证据和触发动作。

## final 输出建议

现实推演最终 JSON 可返回：

```json
{
  "itemActions": [
    {
      "action": "transfer",
      "from": "player-self",
      "to": "角色id或姓名",
      "itemName": "钥匙",
      "quantity": 1,
      "reason": "你明确把钥匙交给对方保管"
    },
    {
      "action": "purchase",
      "target": "player-self",
      "item": { "name": "矿泉水", "kind": "物品", "price": 3, "description": "便利店购买的瓶装水" },
      "reason": "你在便利店付款购买"
    }
  ]
}
```

不要在玩家正文中暴露方法名、数据库表名或“我调用了物品系统”。
