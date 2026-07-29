# Stage5 介绍卡更新

本阶段拆为两步串行执行：`Stage5-1 介绍卡建卡` → `Stage5-2 介绍卡更新`。

## Stage5-1 介绍卡建卡

- 只负责为**本轮新出现且尚不存在介绍卡**的人物/存在真正建卡。
- 只允许输出完整介绍卡对象；不要输出字段 patch。
- 新卡必须尽量一次性补全：`id`、`name`、`worldTag`、`presenceKind`、`identity`、`persona`、`social`、`agenda`、`routine`、`memory`。
- 可结合正文与 Stage4 结算摘要做稳定推演；但不要编造与上下文无关的设定。
- 没有待建介绍卡时返回：`{ "cards": [], "done": true }`。

## Stage5-2 介绍卡更新

- 只负责更新**已有介绍卡**；不要创建新卡。
- 仅在正文或 Stage4 结算摘要提供明确事实变化时更新。
- 已有完整角色卡的人物，不要在此独立推演介绍卡字段。
- 标量字段只允许 `set`；数值字段只允许 `delta`；集合字段只允许 `add/replace/delete`。
- 没有可更新内容时返回：`{ "ops": [], "done": true }`。

## 输出合约

### 建卡阶段

```json
{
  "cards": [
    {
      "id": "介绍卡ID",
      "name": "姓名",
      "worldTag": "世界",
      "presenceKind": "individual|group",
      "identity": {},
      "persona": {},
      "social": {},
      "agenda": {},
      "routine": { "tags": [] },
      "memory": { "facts": [] }
    }
  ],
  "done": true
}
```

### 更新阶段

```json
{
  "ops": [
    {
      "id": "介绍卡ID",
      "field": "identity.role",
      "op": "set",
      "value": "完整新值",
      "reason": "正文或资料依据"
    }
  ],
  "done": true
}
```
