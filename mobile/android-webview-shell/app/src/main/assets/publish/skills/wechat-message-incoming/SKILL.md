---
id: wechat.message.incoming
name: 角色主动微信消息
category: 微信
method: sendIncomingNow / sendIncomingPast
params: contactId或characterId、text、timeIso(过去消息必填)、intentChain(必填)、sourceRecordId(由系统挂本轮记录ID)
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
- intentChain（必填对象）：完整意图链条，四段都要写：
  - cause：起因（为什么会有这件事）
  - process：过程（为此自己做了什么）
  - result：结果（事情到哪一步）
  - whyPlayer：找主角的原由

## 推演要求

- sendIncomingNow 表示当前手机时间主动发来消息。
- sendIncomingPast 表示过去时间已发来但玩家未回应，适合思念度溢出回溯。
- 不要代替玩家回复，不要连续刷屏；同一角色本轮最多写 3 条。
- narration 中必须同步体现该微信消息或未读消息的存在。
- Social Inbox 已准备「wechat 且已有好友」的来信时，不要再写 sendIncoming（系统会代码投递）。
- intentChain 必须是完整四段链条，禁止只写一句 reason 代替。
