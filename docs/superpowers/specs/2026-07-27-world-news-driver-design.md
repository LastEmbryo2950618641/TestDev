# 世界新闻驱动系统设计

## 背景

当前项目已经有“日常驱动与事件系统”，但它主要处理两类事情：

- `Social Inbox`：熟人或关系角色因自身事务主动联系玩家。
- `Event System`：随机事件、大地图事件、周期事件，供现实推演 Stage2/Stage3 注入。

缺口是“整个世界自己在变化”：新闻、热榜、城市动态、平台舆论、组织变化、商圈活动、灾害天气、行业趋势等。它们不应全部直接变成事件，也不应提前绑定某个角色。新闻系统应先描述世界，再由 AI 根据当前角色卡、场景、职业、喜好和上下文决定是否自然反应。

## 目标

1. 桌面新增“新闻”APP，展示固定频道与频道内热度排名。
2. 新闻频道固定，标签开放生成，避免 AI 被提示词示例锁死。
3. 地图/世界变化必须归入固定新闻频道之一，禁止输出“其他/未知/杂项”。
4. 新闻不在数据层关联角色，角色反应交给 Stage2/Stage3 AI 结合已加载资料自然判断。
5. 正文后增加新闻结算阶段，由 AI 输出结构化 ops 调整热榜、替换新闻、过期新闻、升格事件。
6. 三端同步以 `publish/` 为唯一共享运行时源，桌面与移动端只同步/打包运行时资源，不复制业务逻辑。

## 非目标

- v1 不接真实新闻 API。
- v1 不做角色关键词匹配和“相关角色”字段。
- v1 不让新闻直接修改角色卡、势力卡或物品状态。
- v1 不把每条新闻都转成任务或事件，只升格少量高价值新闻。

## 固定新闻频道

频道是 UI 和数据约束的固定入口。AI 生成的地图事情、世界事情、热榜事项必须选择一个主频道。

| channelId | 名称 | 覆盖范围 |
| --- | --- | --- |
| `gov-region` | 政务地区 | 政策、城市治理、公共事务、国际关系、行政区变化 |
| `society-law` | 社会法治 | 治安、案件、纠纷、监管、公共安全、舆论事件 |
| `finance-business` | 财经商业 | 股市、房价、消费、就业、公司、行业、融资、裁员 |
| `tech-science` | 科技科学 | AI、互联网、硬件、芯片、科研、航天、数据安全 |
| `health-medical` | 健康医疗 | 疾病、医院、药品、心理健康、食品安全、公共卫生 |
| `environment-weather` | 环境天气 | 暴雨、台风、地震、污染、停电、极端天气 |
| `culture-entertainment` | 文娱影视 | 明星、影视剧、综艺、演唱会、票房、粉圈 |
| `sports-events` | 体育赛事 | 职业联赛、电竞赛事、校赛、城市赛事、健身潮流 |
| `bilibili-community` | B站社区 | UP 主、直播、二创、弹幕梗、平台规则、社区争议 |
| `games-anime` | 游戏二次元 | 游戏、番剧、漫画、虚拟偶像、漫展、玩家社区 |
| `education-campus` | 教育校园 | 考试、学校、社团、竞赛、招生、校内生活 |
| `career-jobs` | 职场招聘 | 岗位、面试、劳动关系、办公室变化、职业机会 |
| `local-life` | 本地生活 | 商超开业、交通、租房、餐饮、服装店、社区服务 |
| `military-security` | 军事安全 | 战争、军警、安全组织、边境、武装冲突 |
| `faction-organization` | 势力组织 | 公司、学校、社团、家族、帮派、教会、异能组织、政体变动 |

规则：

- `channelId` 必须来自固定列表。
- `tags` 必须开放生成，不能从固定枚举里选。
- 跨频道新闻使用 `primaryChannelId` + `secondaryChannelIds`，主频道必须唯一。
- 特殊内容必须强制归类，不允许“其他”。

## 新闻数据结构

```js
{
  id: 'news-...',
  channelId: 'local-life',
  title: '锦苑小区旁新开一家夜间折扣超市',
  summary: '附近居民开始讨论晚间折扣和开业活动，可能影响本地购物路线。',
  tags: ['夜间折扣', '社区消费', '新店开业'],
  scope: 'global|national|city|local|org|community',
  secondaryChannelIds: [],
  location: '锦苑小区附近',
  orgName: '夜间折扣超市',
  heat: 68,
  rank: 2,
  trend: 'new|up|down|stable',
  taskPotential: 'none|soft|strong',
  behaviorHooks: ['出门逛店', '购物', '分享话题'],
  source: 'system|ai|manual',
  sourceLogId: '',
  startsAt: '2026-07-27T10:00:00.000Z',
  expiresAt: '2026-07-29T10:00:00.000Z',
  status: 'active|expired',
  createdAt: '2026-07-27T10:00:00.000Z',
  updatedAt: '2026-07-27T10:00:00.000Z'
}
```

字段约束：

- `title`、`summary`、`tags`、`scope` 是 AI 替换新闻时的必填字段。
- `id`、`rank`、`createdAt`、`updatedAt` 由系统生成或重算，不信任 AI。
- `heat` 系统裁剪到 `0-100`。
- `taskPotential` 不等于自动建任务，只表示可被 Stage2/Stage3 自然利用。
- 不包含 `relatedCharacters`、`matchedCharacters` 等角色绑定字段。

## 状态设计

在 `publish/game.js` 默认 store 中新增：

```js
newsDriverState: {
  open: false,
  enabled: true,
  channelId: 'all',
  filter: 'all',
  selectedId: '',
  lastTickAt: '',
  lastAiSettlementAt: '',
  message: '',
  channels: [],
  items: [],
  promotedEventIds: [],
  recentOps: []
}
```

状态说明：

- `items` 保存全部新闻，按频道和热度派生排名。
- `channels` 可由系统默认频道生成，不要求存档必须完整持有。
- `promotedEventIds` 记录已升格事件，避免重复建大地图事件。
- `recentOps` 仅保留最近 30 条，便于调试 AI 调整新闻榜的原因。

## 新增文件

核心运行时全部放在 `publish/`，保证三端复用。

- `publish/news-driver-system.js`
  - 频道常量。
  - 新闻标准化。
  - 热度衰减。
  - 排名重算。
  - AI ops 校验与应用。
  - 新闻 prompt 格式化。
- `publish/news-driver-actions.js`
  - `initNewsDriver()`
  - `openNewsApp()`
  - `closeNewsApp()`
  - `setNewsChannel(channelId)`
  - `setNewsFilter(filter)`
  - `selectNewsItem(id)`
  - `tickWorldNewsDriver(elapsedSeconds, meta)`
  - `newsNarrationPromptContext(action)`
  - `promoteNewsToEvent(news, reason)`
- `publish/news-driver.css`
  - 新闻 APP 高密度 UI。
- `publish/inference/news-driver-stage-update.js`
  - 正文后新闻榜 AI 结算。
- `publish/prompts/推演引擎/stage11-world-news-update.md`
  - 新闻结算 prompt 源文件。
- `publish/prompts/推演引擎/stage11-world-news-update.js`
  - prompt 注册产物。

需要同步加入：

- `publish/boot/scripts.json`
- `publish/boot/script-manifest.js`

## 现有代码接线

### `game.js`

- 在默认状态中加入 `newsDriverState`。
- 在 modules 数组中加入 `gm.newsDriverActions`。
- fallback 方法中补最小新闻 APP 方法，避免脚本分块未加载时 UI 报错。

### `app-switch-actions.js`

`closeDesktopApps()` 增加：

```js
if (this.newsDriverState) this.newsDriverState.open = false;
```

### `restore-state-helpers.js`

`normalizeAppPanelState()` 或 `normalizeRealWorldState()` 恢复：

```js
store.newsDriverState = save.newsDriverState
  ? { ...store.newsDriverState, ...save.newsDriverState, open: false, message: '' }
  : store.newsDriverState;
```

### `index.html`

- 桌面新增“新闻”APP 图标。
- 新增新闻 APP section。
- 其他 APP 的 `x-show` 排除条件补 `!$store.game.newsDriverState?.open`。

UI 布局：

- 左侧：频道列表与数量。
- 中间：当前频道热度排名。
- 右侧：新闻详情。
- 顶部筛选：`全部`、`本地`、`组织`、`高热`、`可触发任务`。

### `real-world-agent-loop.js`

在 Stage2 场景锚定与 Stage3 正文生成注入新闻上下文：

- `buildConfiguredSceneAnchorPrompt()` 中附加 `store.newsNarrationPromptContext?.(actionText)`。
- `buildConfiguredNarrationPrompt()` 中附加 `store.newsNarrationPromptContext?.(actionText)`。

注入原则：

- 只注入 Top 新闻与当前地点/本地/高热/强任务潜力新闻。
- 不告诉 AI 哪个角色匹配哪条新闻。
- 要求 AI 根据角色卡自然语言资料判断是否关注新闻。

### `real-world-actions.js`

时间推进后调用新闻 tick：

```js
const newsTick = this.tickWorldNewsDriver?.(elapsedSeconds, { logId: id, startedAt, endedAt: this.phoneDate().toISOString() }) || null;
if (newsTick?.created || newsTick?.updated) settlement.push(`新闻：热榜已更新${newsTick.updated || 0}条，新增${newsTick.created || 0}条。`);
```

位置建议在 `advancePhoneTime(elapsedSeconds)` 后，`settleSocialInbox()` 前后均可。v1 推荐放在 `advancePhoneTime` 后、Social Inbox 前，方便后续将强本地新闻转为下一轮可见上下文。

### `event-actions.js`

无需改核心结构。新闻升格事件时复用 `upsertEvent()`：

```js
this.upsertEvent({
  id: `news-event:${news.id}`,
  type: 'inference',
  title: news.title,
  content: news.summary,
  location: news.location,
  tags: [...news.tags, '新闻驱动'],
  source: 'news-driver',
  sourceLogId: meta.logId || ''
});
```

## AI Prompt 设计

### Stage2/Stage3 新闻上下文

提示词核心规则：

- 新闻榜是世界背景，不是强制剧情。
- 角色可以无视新闻。
- 只有符合角色自然语言资料、当前场景、职业/学业/喜好/状态时，才可自然反应。
- 反应可以是刷手机、分享话题、吐槽、下载游戏、追番、查路线、去店里、避开交通等。
- 不得因为新闻存在就让所有角色统一讨论。
- 不得把新闻直接写成已发生的角色状态变化，除非正文中实际发生。

### 正文后新闻结算

新增结算阶段读取：

- 当前新闻榜。
- 本轮正文。
- 场景锚定结果。
- 当前时间与地点。
- 已知势力/地图摘要。

输出固定 JSON：

```json
{
  "ops": [
    {
      "op": "bump",
      "id": "news-1",
      "deltaHeat": 12,
      "reason": "正文中角色主动关注该话题"
    },
    {
      "op": "replace",
      "targetId": "news-old-3",
      "channelId": "local-life",
      "item": {
        "title": "锦苑小区旁新开一家夜间折扣超市",
        "summary": "附近居民开始讨论晚间折扣和开业活动，可能影响本地购物路线。",
        "tags": ["夜间折扣", "社区消费", "新店开业"],
        "scope": "local",
        "location": "锦苑小区附近",
        "orgName": "夜间折扣超市",
        "heat": 68,
        "trend": "new",
        "taskPotential": "soft",
        "behaviorHooks": ["出门逛店", "购物", "分享话题"]
      },
      "reason": "时间推进后，本地生活频道需要新上榜话题"
    },
    {
      "op": "expire",
      "id": "news-7",
      "reason": "新闻已过时"
    },
    {
      "op": "promoteToEvent",
      "id": "news-3",
      "reason": "本地开业可驱动外出任务"
    }
  ],
  "done": true
}
```

AI 约束：

- `replace` 必须带 `item`。
- `item.title`、`item.summary`、`item.tags`、`item.scope` 缺失则丢弃该 op。
- `item.channelId` 可省略，由系统继承 `replace.channelId`。
- `item.tags` 必须自由生成 2-5 个，不得使用固定示例清单。
- AI 不得输出最终排名，系统按热度重算。
- 每轮最多替换 3 条、升格事件 2 条、过期 5 条。

## 三端同步与架构

项目结构以 `publish/` 为核心共享运行时：

- Web：直接打开或由本地 dev server 加载 `publish/index.html`。
- Windows 桌面：Electron 外壳打包/加载 `publish/`。
- Android 移动端：通过 `npm run android:sync-assets` 同步 `publish/` 到 WebView assets。

实现原则：

1. 业务逻辑只写在 `publish/`，不在 `desktop/` 或 `mobile/` 分叉实现。
2. 新增 JS/CSS 必须登记到 boot scripts 与 manifest，确保三端启动顺序一致。
3. 新增资源不得依赖 Node/Electron/Android 原生 API。
4. 存档字段 `newsDriverState` 必须是纯 JSON，可被 Web、Electron、Android 同样读写。
5. 触控端 UI 使用按钮和滚动列表，不依赖 hover。
6. 验证时至少跑：
   - `npm run verify:runtime-coverage`
   - `npm run verify:runtime-deps`
   - `npm run verify:assets`
   - `npm run android:sync-assets -- --check`
   - 如改桌面打包资源，再跑 `npm run verify:desktop`

## 限流与噪音控制

- 每轮 tick 最多新增 6 条新闻。
- 每个频道最多保留 20 条 active 新闻。
- 每轮 AI 结算最多替换 3 条。
- 每轮最多升格 2 条大地图事件。
- `taskPotential: strong` 只表示可成为任务，不表示强制玩家行动。
- 新闻过期后保留短期历史，UI 默认隐藏。

## 测试与验证

建议新增或覆盖以下验证：

- 新闻标准化：非法频道回退或丢弃，禁止其他频道。
- `replace` op：缺 item 或缺必填字段时丢弃。
- 排名重算：AI 不可直接控制 rank。
- 热度衰减：过期新闻不会进入 prompt。
- 事件升格：`promoteToEvent` 创建 `type: inference`，且同一新闻不重复创建。
- 存档恢复：恢复后 `newsDriverState.open === false`，新闻列表保留。
- 三端资源：新增脚本/CSS 被 manifest 与 Android assets 检查覆盖。

## 实施顺序

1. 添加 `news-driver-system.js` 与单元级逻辑验证。
2. 添加 `news-driver-actions.js` 并接入 `game.js`。
3. 加入 boot scripts / manifest / CSS。
4. 添加新闻 APP UI 与桌面图标。
5. 接入 Stage2/Stage3 新闻上下文。
6. 添加正文后新闻结算阶段与 prompt。
7. 接入时间推进 tick 与事件升格。
8. 跑 runtime、assets、Android 同步检查。

## 自检结论

- 无未定字段：频道、状态、文件、接线点和 AI ops 已明确。
- 无架构冲突：新闻系统作为事件系统上游，不替代 Social Inbox 或 Event System。
- 无角色硬匹配：新闻数据层不绑定角色，符合当前角色卡自然语言复杂度。
- 三端同步明确：只改共享 `publish/` 运行时，并通过现有脚本同步到桌面/移动端。
