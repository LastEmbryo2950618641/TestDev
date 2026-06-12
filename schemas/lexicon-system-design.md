# 词条系统设计

本文件定义游戏内所有需要固化、保存到数据库、被 UI 展示或被 AI 长期引用的信息如何归类为“词条”。任何可被反复引用、解释、数值化、升级、追踪来源或参与判定的内容，都应先归入一种词条类型，再决定字段结构与更新规则。

## 设计目标

1. 所有固化信息都能用统一词条结构保存、查询、展示和同步。
2. 词条既能表示纯说明概念，也能表示会随剧情、环境、经验、等级、关系、状态变化的动态对象。
3. AI 新生成内容必须能归类，不能产生无法解释、无法更新、无法展示的游离字段。
4. 同名词条在不同世界、角色、阵营、地点下可以有不同版本，但必须有明确作用域。
5. 有等级的词条必须有经验、升级规则、等级说明和每级增效说明。

## 通用词条字段

所有词条至少应能映射到以下通用字段：

```text
id：稳定唯一标识，建议 worldTag + scope + type + name 生成
name：词条名
type：词条分类
scope：作用域，global / world / character / faction / location / save / scene
worldTag：所属世界或现实设定
ownerId：所属角色、阵营、地点或存档 ID，可为空
summary：短说明，用于列表和标签
description：详细说明，用于展开卡片
source：来源，schema / ai / state / player / system / imported
visibility：可见性，public / discovered / hidden / system
createdAt：创建时间
updatedAt：更新时间
version：结构版本
meta：类型专属扩展字段
```

字段说明：

- `scope=global`：全游戏通用概念，如“经验值”“等级”。
- `scope=world`：某世界内通用概念，如“魔术”“圣杯战争”。
- `scope=character`：角色专属状态、技能、记忆、关系、装备。
- `scope=faction`：阵营制度、声望、职位、资源。
- `scope=location`：地点属性、危险度、资源、环境状态。
- `scope=save`：当前存档全局状态，如世界线、已解锁规则。
- `scope=scene`：短期场景词条，通常可被归档或过期。

## 词条分类总表

| 分类 | 核心字段 | 是否动态 | 是否有等级 | 典型例子 |
| --- | --- | --- | --- | --- |
| 说明性词条 | 词条 + 说明 | 否 | 否 | 魔术、令咒、圣杯、现实都市生活 |
| 规则机制词条 | 词条 + 说明 + 公式/规则 | 否/半动态 | 可选 | 经验曲线、伤害结算、升级规则 |
| 环境动态数值性词条 | 词条 + 说明 + 当前值/范围 | 是 | 否 | 天气危险度、区域警戒、场景混乱度 |
| 角色基础动态数值词条 | 词条 + 说明 + 当前值/最大值 | 是 | 否 | 生命力、精力、精神稳定、疲劳度 |
| 情绪/心理动态数值词条 | 词条 + 说明 + 数值 + 阶段 | 是 | 否 | 恐惧、信任、反抗、爱情、依赖 |
| 等级动态数值性词条 | 词条 + 说明 + 等级 + 经验 + 等级说明 + 增效说明 | 是 | 是 | 知识、技能、职业、世界专属能力 |
| 身内能力来源词条 | 词条 + 当前值 + 来源拆分 | 是 | 否 | 力量、敏捷、体质、智力、感知、意志、魅力 |
| 衍生判定词条 | 词条 + 公式来源 + 当前值 | 是 | 否 | 攻击力、防御力、行动能力、学习能力 |
| 社会关系词条 | 词条 + 双方 + 数值/阶段 + 说明 | 是 | 可选 | 朋友、师徒、仇敌、亲属、恋人 |
| 阵营/身份词条 | 词条 + 说明 + 权限/地位 | 半动态 | 可选 | 御主、学生、医生、组织成员 |
| 装备/物品词条 | 词条 + 说明 + 持有者 + 效果 | 半动态 | 可选 | 手机、武器、礼装、药品 |
| 地点/区域词条 | 词条 + 说明 + 环境/资源/危险 | 是 | 可选 | 学校、医院、地下室、城市街区 |
| 事件/剧情词条 | 词条 + 时间 + 参与者 + 结果 | 是 | 否 | 一次战斗、一次相遇、一次告白 |
| 记忆词条 | 词条 + 内容 + 强度 + 时效 | 是 | 否 | 短期记忆、长期记忆、不可遗忘记忆 |
| 世界线词条 | 词条 + 分支状态 + 影响 | 是 | 可选 | 已发生事件、分歧、结局旗标 |
| 状态标签词条 | 词条 + 说明 + 持续条件 | 是 | 否 | 受伤、被控制、饥饿、警戒中 |
| 资源/消耗词条 | 词条 + 数值 + 恢复/消耗规则 | 是 | 可选 | 金钱、魔力、体力、道具数量 |
| 玩家设定词条 | 词条 + 玩家输入 + AI 补全 | 半动态 | 可选 | 玩家姓名、生日、身份、居住地 |
| 系统索引词条 | 词条 + 指向对象 + 检索信息 | 否 | 否 | 角色索引、地点索引、职业索引 |

## 说明性词条

用于解释抽象概念、专业术语、世界观设定，不直接参与数值更新。

```text
type = explanatory
必备字段 = name, summary, description, worldTag, source
可选字段 = related, examples, aliases
```

例：

- 魔术：解释世界观中的魔术体系。
- 圣杯战争：解释仪式规则。
- 现代都市：解释现实世界生活背景。

规则：

- 不保存当前值。
- 不保存经验。
- 可以被其它词条引用。
- 可以有多个世界版本，例如“型月魔术”和“原创魔术”不能混同。

## 规则机制词条

用于解释系统规则、公式、判定方式。

```text
type = rule
必备字段 = name, summary, description, formula, appliesTo
可选字段 = examples, priority, version
```

例：

- 个人经验曲线。
- 攻防结算规则。
- 身内能力来源拆分。

规则：

- 规则机制词条不应该被剧情随意改写。
- 若规则变更，必须更新 `version`。
- AI 可以引用，但不能把规则词条当成角色属性。

## 环境动态数值性词条

表示外部环境会改变的数值。

```text
type = environment_value
必备字段 = name, summary, value, min, max, description
可选字段 = trend, decayRule, updateReason, locationId
```

例：

- 区域警戒度。
- 天气危险度。
- 场景混乱度。
- 城市治安压力。

规则：

- 变化来源必须写入 `updateReason`。
- 数值变化通常由时间、事件、地点、阵营行动影响。
- 不使用经验升级，除非同时也是“等级动态数值性词条”。

## 角色基础动态数值词条

表示角色当前状态，通常有当前值/最大值。

```text
type = character_pool
必备字段 = name, current, max, summary, description
可选字段 = regenRule, damageRule, relatedStats
```

例：

- 生命力。
- 精力池。
- 精神稳定。
- 行动能力。

规则：

- `current` 可短期波动。
- `max` 由等级、身内能力、装备、状态计算。
- 展示时应优先显示 `current/max`。

## 情绪/心理动态数值词条

表示角色对玩家、事件或对象的心理状态。

```text
type = emotion_value
必备字段 = name, targetId, value, min, max, stage, reason
可选字段 = decayRule, lastEventId, confidence
```

例：

- 信任。
- 反抗。
- 恐惧。
- 爱情。
- 依赖。

规则：

- 必须有 `stage`，避免只显示数字。
- 每次变化必须有具体原因。
- AI 不能返回空泛原因，如“根据上下文推断”。

## 等级动态数值性词条

表示有等级、有经验、有升级收益的词条。

```text
type = leveled_value
必备字段 = name, category, level, exp, levelDescription, effect, nextEffect, linkedStats, source
可选字段 = maxLevel, unlocks, requirements, upgradeHistory
```

适用对象：

- 知识储备。
- 技能等级。
- 职业等级。
- 世界专属能力。
- 可成长装备熟练度。
- 阵营职位等级。
- 地点掌控等级。

规则：

1. 有等级就必须有经验系统。
2. 有等级就必须有当前等级说明。
3. 有等级就必须有当前等级实际作用。
4. 推荐保存下一等级增效 `nextEffect`，让玩家知道升级会变强在哪里。
5. 升级时必须记录 `upgradeHistory`。

等级说明模板：

| 等级 | 通用说明 | 增效方向 |
| --- | --- | --- |
| lv1 | 入门，知道概念或能做简单动作。 | 解锁基础使用。 |
| lv2 | 初学，能在低压环境稳定使用。 | 降低失败率。 |
| lv3 | 熟练，能处理常见情况。 | 提高稳定性和效率。 |
| lv4 | 专业，能独立处理复杂情况。 | 解锁复杂应用。 |
| lv5 | 专家，能优化、创新或指导他人。 | 提供高压场景加成。 |
| lv6 | 大师，领域内极少数高位者。 | 影响组织、流派或战局。 |
| lv7 | 传说，世界观顶级或规格外。 | 形成时代级、神秘级或规则级影响。 |

### 知识词条

```text
category = knowledge
必备字段 = name, level, exp, levelDescription, effect, linkedStats, source
禁止字段 = learnedAbilities, worldAbilities
```

说明：知识表示理解和信息储备，不直接等于能执行动作。

例：

- 世界常识 lv2。
- 高中数学 lv3。
- 魔术理论 lv4。

### 技能词条

```text
category = skill
必备字段 = name, level, exp, levelDescription, effect, linkedStats, source
禁止字段 = learnedAbilities, worldAbilities
```

说明：技能表示可执行动作能力。

例：

- 观察 lv2。
- 剑术 lv4。
- 手机操作 lv2。

### 职业词条

```text
category = profession
必备字段 = name, level, exp, levelDescription, effect, linkedStats, source
可选字段 = learnedAbilities, worldAbilities, socialAuthority, responsibility, certification
```

说明：职业表示长期身份、训练体系或社会功能，不是“主角/配角/重要人物”这类叙事标签。

例：

- 高中生 lv2。
- 医生 lv4。
- 魔术师 lv3。
- 骑士 lv5。

## 身内能力来源词条

表示角色底层资质与成长来源。

```text
type = intrinsic_stat
必备字段 = name, value, initial, levelValue, allocated, npcGrowth, description
可选字段 = cap, growthWeight, relatedPools
```

例：

- 力量。
- 敏捷。
- 体质。
- 智力。
- 感知。
- 意志。
- 魅力。

规则：

- 当前值必须能拆成来源：初始值 + 等级值 + 分配值 + 非玩家成长。
- 不直接使用经验条；它们通过个人等级、自由属性点、NPC 成长变化。
- 若玩家可手动分配，必须记录到 `allocated`。

## 衍生判定词条

由其它词条计算而来，不独立成长。

```text
type = derived_value
必备字段 = name, value, formula, inputs, description
可选字段 = lastComputedAt, combatUse
```

例：

- 攻击力。
- 防御力。
- 学习能力。
- 行动能力。

规则：

- 不直接手动修改。
- 源词条变化后必须重算。
- 展示时应说明来自哪些输入。

## 社会关系词条

表示两个或多个对象之间的关系。

```text
type = relationship
必备字段 = name, subjectId, objectId, relationType, value, stage, summary
可选字段 = history, trust, intimacy, conflict, obligations
```

例：

- 父母关系。
- 师徒关系。
- 恋人关系。
- 阵营敌对关系。

规则：

- 玩家相关关系必须以玩家填写为准。
- 未填写的人际关系不能擅自补完具体姓名。
- 关系变化必须记录事件来源。

## 阵营/身份词条

表示社会位置、组织身份或权限。

```text
type = identity
必备字段 = name, holderId, summary, authority, responsibility
可选字段 = rank, reputation, factionId, validUntil
```

例：

- 御主。
- 学生。
- 组织成员。
- 医院实习生。

规则：

- 身份不等于职业；短期身份只影响权限，不自动提高职业等级。
- 失去阵营身份不等于失去职业能力。

## 装备/物品词条

表示可持有、使用、消耗或成长的物品。

```text
type = item
必备字段 = name, ownerId, summary, description, effects
可选字段 = durability, quantity, rarity, level, exp, requirements
```

例：

- 手机。
- 武器。
- 魔术礼装。
- 药品。

规则：

- 普通物品不需要等级。
- 可成长装备必须归入等级动态数值性词条，并提供经验与增效说明。

## 地点/区域词条

表示可被进入、记忆、影响的地点。

```text
type = location
必备字段 = name, worldTag, summary, description, environmentValues
可选字段 = ownerFaction, danger, resources, discovered, connectedLocations
```

例：

- 学校。
- 医院。
- 地下室。
- 城市街区。

规则：

- 地点可以挂载环境动态数值性词条。
- 地点可以有掌控等级、危险等级或资源恢复规则。

## 事件/剧情词条

表示已发生的剧情事实。

```text
type = event
必备字段 = name, happenedAt, participants, summary, result
可选字段 = locationId, relatedEntries, impact, archived
```

例：

- 第一次上线操控。
- 一场战斗。
- 一次告白。
- 一次逃亡。

规则：

- 事件词条通常不可直接改写，只能追加补充。
- 长期重要事件应同步进入记忆或世界线。

## 记忆词条

表示角色可回忆、会遗忘或永久保留的信息。

```text
type = memory
必备字段 = name, ownerId, content, memoryKind, strength, summary
可选字段 = relatedEventId, decayAt, archiveId, emotionalTags
```

例：

- 短期记忆。
- 长期记忆。
- 难以忘记。
- 不可忘记。

规则：

- 记忆可以由事件词条生成。
- 记忆强度影响是否进入长期归档。
- 不可忘记记忆不能被普通遗忘流程删除。

## 世界线词条

表示存档级分支、旗标和全局后果。

```text
type = worldline
必备字段 = name, saveId, summary, branchState, impact
可选字段 = parentBranch, flags, endingProgress, locked
```

例：

- 某角色是否存活。
- 某阵营是否敌对。
- 某关键事件是否发生。
- 结局路线进度。

规则：

- 世界线词条影响全局，不应挂在单个角色状态里。
- AI 推进剧情时必须尊重已固化世界线。

## 状态标签词条

表示短期或中期状态。

```text
type = status_tag
必备字段 = name, holderId, summary, condition
可选字段 = duration, stack, severity, removeRule
```

例：

- 受伤。
- 饥饿。
- 被控制。
- 警戒中。

规则：

- 状态标签应有移除条件。
- 若状态有数值，应拆成动态数值词条。

## 资源/消耗词条

表示可消耗、恢复、交易或积累的资源。

```text
type = resource
必备字段 = name, ownerId, current, max, summary
可选字段 = regenRule, consumeRule, unit, source
```

例：

- 金钱。
- 魔力。
- 道具数量。
- 行动次数。

规则：

- 资源必须有单位或用途说明。
- 可升级资源容量时，容量来源应写明。

## 玩家设定词条

表示玩家输入并被系统或 AI 补全的个人设定。

```text
type = player_profile
必备字段 = name, value, source, summary
可选字段 = rawValue, refinedValue, confidence, lockedByPlayer
```

例：

- 玩家姓名。
- 生日。
- 年龄。
- 城市。
- 现实身份。
- 父母状态。

规则：

- 玩家填写内容优先级最高。
- AI 只能补全不完整信息，不能覆盖玩家明确设定。
- 父母未填写时，按当前游戏规则默认父母已故并保存死因。

## 系统索引词条

用于检索与去重，不直接展示为剧情内容。

```text
type = index
必备字段 = name, targetType, targetId, aliases
可选字段 = searchText, embeddingKey, lastSyncedAt
```

例：

- 角色名索引。
- 职业名索引。
- 地点别名索引。

规则：

- 索引词条不参与剧情判定。
- 删除目标对象时必须同步清理或标记失效。

## 词条固化规则

以下内容必须固化为词条：

1. 会被 UI 展示并可展开说明的内容。
2. 会被 AI 后续回合引用的专有名词、职业、技能、知识、地点、阵营。
3. 会随数值变化的角色状态、环境状态、心理状态。
4. 有等级、经验、成长或升级收益的内容。
5. 会影响剧情分支或长期记忆的事件。
6. 玩家输入的关键个人设定。
7. AI 补全后会被保存并反复使用的信息。

以下内容不应固化，除非被玩家或剧情反复引用：

- 单句临时描写。
- 一次性的无名路人动作。
- 不影响后续的环境修辞。
- AI 临时推理过程。

## 词条更新规则

1. 说明性词条：只在设定修正或资料补全时更新。
2. 动态数值词条：每次数值变化必须记录原因。
3. 等级词条：经验变化、升级、降级都必须记录历史。
4. 关系词条：必须记录触发事件，避免无原因跳变。
5. 事件词条：原则上只追加，不覆盖。
6. 玩家设定词条：玩家明确输入优先，AI 不得覆盖。
7. 世界线词条：影响全局，更新前必须能说明因果。

## UI 展示规则

- 列表中优先显示：`name + 当前核心值`。
- 等级词条显示：`名称 lv.X`。
- 动态数值词条显示：`名称 当前值/最大值` 或 `名称 阶段`。
- 展开后显示：说明、来源、当前作用、变化原因、关联词条。
- 知识/技能/职业等等级词条展开后必须显示等级说明与当前作用。
- 说明性词条展开后只显示说明、来源、关联词条。

## AI 生成规则

AI 生成任何可保存内容时，必须先判断词条类型：

```text
这是说明概念？动态数值？等级能力？关系？地点？事件？记忆？世界线？玩家设定？
```

然后按对应类型输出字段。若无法归类，使用最接近的类型，并在 `summary` 中说明用途。禁止生成只有名字、没有类型、没有说明、没有作用域的词条。

AI 生成等级词条时必须额外回答：

```text
这个等级代表什么？
当前等级具体让角色变强在哪里？
升到下一级会增强什么？
经验从哪里获得？
```

## 与当前系统的映射

| 当前系统对象 | 词条类型 |
| --- | --- |
| rpgLexicon 属性解释 | 说明性词条 / 规则机制词条 |
| knowledge | 等级动态数值性词条：知识 |
| skills | 等级动态数值性词条：技能 |
| professions | 等级动态数值性词条：职业 |
| strength/agility 等 | 身内能力来源词条 |
| vitality/stamina_pool/mental_stability | 角色基础动态数值词条 |
| emotions/playerFeelings | 情绪/心理动态数值词条 |
| factions/status_tags | 阵营/身份词条 / 状态标签词条 |
| equipment | 装备/物品词条 |
| characterMemory | 记忆词条 |
| worldline | 世界线词条 |
| playerProfile | 玩家设定词条 |
| professionInfo | 职业词条的 AI 资料扩展 |

## 最小落库结构建议

```json
{
  "id": "world:scope:type:name",
  "name": "词条名",
  "type": "leveled_value",
  "scope": "character",
  "worldTag": "2026 现代都市现实世界",
  "ownerId": "player-self",
  "summary": "短说明",
  "description": "详细说明",
  "source": "ai",
  "visibility": "public",
  "meta": {
    "category": "skill",
    "level": 2,
    "exp": { "current": 0, "next": 250 },
    "levelDescription": "技能lv2｜初学：能在低压环境稳定使用。",
    "effect": "可在基础场景中提供行动判定加成。",
    "linkedStats": ["agility", "perception"]
  }
}
```

该结构不是唯一实现形式，但任何落库结构都必须能完整表达：分类、作用域、说明、来源、动态值或等级信息。
