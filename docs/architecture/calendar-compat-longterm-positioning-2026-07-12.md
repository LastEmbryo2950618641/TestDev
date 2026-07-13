# Calendar Compat Longterm Positioning (2026-07-12)

## 目的

在 `calendar` 已经拥有 bridge inventory、模板迁移准备、模板消费审计、外部调用面审计、gate 预审与最小验证方案之后，进一步回答一个更核心的问题：

- `calendar` 当前这些 compat 入口，长期来看更应该走向“删除”，还是“保留为稳定 facade”

这份文档的目标不是立即下最终判决，而是给出当前阶段最合理的长期定位判断。

## 当前候选入口

当前与 calendar 长期定位密切相关的入口包括：

- `calendarPanelView()`
- `changeCalendarMonth(delta)`
- `calendarMonthTitle()`
- `calendarDays()`
- `eventsForCalendarDay(day)`
- `formatCalendarTime(value)`

## 当前观察到的三个事实

### 1. 模板主显示面已经相对收敛

当前 Web 与 Android 镜像模板中，calendar 主显示面主要围绕：

- `calendarPanelView()`
- `changeCalendarMonth(delta)`

这说明：

- `calendar` 已经不像许多旧模块那样，把大量展示读取面直接散落在模板里
- 它已经接近一个相对稳定的“小模块公开面”

### 2. 仍存在模板外公开能力

除了模板主显示面，calendar 还存在：

- `formatCalendarTime()` 的跨模块运行时使用
- `calendarDays()` / `eventsForCalendarDay()` / `formatCalendarTime()` 在能力说明层的对外可见性

这说明：

- `calendar` 不只是模板私有模块
- 它已经兼具“显示 contract”与“公开工具能力”的双重角色

### 3. `game.js` 上的薄桥接已经足够稳定

当前 `calendarMonthTitle()` / `calendarDays()` 在 `publish/game.js` 上已经是很薄的桥接层。

这意味着：

- 它们不再是厚逻辑堆积点
- 继续保留这些薄 facade 的结构成本并不高

## 两种长期定位路线

### 路线 A：将 calendar 认定为“稳定 facade 模块”

核心观点：

- 不是所有 compat 入口都必须最终删除
- 某些模块在收口后，本来就可以长期保留一层稳定公开面

若采用这一路线，则：

1. `calendarPanelView()` / `changeCalendarMonth(delta)` 长期保留为模板公开面
2. `calendarDays()` / `eventsForCalendarDay()` / `formatCalendarTime()` 作为对外可见能力继续存在
3. `publish/game.js` 上与 calendar 相关的极薄 bridge/facade 不再被视为待删除残留，而被视为稳定 contract 层的一部分

优点：

- 风险最低
- 与当前 Web / Android 双端消费结构最一致
- 更符合 calendar 已经趋于成熟收口形态的现状

缺点：

- `game.js` 不会在这一组上继续明显缩小
- 对“极致压缩旧公开面”的收益有限

### 路线 B：只让部分入口进入删除候选

核心观点：

- calendar 不必整组保留，也不必整组删除
- 可以把长期公开面与纯过渡 compat 入口拆开看

若采用这一路线，则：

1. `calendarPanelView()` / `changeCalendarMonth(delta)` 可能继续长期保留
2. `calendarMonthTitle()` / `calendarDays()` 若不再具备独立外部价值，可后续再评估是否进入删除候选
3. `eventsForCalendarDay()` / `formatCalendarTime()` 要先看跨模块能力角色是否长期保留

优点：

- 有机会进一步压缩 `game.js` 上的局部公开面
- 不会误伤当前已经稳定的模板 contract

缺点：

- 需要更细粒度地区分“长期公开面”和“过渡壳”
- 评估与验证成本更高

## 当前阶段最合理的判断

基于当前证据，`calendar` 更接近路线 A，而不是立即进入路线 B。

原因：

1. 它的模板主显示面已经较成熟
2. 它存在跨模块与能力说明层的公开角色
3. 当前的薄 facade 已不再构成明显的结构负担
4. 继续强行追求删除，收益可能低于成本

也就是说：

- `calendar` 当前更像“高成熟度稳定 facade 候选”
- 而不太像“应该尽快继续压缩到删除 compat”的对象

## 当前推荐结论

当前最推荐的长期定位是：

1. 先把 `calendar` 视为“稳定 facade 候选模块”
2. 暂不以“删除 calendar compat”为优先目标
3. 若未来真要继续压缩，只建议做局部评估，而不是整组删除

## 对整体排序的影响

这会带来一个很重要的策略变化：

- `calendar` 依然是最成熟的模块之一
- 但它的成熟，未必意味着它最该先删 compat
- 相反，它更可能成为“哪些 facade 其实应该长期保留”的样板

这意味着：

- 首批真正尝试 compat 删除的模块，未必就是最成熟的 `calendar`
- 也可能应该转向那些“仍有明显过渡性、但风险仍低”的模块做局部试点

## 当前阶段结论

在当前证据下，`calendar` 的最佳长期定位更像：

- 稳定 facade 样板模块

而不是：

- 第一批必须继续压缩并删除 compat 的模块

这份判断并不排除未来对个别入口继续做局部删除评估，但它明确说明：

- 继续把 `calendar` 当作“首个一定要删 compat 的对象”并不一定是最优路线
- 更合理的做法是先承认：某些 facade 在结构上已经达到了“值得长期保留”的成熟状态