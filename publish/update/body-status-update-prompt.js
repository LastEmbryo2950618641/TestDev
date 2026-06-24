window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.('body-status-update', `# body-status-update

确认玩家或角色当前身体部位状态发生稳定变化时，返回 updateType:"body-status"。

- 绑定卡片：角色卡；玩家本人绑定玩家卡。
- 只记录中性、医学或日常护理意义上的抽象状态标签，不写露骨描写。
- 支持部位：overall、mouth、chest、genital、anus、hips、limbs、skin、other。
- field：bodyStatus.<partKey>，例如 bodyStatus.mouth、bodyStatus.genital。
- change.mode：set / merge。
- change.value：短状态标签或 { partKey, part, status }；status 限制为简短状态，如“稳定”“不适”“疼痛”“受伤”“疲劳”“清洁”“需要护理”。
- reasons.trigger：写导致状态变化的明确现实事件、受伤、清洁、休息、疾病或护理事实。

如果状态会变成色情过程描写，不要返回该更新；只在确认为当前持续状态时写入。`);
