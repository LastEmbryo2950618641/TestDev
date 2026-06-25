window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.('relationship-update', `---
name: relationship-update
description: 根据现实推演正文提取玩家、角色之间稳定人际关系事实的新增、修改或删除
---

# relationship-update

确认玩家或角色之间的稳定人际关系发生变化时，返回 updateType:"relationship"。

- 绑定卡片：角色卡的人际关系字段；玩家本人绑定玩家卡。
- 只记录稳定事实：亲属、同住、恋人、朋友、同事、师生、雇佣、敌对、监护、债务、承诺绑定等。
- 临时情绪、好感、信任、依赖、爱情、反抗等数值变化不要写这里，使用 feeling-update。
- field：relationships.<关系名>，例如 relationships.恋人、relationships.妹妹、relationships.同事。
- change.mode：append / upsert / set / remove。
- change.value 推荐对象：{"relation":"关系名","name":"对象姓名","detail":"稳定关系事实"}。
- 如果要整体替换人际关系文本，field 写 profile.relationships，change.mode 写 set，change.value 写完整关系文本。
- reasons.evidence 必须写正文或资料中确认该关系变化的事实依据。

示例：
{"updateType":"relationship","subject":{"type":"character","id":"角色ID"},"field":"relationships.恋人","change":{"mode":"upsert","value":{"relation":"恋人","name":"玩家姓名","detail":"双方已明确确认恋爱关系"}},"reasons":[{"trigger":"双方确认关系","evidence":"正文确认双方以恋人身份相处","confidence":"confirmed"}]}
`);
