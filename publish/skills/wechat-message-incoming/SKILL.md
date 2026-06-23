---
id: wechat.message.incoming
name: 角色主动微信消息
category: 微信
method: sendIncomingNow / sendIncomingPast
params: contactId或characterId、text、timeIso(过去消息必填)
returns: 在 final.wechatActions 中写入角色发给玩家的微信消息
trigger: 角色思念触发，角色选择用微信主动联系玩家时使用
---

## 输出字段

final.wechatActions 使用数组：

- action：sendIncomingNow 或 sendIncomingPast。
- contactId：微信联系人 id 或角色 id。
- text：角色发给玩家的消息，必须符合角色性格和关系进度。
- timeIso：sendIncomingPast 必填，表示过去错过触发时的发送时间。
- reason：为什么这条消息由思念触发。

## 推演要求

- sendIncomingNow 表示当前手机时间主动发来消息。
- sendIncomingPast 表示过去时间已发来但玩家未回应，适合思念度溢出回溯。
- 不要代替玩家回复，不要连续刷屏；同一角色本轮最多写 3 条。
- narration 中必须同步体现该微信消息或未读消息的存在。
