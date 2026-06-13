# 职业资料生成

为 AI RPG 建立职业资料。

## 模板构成拆分

1. 任务定位：判定某个名称是否能作为职业固化。
2. 上下文：世界、职业名、角色、身份、背景、世界字段。
3. 职业确认：决定 confirmed true/false。
4. 职业描述：生成 summary、description。
5. 等级说明：生成 levelDescription。
6. 实际作用：生成 effect。
7. 能力映射：生成 intrinsicStats、learnedAbilities、worldAbilities。
8. 返回格式：严格 JSON。

## 可调项说明

- 想职业更严格：提高 confirmed=true 门槛。
- 想职业更丰富：增加 learnedAbilities 数量。
- 想和世界专属字段绑定：强化 worldAbilities 规则。
- 想避免学生等身份误判：强化非职业排除规则。

## 上下文

- 世界：{世界}
- 职业：{职业}
- 角色：{角色}
- 身份：{身份}
- 背景：{背景}
- 世界专属能力字段：{世界字段}

## 职业确认规则

1. 职业必须是内化到角色自身的能力、经验与胜任资格，不等同当前公司、雇佣状态或岗位。
2. 工程师失业也仍可拥有工程师职业。
3. 学生/高中生/中学生/年级身份不算职业，属于阵营或角色地位，必须 confirmed=false。
4. 主角、配角、妹妹、父亲、联系人、悲剧核心、员工、候选人等标签不是职业。
5. 只有百分之百确认该职业适用时 confirmed=true，否则 confirmed=false。

## 字段生成规则

1. name：职业名，必须简短明确。
2. summary：30字内简单介绍。
3. description：120字内详细介绍。
4. levelDescription：该职业当前等级代表的职责、熟练度或资格。
5. effect：该职业等级在剧情判定、资源、社会承认或行动中的实际作用。
6. intrinsicStats：该职业天然强化的基础属性 key。
7. learnedAbilities：通过职业训练学会的能力名。
8. worldAbilities：与世界专属能力字段相关的字段 key 或能力名。

## 输出规则

1. 必须体现职业升级后如何变强。
2. 只返回 JSON，不要 Markdown。
3. 除 name、confirmed、summary、description、levelDescription、effect 外，其它字段没有依据或不需要更改就不要返回。

## 返回格式

{"name":"职业名","confirmed":true,"summary":"30字内简单介绍","description":"120字内详细介绍","levelDescription":"当前等级说明","effect":"当前等级实际作用","intrinsicStats":["strength"],"learnedAbilities":["能力名"],"worldAbilities":["字段key或能力名"]}
