# 职业资料生成

为 AI RPG 建立职业资料。只返回 JSON，不要 Markdown。

## 变量区说明

职业不是一个孤立名称，必须由“身内能力、世界专属能力、技能、知识储备”共同构成。AI 必须根据世界观判断哪些构成合理，不能把不属于该世界的能力硬塞进去。

## 职业上下文区

- 世界：{世界}
- 职业：{职业}
- 角色：{角色}
- 身份：{身份}
- 背景：{背景}

## 当前词条候选区

以下是当前世界/角色相关的已有词条候选。生成职业构成时必须优先从这里挑选强相关项；缺失时才允许创建新词条。

- 身内能力候选：{身内能力候选}
- 世界专属能力候选：{世界专属能力候选}
- 技能候选：{技能候选}
- 知识储备候选：{知识储备候选}

## 职业确认规则

1. 职业必须是内化到角色自身的能力、经验与胜任资格，不等同当前公司、雇佣状态或岗位。
2. 工程师失业也仍可拥有工程师职业。
3. 学生/高中生/中学生/年级身份不算职业，属于阵营或角色地位，必须 confirmed=false。
4. 主角、配角、妹妹、父亲、联系人、悲剧核心、员工、候选人等标签不是职业。
5. 只有该职业符合当前世界观且能解释其能力构成时，confirmed 才能为 true。
6. 若职业明显不属于当前世界观，必须 confirmed=false；例如现实世界不能确认“修仙者、灵力师、魔法师”等超自然职业，除非世界背景明确存在这些体系。

## 职业构成规则

1. confirmed=true 时，intrinsicStats、learnedAbilities、knowledgeAreas 三类都至少返回 1 项。
2. worldAbilities 只在当前世界确实存在专属能力体系时返回；现实世界没有灵力、魔力、查克拉等，就不得创建这些世界能力。
3. 每一项构成都必须与职业强相关，不能为了凑数塞无关词条。
4. 优先使用“当前词条候选区”已有名称；候选不足时可以创建新技能或知识，但必须符合世界观。
5. 身内能力只能使用通用身体/心智/行动能力 key，例如 strength、agility、constitution、intelligence、perception、willpower、charisma、learning_ability、mental_stability、action_ability。
6. learnedAbilities 是可训练、可考核、可升级的技能名。
7. knowledgeAreas 是职业需要掌握的知识储备名。
8. requirements 描述 lv.1 考核最低要求，必须包含 intrinsicStats、worldAbilities、learnedAbilities、knowledgeAreas 四个数组；没有世界专属能力时 worldAbilities 为空数组并说明原因。

## 字段生成规则

1. name：职业名，必须简短明确。
2. summary：30字内简单介绍。
3. description：120字内详细介绍。
4. levelDescription：lv.1 代表的职责、熟练度或资格。
5. effect：lv.1 在剧情判定、资源、社会承认或行动中的实际作用。
6. intrinsicStats：该职业天然依赖或强化的身内能力 key，至少 1 项。
7. learnedAbilities：通过职业训练学会的技能名，至少 1 项。
8. knowledgeAreas：该职业必须具备的知识储备名，至少 1 项。
9. worldAbilities：与世界专属能力字段相关的字段 key 或能力名；不存在合理世界专属能力时返回 []。
10. requirements：职业 lv.1 考核要求，供已知职业 APP 对比玩家/角色能力。

## 输出规则

1. 必须体现职业升级后如何变强。
2. confirmed=true 时，不允许出现空的 intrinsicStats、learnedAbilities、knowledgeAreas。
3. 只返回 JSON，不要 Markdown。
4. 不要返回不符合世界观的世界专属能力。

## 返回格式

{"name":"职业名","confirmed":true,"summary":"30字内简单介绍","description":"120字内详细介绍","levelDescription":"lv.1说明","effect":"lv.1实际作用","intrinsicStats":["intelligence"],"learnedAbilities":["技能名"],"knowledgeAreas":["知识名"],"worldAbilities":[],"requirements":{"intrinsicStats":["intelligence"],"worldAbilities":[],"learnedAbilities":["技能名"],"knowledgeAreas":["知识名"],"reason":"这些构成为什么能支撑该职业lv.1"}}
