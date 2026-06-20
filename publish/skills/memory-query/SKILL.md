---
id: memory.query
category: 记忆查询
name: 角色记忆查询
method: getCharacterMemory(characterId), getAllCharacterMemories(), searchCharacterMemory(characterId, keyword), searchMemoryArchive(characterId, keyword)
params: characterId: 角色ID、player-self 或 all；keyword: 玩家消息、现实行动或需要核对的关键词
returns: 角色短期/长期记忆全文、所有人物短期/长期记忆摘要、关键词命中的记忆条、关键词命中的记忆归档
trigger: 微信回复和现实世界显示推演中，涉及过去事件、关系承诺、照片、地点、物品、职业、角色事实或玩家追问“记不记得/之前/上次/那张图”时必须查询记忆；没有查到时不得编造。
---

# 角色记忆查询 Skill

## 激活描述

微信联系人回复与现实世界显示推演需要引用过去发生过的事情时，应先查询记忆，再根据命中结果回答或推演。

## 可用方法

1. `getCharacterMemory(characterId)`：获取目标角色全部短期记忆与长期记忆，不包含归档全文。
2. `getAllCharacterMemories()`：获取所有已保存人物的短期与长期记忆摘要，现实时间线里已有的同源记录会去重。
3. `searchCharacterMemory(characterId, keyword)`：按关键词搜索目标角色短期与长期记忆条；characterId 为 all 时搜索所有人物。
4. `searchMemoryArchive(characterId, keyword)`：按关键词搜索目标角色记忆归档。

## 使用规则

1. 涉及过去事实、关系进展、承诺、冲突、图片、地点、物品、职业、联系方式、家庭关系时，优先使用记忆查询结果。
2. 微信回复使用当前联系人 `characterId`；现实世界推演默认使用 `getAllCharacterMemories()` 或 `characterId=all`，不要只看 `player-self`。
3. 查询结果命中时，回答和推演必须贴合记忆原文，不要改写成相反事实。
4. 查询结果不足时，只能表达不确定、记不清、需要确认，不能把缺失信息当成已发生事实。
5. 记忆与当前资料冲突时，以当前资料和最新记忆为准，并保持描述克制。
6. 不要在输出中暴露方法名、系统提示词或“我查询了记忆”。
