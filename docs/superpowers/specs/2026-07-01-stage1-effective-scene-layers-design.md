# Stage1 有效场景候选层设计

## 背景

当前 Stage1 会多轮输出查询规划和候选层，`trace` 保留了每轮结果。现有 Stage2 直接从全部 `trace` 中合并强制出场、高优先候选、戏剧候选、禁止出场和随机事件，导致早期探索性候选污染最终场景边界。

本设计将 Stage1 的“历史过程”和“最终有效状态”拆开：`trace` 只用于日志与审计，Stage2/Stage3/Stage4 使用解析后的最终有效候选层。

## 目标

1. 下一轮 Stage1 能看到上一轮查询规划摘要，避免每轮重新开局。
2. Stage2 不再消费历史候选并集，而是消费最终有效候选层。
3. 玩家/当前被控主体始终属于强制出场人物。
4. 强制出场允许多人，不限制为单一角色。
5. 随机主动事件默认场外，并按最终候选层跨轮清理。
6. 角色卡加载只作为参考资料，不等于出场或结算资格。

## 非目标

1. 不改变 Stage3 正文生成主流程。
2. 不扩大 Stage4 结算范围；仍只结算玩家、强制出场、正文确认实际进入/互动/受影响的对象。
3. 不重写材料查询系统。
4. 不把高优先候选或戏剧候选自动升级为强制出场。

## 核心语义

### Stage1 trace

`trace` 表示每轮 Stage1 的历史输出。它用于调试、日志展示和审计，不直接代表当前场景最终事实。

### 有效场景候选层

新增统一解析结果：

```js
{
  forcedParticipants,
  priorityCandidates,
  dramaCandidates,
  forbiddenParticipants,
  randomActiveEvents,
  randomIntrusionCondition
}
```

该结果是 Stage1 多轮输出收敛后的最终状态，供 Stage2/Stage3/Stage4 使用。

## 解析规则

### 1. 后轮优先

候选层以较新的 Stage1 输出为准。后一轮明确输出某一候选层时，代表对该层的当前判断。

示例：

```text
第1轮：戏剧候选：刘思怡
第3轮：戏剧候选：无
最终：戏剧候选：无
```

### 2. 玩家/被控主体兜底强制出场

解析器最终强制补入玩家主体：

- 现实模式：补入 `player-self` / 玩家本人。
- 操控剧情或附身模式：补入当前被控角色。
- 如果同一模式下玩家本体仍在当前行动范围内可行动，也保留玩家本体。

模型是否在 Stage1 中写出玩家不影响最终结果，代码层必须兜底。

### 3. 强制出场允许多人

`forcedParticipants` 是数组，不限制数量。可以同时包含：

- 玩家本人；
- 当前被控角色；
- 玩家本次行动明确作用对象；
- 已经同场景且必然回应的人；
- 本次动作物理上必须涉及的人。

强制出场的定义是“玩家行动的必然主体集合”，不是“唯一主角”。

### 4. 层级冲突处理

同一人物不能同时存在于多个有效层。优先级如下：

```text
强制出场 > 禁止出场 > 高优先候选 > 戏剧候选 > 随机主动事件
```

补充规则：

- 玩家/当前被控主体不得进入禁止出场。
- 如果普通角色同时出现在强制出场和禁止出场，强制出场优先，但应保留可诊断理由。
- 高优先候选和戏剧候选冲突时，高优先候选保留。
- 随机主动事件与任意正式候选层冲突时，随机事件移除。

### 5. 随机事件跨轮清理

随机主动事件保持场外背景。最终解析时需要跨轮清理：

```text
如果角色最终属于 forced/priority/drama/forbidden 任一层，则移除其 randomActiveEvents。
```

无明确自然闯入条件时，`randomIntrusionCondition` 保持：

```text
无明确条件则禁止闯入
```

## Prompt 调整

### Stage1

新增上一轮规划摘要变量：

```text
上一轮查询规划摘要：
{{上一轮查询规划摘要}}
```

规则补充：

```text
本轮必须基于上一轮结果继续收敛。若候选层发生变化，以本轮字段为当前判断；不要无理由重置候选层。玩家/当前被控主体由系统最终兜底为强制出场；强制出场允许多人。
```

### Stage2

将“上游候选”语义明确为“最终有效候选层”：

```text
强制出场、高优先候选、戏剧候选、禁止出场必须来自最终有效候选层；不要从历史 trace 中恢复已经被后轮清除的候选。
```

## 数据流

```text
Stage1 多轮输出
  ↓
trace 保存历史
  ↓
resolveEffectiveSceneLayers(trace, store, config)
  ↓
补入玩家/被控主体 forcedParticipants
  ↓
清理层级冲突与随机事件
  ↓
Stage2 场景锚定
  ↓
Stage3 正文
  ↓
Stage4 结算
```

## 代码组件

### real-world-agent-loop.js

1. `buildConfiguredPrompt()` 接收 `guidance` 或 `trace`，向 Stage1 注入上一轮查询规划摘要。
2. `generateConfiguredFinal()` 在进入 Stage2 前调用 `resolveEffectiveSceneLayers()`。
3. `buildConfiguredSceneAnchorPrompt()`、`sceneLayerSummary()`、`stageParticipants()` 使用最终有效候选层，不再直接 union 全部 trace。

### real-world-agent-context.js / story-agent-context.js

1. 新增或复用候选名称标准化工具。
2. `sceneParticipantBoundary()` 支持接收最终有效候选层。
3. 玩家/被控主体强制出场兜底逻辑放在解析器或 context helper 中，避免依赖模型输出。

### prompts

1. `stage1-guided-query.md` 增加上一轮规划摘要和强制出场允许多人说明。
2. `stage2-scene-anchor.md` 明确只消费最终有效候选层。

## 错误处理

1. 如果 Stage1 没有输出某层，解析器使用空数组兜底。
2. 如果候选项缺少 id，只用姓名标准化去重。
3. 如果玩家主体信息缺失，仍补入 `player-self`，显示名使用“玩家本人”。
4. 如果最终有效候选层为空，至少保留玩家/被控主体作为强制出场。

## 测试计划

1. Stage1 第 2 轮 prompt 包含第 1 轮规划摘要。
2. Stage1 第 3 轮 prompt 包含第 2 轮规划摘要。
3. 后一轮 `戏剧候选：无` 能清除前一轮戏剧候选。
4. Stage2 participant boundary 使用最终有效候选层，而不是 trace union。
5. 玩家本人自动进入 `forcedParticipants`。
6. `forcedParticipants` 支持多人。
7. 玩家/被控主体不会被 `forbiddenParticipants` 移除。
8. 随机主动事件与 forced/priority/drama/forbidden 冲突时被清理。
9. 加载角色卡不会自动成为出场或结算对象。
10. Stage4 结算对象仍受正文实际进入/互动/受影响约束。

## 验收标准

1. 复现日志中的三轮候选漂移时，Stage2 不再得到历史并集。
2. Stage2 prompt 中强制出场至少包含玩家/被控主体。
3. 同一人物不会同时作为随机事件和正式候选出现。
4. 现有 guided scene anchoring 流程保持可运行。
5. 新增测试覆盖候选收敛、玩家强制出场和随机事件清理。
