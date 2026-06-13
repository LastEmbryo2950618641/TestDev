# 职业资料生成

为 AI RPG 建立职业资料。

## 上下文

- 世界：{世界}
- 职业：{职业}
- 角色：{角色}
- 身份：{身份}
- 背景：{背景}
- 世界专属能力字段：{世界字段}

## 规则

1. 职业必须是内化到角色自身的能力、经验与胜任资格，不等同当前公司、雇佣状态或岗位。
2. 工程师失业也仍可拥有工程师职业。
3. 学生/高中生/中学生/年级身份不算职业，属于阵营或角色地位，必须 confirmed=false。
4. 只有百分之百确认该职业适用时 confirmed=true，否则 confirmed=false。
5. 必须体现职业升级后如何变强：levelDescription 写该职业当前等级代表的职责/熟练度，effect 写该等级在剧情判定、资源、社会承认或行动中的实际作用。
6. 只返回 JSON，不要 Markdown。
7. 除 name、confirmed、summary、description、levelDescription、effect 外，其它字段没有依据或不需要更改就不要返回。

## 返回格式

{"name":"职业名","confirmed":true,"summary":"30字内简单介绍","description":"120字内详细介绍","levelDescription":"当前等级说明","effect":"当前等级实际作用","intrinsicStats":["strength"],"learnedAbilities":["能力名"],"worldAbilities":["字段key或能力名"]}
