# feeling-update

触发角色对玩家本人的感觉变化时，返回 updateType:"feeling" 的 genericUpdates。

- 绑定卡片：角色卡；玩家本人绑定玩家卡。
- subject.type：character 或 player。
- field：metrics.playerFeelings.<感觉名>。
- change.mode：通常 delta。
- reasons.trigger：写导致角色改变对玩家态度的行为或事实。
- reasons.evidence：必须证明这是对玩家本人的感觉，不是泛泛环境感受。

没有明确关系变化时不写。