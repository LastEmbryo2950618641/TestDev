# Character Schedule Pipeline Design

## Goal

接入 `store.characterSchedules` 到推演管线：Stage1/Stage2 读取日程表生成候选与场景边界，Stage4 只针对本轮明确涉及的角色写回日程更新。

核心约束：角色日程默认稳定，不进行全角色每轮 AI 结算；只有用户行动、大事件、明确移动、通信、约定或本轮参与者状态变化才更新相关角色。

## Current Context

已有初始日程初始化：预设角色卡进入游戏时，`predefinedRoleCards.saveSelectedRoleCardStates(store)` 会从角色 RPG state 的 `values.current_location` 初始化 `store.characterSchedules[id]`。

日程条目形状：

```js
{
  characterId: string,
  characterName: string,
  currentLocation: string,
  currentAction: string,
  availability: '在场' | '场外' | '未知',
  confidence: '确认' | '默认',
  source: '角色卡初始化' | '结算事件',
  stability: '默认稳定' | '事件锁定',
  updatedAt: string,
  reason: string
}
```

## Design Decision

采用“同住/相邻地点进入候选”的方案。

- Stage1/Stage2 可以把同一精确地点、同一住所、相邻空间的角色作为候选。
- 日程候选不是强制出场，只是可用性事实。
- 每轮最多注入 3 个日程候选，避免污染上下文。
- `availability === '场外'` 的角色不得进入强制/高优先候选，可作为场外/禁止依据。
- 随机候选机制保留，但不得违背明确场外日程。

## Stage1/Stage2 Schedule Read Path

新增轻量 helper：

```js
scheduleParticipantHints(store, action, currentLocation)
```

输入：

- `store.characterSchedules`
- `store.rpgStates`
- 当前行动文本
- 当前场景地点

输出：

```js
{
  sameLocation: [],
  nearbyLocation: [],
  offstage: [],
  unknown: []
}
```

每项包含：

```js
{
  id,
  name,
  currentLocation,
  currentAction,
  availability,
  reason
}
```

### Location Matching

先实现保守文本规则，不引入地图图数据库：

1. 精确同地点：`schedule.currentLocation === currentLocation`。
2. 同住/相邻：
   - 当前地点和角色地点共享明显住所片段，例如小区、楼栋、单元、门牌。
   - 一个地点包含另一个地点文本。
   - 家庭空间词触发弱邻近判断，例如房间、卧室、客厅、厨房、走廊、卫生间、门口。
3. 判断不出来时不作为候选，避免污染。

## Stage1 Prompt Integration

Stage1 routing context 增加压缩段：

```text
日程候选提示：
同地点：...
同住/相邻：...
明确场外：...
未知位置：...
```

规则：

- 同地点、同住、相邻角色可进入 `高优先候选` 或 `戏剧候选`。
- 不得仅因日程候选就强制出场。
- 明确场外角色不得进入强制/高优先候选。
- 每轮最多选择 3 个日程候选。
- 资料状态仍由现有 `资料状态` 字段决定，日程候选不替代资料请求契约。

Stage1 parse 后继续复用现有 `participantProfileRequests(data)` 加载候选角色卡，不新增资料请求类型。

## Stage2 Prompt Integration

Stage2 `buildSceneAnchorContext` 增加同一份压缩日程边界。

Stage2 用途：

- 判断谁可以直接出现。
- 判断谁可以被听见、敲门、发消息或临时闯入。
- 判断谁明确场外，避免冲突出场。

Stage2 仍允许保留随机趣味和新候选，但新候选不能违反明确场外事实。

## Stage4 Schedule Write Path

新增 Stage4 结算类型：

```text
人事安排
```

建议放置在 `地图` 后、`势力总览/系统记录` 前。

原因：

- 地图结算负责地点事实。
- 人事安排负责角色位置、行动、可用性。
- 避免把临时位置写入角色卡。
- 避免混入通用固化导致难解析。

### Stage4 Contract

```text
人事安排结算：
结算状态：需要更新 / 无变化
结算对象：刘思琪｜角色｜允许结算
更新N：人事安排，当前地点，刘思琪房间，玩家进入房间后刘思琪仍在房间内互动
更新N：人事安排，当前行动，和玩家交谈，正文明确发生对话互动
更新N：人事安排，可用状态，在场，正文确认其仍可参与当前场景
结算对象结束：刘思琪
类型完成：是
结算结束：是
```

### Parse Output

`人事安排` 不走 generic `status_tags`，解析为专门 update：

```js
{
  updateType: 'character-schedule',
  subject: { type: 'character', id, name },
  field: 'characterSchedules',
  change: {
    mode: 'merge',
    value: {
      currentLocation?,
      currentAction?,
      availability?,
      reason?
    }
  },
  reasons: [{ trigger, evidence, confidence: 'confirmed' }]
}
```

### Apply Behavior

写入 `store.characterSchedules[id]`：

- patch merge，不整条覆盖。
- 只更新模型输出的字段。
- 未输出字段保留旧值。
- 写入 `source: '结算事件'`。
- 写入 `stability: '事件锁定'`。
- 写入当前 `updatedAt`。
- `confidence` 设为 `确认`。

## Stage4 Update Conditions

只允许更新：

- 本回合参与者。
- 本轮正文明确通信、移动、约定涉及的人。
- 有明确事实或强暗示事实支撑的角色状态。

允许事实：

- 明确移动：离开、回家、去学校、进入某地。
- 明确行动变化：睡觉、洗澡、上课、发消息、交谈。
- 明确可用性变化：在场、场外、暂不可用、未知。

不允许更新：

- 未出现在本回合参与者或明确事件里的角色。
- 仅凭“可能在家”“也许听见”的弱推测。
- 弱氛围暗示。
- 全角色批量刷新。

## Error Handling

### Stage1/Stage2

- 没有 `store.characterSchedules` 时输出 `日程候选提示：无`。
- 位置未知角色不作为高优先候选。
- 同住/相邻判断失败时不注入候选。
- 明确场外角色不进入可出场候选。

### Stage4

- `人事安排` 类型格式不完整时，该类型未完成并重试。
- 非参与者角色更新被 parser 拒绝。
- 未知 `availability` 归一化为 `未知` 或丢弃该字段。
- `结算状态：无变化` 不生成 update。

## Testing Plan

主要测试文件：`tests/real-world-loop-update.test.js`。

新增测试：

1. `scheduleParticipantHints`：
   - 同一地点进入 `sameLocation`。
   - 同住/相邻地点进入 `nearbyLocation`。
   - 场外进入 `offstage`。
   - 最多返回 3 个可候选角色。

2. Stage1/Stage2 context：
   - prompt 包含 `日程候选提示`。
   - 同住妹妹出现在候选提示里。
   - 场外角色不被标为可候选。

3. Stage4 parse：
   - 能解析 `人事安排结算`。
   - 生成 `updateType: 'character-schedule'`。
   - 非参与者更新被拒绝。

4. Stage4 apply/merge：
   - 只更新输出字段。
   - 保留未输出字段。
   - 写入 `source: '结算事件'`。
   - 不影响其它角色。

## Non-Goals

- 不做全角色每轮 AI 日程刷新。
- 不新增数据库表。
- 不移除 Stage2 随机候选趣味。
- 不实现复杂地图邻接图，只做保守文本相近判断。
- 不把临时日程写入角色卡长期资料。

## Principles

- KISS：复用 `store.characterSchedules` 和现有候选加载链路。
- YAGNI：只实现当前需要的候选读取与事件写回。
- DRY：同一个日程 hint helper 同时服务 Stage1、Stage2、随机事件边界。
- SOLID：日程读取、prompt 注入、结算解析、写回应用分层实现。
