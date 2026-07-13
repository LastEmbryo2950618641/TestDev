# Calendar Compat Gate Minimal Validation (2026-07-12)

## 目的

为 `calendar` 模块未来若进入真实 compat 删除 gate 评估时，准备一份最小验证方案。

这份方案当前不代表立即执行删除，只用于提前定义：

- 如果未来调整或删除部分 calendar compat 入口
- 最少需要验证哪些行为仍保持不变
- Web / Android / 跨模块哪几类行为必须一起看

## 验证范围

围绕以下能力进行最小验证：

- `calendarPanelView()`
- `changeCalendarMonth(delta)`
- `calendarMonthTitle()`
- `calendarDays()`
- `eventsForCalendarDay(day)`
- `formatCalendarTime(value)`

## 一、Web 端最小验证

### 1. 日历卡片正常显示

验证点：

- 进入日历界面后，卡片主视图正常渲染
- 月份标题可见
- 日期网格正常显示

通过标准：

- 无空白主面板
- 无明显脚本报错
- 当前月份视图与预期一致

### 2. 月份切换正常

验证点：

- 点击上月按钮后，月份切换正常
- 点击下月按钮后，月份切换正常
- 切换后标题与日期格同步变化

通过标准：

- 不出现切换后标题不变或日期格不同步
- 不出现切换后视图卡死

### 3. 当月事件展示正常

验证点：

- 当前月份存在事件时，日期格中的事件标记/信息正常展示
- 没有事件的日期不会异常显示脏数据

通过标准：

- 事件分布与当前 state 一致
- 没有出现空值报错或错位

## 二、Android 镜像端最小验证

### 1. 模板显示与 Web 一致

验证点：

- Android 镜像中的 calendar 卡片能正常显示
- 标题、日期格、月份切换逻辑与 Web 一致

通过标准：

- 镜像端没有因为 contract 不一致而出现独有错误
- 关键行为与 Web 端一致

### 2. 镜像消费入口未失配

验证点：

- `calendarPanelView()`
- `changeCalendarMonth(delta)`

仍能在镜像模板中正常驱动界面

通过标准：

- 不出现因入口移位导致的空白或按钮失效

## 三、跨模块最小验证

### 1. BOSS 预约链的时间格式仍正常

验证点：

- 触发 `boss-appointment-actions.js` 中依赖 `formatCalendarTime()` 的文案场景
- 检查申请/录入日历后的提示文本时间格式是否正常

通过标准：

- 时间文本可读
- 没有出现 `undefined` / 空串 / 非预期格式

### 2. calendar 作为公开能力的说明未失配

验证点：

- 检查 `publish/skills-definitions-apps.js` 中与日历相关的能力说明
- 若实际公开面发生变化，说明层是否同步

通过标准：

- 能力说明与当前真实方法名、用途一致
- 不出现“说明仍写旧入口，但实现已变”的失配

## 四、兼容兜底最小验证

### 1. 初始化边界不报错

验证点：

- 在 calendar 模块尚未显式打开前，若有路径触发相关读取，不应直接因 compat 或 fallback 移动而报错

通过标准：

- 不出现 `is not a function`
- 不出现未初始化 state 导致的直接崩溃

### 2. view helper 仍能完整返回结构

验证点：

- `calendarPanelView()` 返回的对象结构仍完整
- 模板依赖的 `view.toolbar.title` 等字段仍存在

通过标准：

- 不出现模板字段读取空值导致的 UI 异常

## 五、执行顺序建议

若未来真的进入 calendar compat 删除 gate，建议验证顺序为：

1. 先跑 Web 端显示与切换
2. 再跑 Android 镜像端同样行为
3. 再验证 BOSS 预约链时间格式
4. 最后核对说明层与公开面一致性

## 当前阶段结论

`calendar` 若未来进入 compat 删除 gate，最小验证不能只看日历本身是否还能显示，至少还必须覆盖：

1. Web 端模板显示
2. Android 镜像模板显示
3. 跨模块时间格式调用
4. 能力说明层一致性
5. 初始化边界与 fallback 安全性

只有这些都被纳入验证，calendar 才有资格从“高成熟度样板”继续进入“可评估 compat 删除”的下一阶段。