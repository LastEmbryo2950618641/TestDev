# 角色记忆系统设计

## 目标

角色记忆分为短期记忆、长期记忆、不可忘记记忆、归档与遗忘区。提示词只加载有 token 限额的当前记忆与检索命中的归档结果；归档本身不限制总条数，不会全部进入提示词。

## 记忆条目格式

```js
{
  id: 'mem_xxx',
  time: {
    label: '1994年10月3日 21:14:00',
    value: { year: 1994, month: 10, day: 3, hour: 21, minute: 14, second: 0 }
  },
  place: '当前地点',
  text: '详细记忆，站在角色角度记录刚说过、做过、感受到的事情。',
  summary: '信息梗概，可失真但保留大意。',
  tokens: 42,
  impression: 0,
  source: 'turn/manual/summary/archive',
  sourceIds: [],
  linkedLongTermId: '',
  createdAt: 'ISO 时间'
}
```

- `id` 用于避免短期和长期重复保存后无法追踪。
- `time` 使用游戏内时间，即玩家开始控制角色时设定的年月日时分秒，并随游戏时间推进而变化，不使用回合数。
- `place` 使用当前场景或地点。
- `impression` 为 0-100，表示印象程度。

## 印象程度

| 范围 | 含义 |
| --- | --- |
| 0-19 | 几乎没有痕迹，容易遗忘 |
| 20-39 | 普通印象，短期可记住 |
| 40-59 | 有一定情绪或信息价值 |
| 60-79 | 深刻记忆，进入长期记忆候选 |
| 80-100 | 难以忘怀，进入不可忘记候选 |

进入长期记忆的核心规则：

```text
impression >= vividThreshold 时进入长期记忆的难以忘记区。
impression >= permanentThreshold 时成为不可忘记区候选。
```

## 分区结构

```js
memory = {
  characterId,
  version: 2,
  shortTerm: {
    recent: [],
    summaryBuffer: [],
    summarized: [],
    forgotten: []
  },
  longTerm: {
    vivid: [],
    permanent: []
  },
  archive: {
    indexCount: 0,
    itemCount: 0
  },
  updatedAt
}
```

## Token 限额

建议初始配置：

```js
limits = {
  recent: 1200,
  summaryBuffer: 1600,
  summarized: 900,
  forgotten: 500,
  vivid: 1200,
  permanent: 800,
  archiveHits: 5,
  vividThreshold: 60,
  permanentThreshold: 88,
  summaryTargetChars: 180
}
```

每个直接进入提示词的区域都需要显示：

```text
当前条数 / 当前 token / 可用总 token
```

归档显示：

```text
当前索引数 / 当前条数
```

## 短期记忆流程

1. 每次角色经历新事件，生成一条 `detailedMemory`。
2. 写入 `shortTerm.recent`。
3. `recent` 超过 token 限额时，FIFO 移出最老记忆到 `summaryBuffer`。
4. `summaryBuffer` 超过 token 限额时，压缩为一条 `summaryMemory`。
5. 压缩结果：
   - `time + place + summary` 作为索引。
   - 详细内容作为归档正文。
   - 存入 `memory_archive`。
   - `summaryMemory` 写入 `shortTerm.summarized`。
6. `summarized` 超过 token 限额时，FIFO 移入 `forgotten`。
7. `forgotten` 超过 token 限额时，FIFO 删除最老记忆，完成自然遗忘。

## 长期记忆流程

### 难以忘记区 `longTerm.vivid`

- 新记忆 `impression >= vividThreshold` 时进入。
- 该区也会遗忘。
- 超过 token 限额时，不按 FIFO，而是优先遗忘：
  1. 印象程度低的。
  2. 更旧的。

### 不可忘记区 `longTerm.permanent`

- `impression >= permanentThreshold` 时成为候选。
- 不自然遗忘。
- 满了以后由角色按自身情况与上下文决定替换哪条。
- 本地 fallback：若新记忆印象高于区内最低印象记忆，则替换最低印象且较旧的条目，否则拒绝写入。

## 归档

归档没有条数限制，也不会整体进入提示词。它只通过检索命中进入提示词。

归档条目：

```js
{
  id,
  text: '详细记忆正文',
  vector,
  meta: {
    time: '1994年10月3日 21:14:00',
    place: '间桐宅地下虫仓',
    summary: '信息梗概',
    impression: 72,
    sourceIds: ['mem_a', 'mem_b']
  },
  createdAt
}
```

## Prompt 格式

```text
人物记忆状态：
刚发生记忆：当前 5 条 / 842 token / 可用 1200 token
近发生记忆：当前 3 条 / 511 token / 可用 900 token
难以忘记的记忆：当前 4 条 / 760 token / 可用 1200 token
不可忘记的记忆：当前 2 条 / 430 token / 可用 800 token
遗忘区：当前 2 条 / 210 token / 可用 500 token
记忆归档：当前索引 18 / 当前条目 18，本次命中 3

刚发生记忆：
- 1994年10月3日 21:14:00｜地下虫仓｜印象72｜你控制她避开虫群，她记得自己害怕却没有立刻受伤。

近发生记忆：
- 1994年10月3日 21:00:00-21:12:00｜间桐宅｜印象64｜她多次被你接管身体，仍害怕你，但发现你并非每次都让她受伤。

难以忘记的记忆：
- 1994年10月3日 21:10:00｜地下虫仓｜印象91｜她第一次清楚意识到身体被你夺走，恐惧和屈辱很深。

不可忘记的记忆：
- 1994年10月3日 21:11:00｜地下虫仓｜印象96｜她决定绝不能忘记你曾让她避开虫群。

记忆归档检索结果：
- 1994年10月3日 21:00:00-21:12:00｜间桐宅｜印象64｜她曾经把你的控制误认为新的折磨。
```
