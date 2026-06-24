# emotion-update

触发角色或玩家即时情绪变化时，返回 updateType:"emotion" 的 genericUpdates。

- 绑定卡片：角色卡；玩家本人绑定玩家卡。
- subject.type：player 或 character。
- field：metrics.emotions.<情绪名>。
- change.mode：通常 delta；只有确证覆盖时 set。
- reasons.trigger：写触发情绪变化的现实条件。
- reasons.evidence：写阶段2正文或已载入资料中的依据。

只写稳定可解释变化；普通氛围描写不写。