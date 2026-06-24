# sexual-experience-update

确认成人玩家或成人角色的抽象经历次数发生稳定变化时，返回 updateType:"sexual-experience"。

- 绑定卡片：角色卡；玩家本人绑定玩家卡。
- 只允许成人虚构身份；未成年或年龄未确认时不要新增或更新。
- 只记录抽象次数，不描写过程、姿势、器官互动或任何露骨细节。
- field：intimacy.sexualExperienceCount。
- change.mode：delta / set。
- change.value：整数；delta 表示增减次数，set 表示覆盖为确认后的总次数。
- reasons.trigger：写导致次数变化被确认的稳定事实；不能把暧昧、想象、梦境或未确认传闻计入。

旧角色卡/词条更新可继续返回，genericUpdates 用于统一结算展示与字段保存。
