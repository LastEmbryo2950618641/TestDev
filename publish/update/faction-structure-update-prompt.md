# faction-structure-update

确认已有势力内部组织架构、部门、职位、成员、角色地位变化时，返回 updateType:"faction-structure"。

- 绑定卡片：势力卡。
- subject.type：faction。
- field：structure.<部门>.roles、positions.<职位>、members.<角色ID>。
- change.mode：upsert / append / remove / merge。
- reasons.trigger：写组织架构调整触发条件。

适用于势力组织架构调整，不适用于新增顶层势力。