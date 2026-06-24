# role-card-update

确认玩家或角色卡资料、身份、职业、技能、外貌、性格、人际关系等稳定变化时，返回 updateType:"role-card"。

- 绑定卡片：角色卡；玩家本人绑定玩家卡。
- field：profile.<字段>、skills.<技能名>、relationships.<关系名> 等精确路径。
- change.mode：set / merge / upsert / append。
- 只有稳定事实变化才写；临时情绪不要写入角色卡。

旧 lexiconUpdates 可继续返回，genericUpdates 用于统一结算展示。