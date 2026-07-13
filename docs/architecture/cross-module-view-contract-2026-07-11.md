# Cross-Module View Contract (2026-07-11)

## 目标

为当前项目建立统一的展示层 contract，用于指导后续模块迁移、目录规范化，以及未来的 Windows exe / Android apk 壳层复用。该 contract 只约束“显示数据如何从业务层流向模板层”，不改变现有玩法逻辑、系统状态结构或 AI 生成流程。

## 背景

当前项目已经在多个模块中验证了“view helper + compat action + index.html 只消费 view object”的迁移路径，已落地样板包括：

- real-world map
- event
- faction
- calendar

这些样板说明：

- 不同复杂度的模块都可以逐步从模板直连 store，迁移为模板消费单一 view object。
- 迁移可以以最小行为改动完成，不需要先整体重写。
- view helper 可以作为未来多端壳层的稳定数据边界。

## 核心原则

1. 模板只消费 view object，不直接拼装业务数据。
2. view helper 负责“展示整形”，业务 action 负责“状态计算与交互行为”。
3. compat action 作为过渡层保留，避免一次性替换所有旧调用。
4. 迁移优先以 panel / detail / section / row 为单位渐进推进，不做跨模块大重写。
5. 不在 view helper 内写新的玩法逻辑，只复用现有 store / action 的结果。
6. 多端壳层只依赖 contract，不依赖具体页面模板里的零散表达式。

## 标准流向

推荐的数据流向固定为：

`system/state -> actions/store methods -> ui/<module>/view-helpers -> compat action -> template`

说明：

- `system/state`：保留现有玩法系统、规则计算、AI 注入、持久化状态。
- `actions/store methods`：继续承担状态切换、查找、格式化、兼容旧接口。
- `ui/<module>/view-helpers`：只负责给展示层提供稳定字段。
- `compat action`：给 Alpine 模板或未来壳层暴露稳定入口。
- `template`：只做渲染与事件绑定，不再直接认复杂原始结构。

## 命名约定

### Panel View

用于一个应用或主面板的整体展示对象。

推荐命名：

- `<module>PanelView()`
- 例：`calendarPanelView()`
- 例：`eventPanelView()`
- 例：`realWorldMapPanelView()`

推荐字段：

- `title`
- `description` 或 `subtitle`
- `eyebrow`
- `toolbar`
- `tabs`
- `rows` / `cards` / `cells` / `items`
- `emptyText`
- `closeLabel` / `backButtonText`

### Detail View

用于某个已选对象的详情展示。

推荐命名：

- `selected<Domain>DetailView()`
- `selected<Domain>OverviewView()`
- 例：`selectedEventDetailView()`
- 例：`selectedFactionOverviewView()`

推荐字段：

- `title`
- `meta`
- `description` / `content` / `summaryText`
- `statusLabel`
- `tags`
- `cards` / `overviewCards`
- `hasTags` / `hasXxx`

### Section View

用于主详情页中的子区块，适合 faction 这种由多个小块组成的页面。

推荐命名：

- `<domain>SectionView()`
- `selected<Domain><Section>NameView()`
- 例：`selectedFactionRelationSectionView()`
- 例：`selectedFactionArchiveSectionView()`
- 例：`selectedFactionStructureSectionView()`

推荐字段：

- `title`
- `notice`
- `actionLabel`
- `emptyText`
- `rows` / `cards` / `detail` / `list`

### Row / Card / Cell View

用于模板循环渲染的最小稳定单元。

推荐字段：

- `key`
- `title` / `name` / `label`
- `text` / `line` / `meta`
- `badge` / `status`
- `actionLabel`
- `canExpand` / `disabled` / `active` / `marked`
- 原始对象仅在确实需要交互透传时保留，例如 `role.role`

## 模板约束

模板层必须遵守以下限制：

1. 不在 `index.html` 内重复拼接复杂文案。
2. 不在 `x-for` 中直接读取复杂原始对象结构。
3. 不在模板中做多段业务分支判断来推导显示状态。
4. 允许保留事件绑定，例如 `@click`、`@keydown`、`x-show`。
5. 若模板必须知道布尔状态，应从 view 中读取，如 `hasTags`、`marked`、`detailOpen`。
6. 若模板必须循环渲染，优先循环 `rows/cards/items/cells`，不要直接循环 store 原始数组。

## View Helper 约束

view helper 必须遵守以下限制：

1. 可以复用现有 action/store 方法，但不要偷偷新增玩法副作用。
2. 不在 helper 里保存状态。
3. 不在 helper 里直接调用 `save()`、网络请求、AI 请求。
4. 只做展示整形、文案归一、字段裁剪、布尔派生。
5. 同一个区块要尽量由单一 view object 输出，不要让模板再拼半套。
6. 允许在 row 内保留少量透传对象给现有 dialog/action 使用，但必须是最小透传。

## Compat Action 约束

兼容层 action 用于平稳迁移，规则如下：

1. 命名与 view helper 输出保持一致。
2. 实现尽量是一行转发。
3. 不在 compat 层重新拼展示数据。
4. 老接口可以暂时保留，直到对应模板全部迁出。
5. 新模板优先消费新的 view 接口。

## 文件布局建议

推荐继续按如下结构演进：

- `publish/<module>-actions.js`：业务 action 与 compat action
- `publish/<module>-system.js`：状态与规则系统
- `publish/ui/<module>/view-helpers.js`：展示层整形
- `publish/ui/<module>/...`：同模块下可拆更多 helper 文件
- `docs/architecture/`：跨模块 contract、目录边界、迁移原则
- `docs/plans/`：每次迁移的验证记录

## 多端复用意义

该 contract 为未来多端拆壳提供了明确边界：

- Web 模板可以继续消费这些 view object。
- Windows exe 壳层可以用同一批 view helper + action 作为展示输入。
- Android WebView / Capacitor 壳层也可以复用相同 contract。
- 真正需要替换的只是壳层与容器，不应再重复复制业务整形逻辑。

## 当前样板映射

### real-world

- `realWorldMapPanelView()`
- `realWorldMapInteriorPanelView()`
- `realWorldMapInfoPanelView()`

### event

- `eventPanelView()`
- `selectedEventDetailView()`

### faction

- `selectedFactionOverviewView()`
- `selectedFactionStructureSectionView()`
- `selectedFactionRelationSectionView()`
- `selectedFactionArchiveSectionView()`
- `selectedFactionChangeLogSectionView()`

### calendar

- `calendarPanelView()`

## 迁移步骤模板

后续新模块迁移建议固定按以下顺序：

1. 找到模板中重复直连 store 的区块。
2. 先在 `publish/ui/<module>/` 中实现最小 view helper。
3. 在 `publish/<module>-actions.js` 中加 compat 转发。
4. 将 `index.html` 中目标区块切为 `x-data` / `x-effect` 消费单一 view。
5. 跑 `node --check` 校验改动 JS。
6. 用 Node 读取模板目标区间确认替换成功。
7. 在 `docs/plans/` 补一份验证记录。

## 明确禁止

- 不要为了“更整洁”一次性搬空整个模块。
- 不要把业务状态结构和展示 contract 同时重写。
- 不要在 view helper 内补隐藏玩法判断。
- 不要因为迁移展示层而改动用户可感知行为。
- 不要直接依赖 PowerShell 控制台输出来判断中文是否乱码。

## 下一阶段建议

在该 contract 基础上，后续可继续并行推进：

- 扩展更多模块样板，例如 worldline / save / known-profession
- 编写“web core / desktop shell / mobile shell”目录拆分草案
- 逐步减少 `index.html` 中超长模板区块对 store 的直接耦合
- 为未来 exe / apk 打包准备更稳定的共享展示边界