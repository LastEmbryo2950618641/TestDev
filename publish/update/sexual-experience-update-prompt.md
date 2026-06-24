---
name: sexual-experience-update
description: 根据成人虚构身份的稳定事实提取抽象性经验总次数与分类次数更新
---

# sexual-experience-update

确认玩家或角色的xing经历次数发生稳定变化时，返回 updateType:"sexual-experience"。

- 绑定卡片：角色卡；玩家本人绑定玩家卡。
- 只允许成人虚构身份；未成年或年龄未确认时不要新增或更新。
- 只记录抽象次数，不描写过程、姿势、器官互动或任何露骨细节。
- 总数字段：intimacy.sexualExperienceCount。
- 分类字段：intimacy.sexualExperienceParts.<partKey>。
- partKey 支持：genital（阴部）、chest（胸部）、lips（嘴唇）、mouth（口部）、oralAction（口部行为）、oralSex（口交）、oralInternalFinish（口交中出）、genitalEntry（阴部进入）、vaginalInsertion（阴部插入）、vaginalInternalFinish（阴部中出）、anus（肛门）、analEntry（肛部进入）、analSex（肛交）、analInternalFinish（肛交中出）、legs（腿部）、hips（臀部）、hands（手部）、skin（皮肤接触）、other（其他）。
- change.mode：delta / set。
- change.value 可为整数，或对象：
  - { "totalDelta": 1, "parts": { "lips": 1, "chest": 1 } }
  - { "partKey": "lips", "count": 1 }
- delta 表示增量，set 表示覆盖为确认后的次数。
- 同一次成人抽象经历可同时增加总次数与多个分类次数；不要因为分类多而重复增加总次数。
- reasons.trigger：写导致次数变化被确认的稳定事实；不能把暧昧、想象、梦境、未确认传闻计入。

分类记录提示：
- genital：仅在成人身份且明确稳定事实确认该部位相关经历时计数；禁止过程描写。
- chest：仅记录成人抽象经历中胸部相关次数，不记录触碰细节或感官描写。
- lips：仅记录接吻或唇部相关抽象次数，不展开亲密过程。
- mouth：仅记录口部相关抽象次数；如会变成露骨过程，必须跳过。
- oralAction：仅记录成人抽象口部行为次数，不描述动作、过程或感官细节。
- oralSex：仅记录成人抽象口交次数，不描述动作、过程或感官细节。
- oralInternalFinish：仅记录成人抽象口交中出次数，只作计数，不写过程、体液或感官描写。
- genitalEntry：仅记录成人抽象阴部进入次数，不描述进入过程、姿势或感官细节。
- vaginalInsertion：仅记录成人抽象阴部插入次数，不描述插入过程、姿势或感官细节。
- vaginalInternalFinish：仅记录成人抽象阴部中出次数，只作计数，不写过程、体液或感官描写。
- anus：仅在成人身份且明确事实确认时记录肛门相关次数，不写具体行为。
- analEntry：仅记录成人抽象肛部进入次数，不描述进入过程、姿势或感官细节。
- analSex：仅记录成人抽象肛交次数，不描述动作、过程或感官细节。
- analInternalFinish：仅记录成人抽象肛交中出次数，只作计数，不写过程、体液或感官描写。
- legs：记录腿部相关亲密接触的抽象次数，保持中性统计。
- hips：记录臀部相关抽象次数，避免任何露骨描述。
- hands：记录手部相关抽象次数，只作统计。
- skin：记录皮肤接触相关抽象次数，避免感官化描述。
- other：其他无法归类但合规的成人抽象经历次数。

旧角色卡/词条更新可继续返回，genericUpdates 用于统一结算展示与字段保存。
