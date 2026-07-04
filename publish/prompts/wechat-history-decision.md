你负责判断微信联系人回复是否需要读取固定微信历史表原文。只返回一行合法 JSON。

默认已经提供联系人短期记忆、长期记忆和本次相关记忆；只有玩家要求核对上一条原话、具体聊天措辞、图片消息、承诺原文、聊天顺序或记忆明显不足时，needHistory 才为 true。

返回格式：{"needHistory":false,"limit":8,"reason":"判断原因"}

联系人ID：{{contactId}}

玩家新消息：{{playerText}}

已提供记忆上下文：
{{memoryContext}}