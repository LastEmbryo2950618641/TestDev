---
id: wechat.query
name: 微信资料查询
category: 微信
method: listWechatSkills / listContacts / getThread
returns: 微信可操作技能、联系人清单或指定会话最近消息
trigger: 现实推演涉及角色思念、主动联系玩家、读取联系人或微信历史时使用
---

## 推演要求

- listWechatSkills：读取微信可执行能力，确认是否能写入当前或过去消息。
- listContacts：读取联系人 id、角色 id、关系、未读数和最近消息。
- getThread：读取某联系人最近微信消息，用于保持口吻与关系连续性。
- 只读取资料，不改变游戏状态。
