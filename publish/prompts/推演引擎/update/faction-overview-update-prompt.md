---
name: faction-overview-update
description: 根据现实推演正文提取新增势力或上层势力总览变化
---

# faction-overview-update

确认新增势力、上层势力归属、势力APP/势力总览层级变化时，返回 updateType:"faction-overview"。

- 绑定卡片：势力总览卡或上层势力卡。
- subject.type：faction_parent 或 faction_app。
- field：children.factions、overview.factions、apps.<appId>.factions。
- change.mode：append / upsert / link / unlink。
- reasons.trigger：写确认新势力存在或归属变化的触发条件。

势力内部职位变化使用 faction-structure，不要混用。