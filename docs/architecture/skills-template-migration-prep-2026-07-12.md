# Skills Template Migration Prep (2026-07-12)

## 目的

把 `skills` 模块作为第一份“模板迁移准备样板”拆清楚，用来说明：

- 当前模板依赖什么
- 如果未来不再让模板直接走 `$store.game.skill...`，应该怎么分批迁
- Web 与 Android 镜像需要怎样同步

这份文档不是立即执行迁移，而是为后续真正进入 compat 删除阶段准备路线图。

## 当前状态

### 1. 当前公开面

当前 `skills` 模板主要通过以下 `$store.game` 入口工作：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`
- `openSkillDetail(id)`
- `closeSkillDetail()`

其中：

- `skillCategories()` / `skillsList()` / `selectedSkill()` 已在 `publish/game.js` 中收口为桥接到 `gm.skillsActions`
- `openSkillDetail(id)` / `closeSkillDetail()` 当前仍是动作层公开面的一部分

### 2. 模板消费位置

当前 Web 与 Android 镜像都在同一段 skills 模板区域直接消费这些入口：

- `publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`

集中区域包括：

1. 分类筛选下拉
2. skills 列表渲染
3. 详情弹层显隐
4. 当前选中项详情展示
5. 打开/关闭详情动作

## 为什么 skills 适合作为第一份迁移样板

1. 入口数量少
2. 以只读展示和轻交互为主
3. 模板区块集中
4. 没有像 `boss`、`taobao` 那样深度耦合到复杂生成/购买/申请链
5. Web 与 Android 镜像结构基本对齐，便于同步验证

## 未来迁移的两个可选方向

### 方向 A：长期保留 `$store.game.skills...` 作为稳定模板 contract

做法：

1. 继续保留 `skillCategories()` / `skillsList()` / `selectedSkill()` 在 `$store.game`
2. 把 `game.js` 上这组入口长期维持为极薄桥接层
3. 模板不迁，动作与只读逻辑继续模块内聚

优点：
- 改动最小
- Web / Android 同步成本低
- 风险最低

缺点：
- `game.js` 公开面不会明显缩小
- 只能做到“实现下沉”，做不到“模板面去历史化”

### 方向 B：模板改为使用新的 skills 模块公开面

做法：

1. 先定义一组新的稳定公开面
2. Web 模板先迁移到新公开面
3. Android 镜像模板同步迁移
4. 迁移完成后，再评估删除 `game.js` 上的 compat 入口

优点：
- 能真正缩小 `game.js` 公开面
- 更有利于后续按模块隔离模板 contract

缺点：
- 模板改动范围更大
- 镜像同步要求更高
- 删除前验证成本更高

## 如果采用方向 B，推荐的分批顺序

### 第 1 批：只读查询面

优先迁移：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`

原因：
- 它们已经是纯桥接
- 不直接触发状态写入
- 是最适合先迁的模板读取面

### 第 2 批：详情弹层动作面

再迁移：

- `openSkillDetail(id)`
- `closeSkillDetail()`

原因：
- 它们会直接影响 `skillsState.detailOpen` / `selectedSkillId`
- 虽然风险仍低，但比纯读取面更接近状态动作

### 第 3 批：模板细节整理

最后处理：

- 是否进一步缩小 `$store.game.skillsState` 的模板直接暴露范围
- 是否把某些模板状态依赖整理成更稳定的显示 contract

## 迁移前必须确认的事项

1. 新的 skills 模块公开面叫什么
2. Web 模板与 Android 镜像模板是否能同步落地
3. `selectedSkill()` 是否仍需要保留在 `$store.game` 上做过渡期兼容
4. `openSkillDetail` / `closeSkillDetail` 是否也要经过过渡期 facade
5. 是否需要最小回归验证：
   - 分类筛选正常
   - 列表渲染正常
   - 点击技能能打开详情
   - 关闭详情后状态恢复正常

## 当前最推荐策略

当前阶段最推荐：

1. 先不急着真的改 skills 模板
2. 先把它作为“低风险模板迁移样板”文档化
3. 若后续要做第一批真实模板迁移，优先从 skills 的只读查询面开始

## 当前阶段结论

`skills` 是最适合做第一批模板迁移准备样板的模块，但当前仍不建议直接删除 `game.js` 上的 compat 入口。

更合适的顺序应是：

1. 先确认迁移模式
2. 先定义新公开面
3. 先做 Web / Android 同步迁移准备
4. 最后才进入 compat 删除审计