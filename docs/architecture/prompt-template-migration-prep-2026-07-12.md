# Prompt Template Migration Prep (2026-07-12)

## 目的

把 `prompt` 模块作为第二份“模板迁移准备样板”拆清楚，用来补足 `skills` 样板之外的另一类集中展示模块场景。

这份文档重点回答：

- 当前 prompt 模板依赖哪些 `$store.game` 公开面
- 如果未来要减少 `game.js` compat 公开面，模板应如何分批迁
- 哪些入口属于只读展示面，哪些入口属于轻交互动作面
- Web 与 Android 镜像如何同步处理

## 当前状态

### 1. 当前公开面

当前 prompt 模板主要通过以下 `$store.game` 入口工作：

- `promptCategoryLabel()`
- `promptCategories()`
- `promptList()`
- `currentPromptItem()`
- `togglePromptDetail(id)`
- `closePromptDetail()`
- `selectPromptCategory(category)`

其中：

- `promptCategoryLabel()` / `promptCategories()` / `promptList()` / `currentPromptItem()` 已在 `publish/game.js` 中收口为桥接到 `gm.promptActions`
- `togglePromptDetail(id)` / `closePromptDetail()` / `selectPromptCategory(category)` 当前仍是动作层公开面的一部分

### 2. 模板消费位置

当前 Web 与 Android 镜像都在同一段 prompt 模板区域直接消费这些入口：

- `publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`

集中区域包括：

1. 分类筛选按钮与菜单
2. prompt 列表渲染
3. 点击条目打开详情
4. 详情弹层显隐
5. 当前选中 prompt 的标题与正文展示
6. 关闭详情动作

## 为什么 prompt 适合作为第二份迁移样板

1. 与 `skills` 一样，模板消费区块集中
2. 同时包含只读展示面与轻交互动作面
3. Web / Android 镜像结构对齐度高
4. 没有像 `boss`、`taobao` 那样深度耦合到复杂业务动作链
5. 可以帮助区分“只读查询迁移”和“轻交互弹层迁移”两种节奏

## 未来迁移的两个可选方向

### 方向 A：长期保留 `$store.game.prompt...` 作为稳定模板 contract

做法：

1. 保留 `promptCategoryLabel()` / `promptCategories()` / `promptList()` / `currentPromptItem()` 在 `$store.game`
2. 保留 `togglePromptDetail()` / `closePromptDetail()` / `selectPromptCategory()` 作为稳定动作层公开面
3. 继续让 `game.js` 仅承担极薄 compat facade 职责

优点：
- 迁移成本最低
- Web / Android 同步成本最低
- 对当前运行链影响最小

缺点：
- `game.js` 模板公开面仍较大
- 只能做到实现下沉，不能真正收缩模板公开 contract

### 方向 B：模板迁移到新的 prompt 模块公开面

做法：

1. 先定义新的 prompt 稳定公开面
2. Web 模板先迁移
3. Android 镜像模板同步迁移
4. 确认没有残余调用后，再评估删除 compat 入口

优点：
- 有利于真正缩小 `game.js` 的模板公开面
- 更接近按模块隔离公开 contract 的目标

缺点：
- 模板改动面更大
- 动作与状态交互验证成本更高

## 如果采用方向 B，推荐的分批顺序

### 第 1 批：只读展示面

优先迁移：

- `promptCategoryLabel()`
- `promptCategories()`
- `promptList()`
- `currentPromptItem()`

原因：
- 这批入口已经是纯桥接或只读派生
- 不直接承担状态写入动作
- 适合先做模板读取面迁移

### 第 2 批：轻交互动作面

再迁移：

- `selectPromptCategory(category)`
- `togglePromptDetail(id)`
- `closePromptDetail()`

原因：
- 它们会直接影响 `promptState.category`、`selectedId`、`selectedText`、`error` 等状态
- 虽然风险仍低，但比只读展示面更接近状态动作层

### 第 3 批：模板状态细节整理

最后处理：

- 是否继续让模板直接读取 `promptState.query`
- 是否继续让模板直接依据 `promptState.selectedId` 控制弹层显示
- 是否需要把弹层显隐整理为更稳定的显示 contract

## 迁移前必须确认的事项

1. 新的 prompt 模块公开面叫什么
2. Web 与 Android 镜像模板能否同步修改
3. `promptState` 中哪些字段仍允许模板直接读
4. `togglePromptDetail` / `closePromptDetail` 是否需要保留过渡期 facade
5. 是否需要最小回归验证：
   - 分类切换正常
   - 列表过滤正常
   - 点击条目能打开详情
   - 详情正文加载与关闭正常

## 与 skills 样板的差异

`skills` 更偏“只读列表 + 详情查看”。

`prompt` 除了只读展示外，还更明显地依赖：

- 列表筛选状态
- 详情内容加载
- 弹层开关状态

因此它更适合用来补齐“轻交互模板迁移准备”这一类样板。

## 当前最推荐策略

当前阶段最推荐：

1. 先不立即改 prompt 模板
2. 先把它作为第二份迁移准备样板沉淀
3. 若未来要做真实模板迁移，优先从只读展示面开始，再迁轻交互动作面

## 当前阶段结论

`prompt` 很适合作为 `skills` 之后的第二份模板迁移准备样板，但当前仍不建议直接删除 `game.js` 上的 compat 入口。

更稳妥的顺序仍应是：

1. 先确认迁移模式
2. 先定义新的 prompt 模块公开面
3. 先做 Web / Android 同步迁移准备
4. 最后才进入 compat 删除审计