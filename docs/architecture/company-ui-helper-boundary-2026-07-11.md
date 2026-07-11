# Company UI Helper Boundary（2026-07-11）

本文档用于说明 `company` 模块当前已经完成的展示层 helper 收口范围、兼容壳边界，以及后续继续推进时应遵守的低风险模式。

它服务于以下目标：

- 保持公司系统玩法逻辑不变
- 继续降低 `company-actions.js` 对模板展示细节的直接耦合
- 为后续 exe / apk 多端复用提供更稳定的展示层结构
- 给后续 AI 会话提供可复制的 section/detail/view object 样板

## 1. 当前模块拆分现状

`company` 当前已经形成三类底层展示 helper：

- `publish/ui/company/company-pay-view-helpers.js`
- `publish/ui/company/company-field-view-helpers.js`
- `publish/ui/company/company-attendance-view-helpers.js`

同时存在一个聚合层：

- `publish/ui/company/view-helpers.js`

这个聚合层的职责是：

- 统一转发底层展示 helper
- 在不触碰业务逻辑链的前提下，组合成模板可直接消费的 view object

兼容动作入口保留在：

- `publish/company-actions.js`

## 2. 本轮已落地的 view object

### `companyHeaderView()`

用途：

- 收口公司主界面 header 展示信息

当前字段：

- `eyebrow`
- `title`
- `subtitle`
- `closeLabel`

当前模板落点：

- `publish/index.html` 公司主界面 header 区

特点：

- 标题仍依赖当前公司状态与在职状态
- 副标题仍依赖原有 `workStatusText()`
- 不修改关闭行为，只收口文案与展示组合

### `companyAttendanceView()`

用途：

- 收口出勤卡片展示信息

当前字段：

- `status`
- `className`
- `detail`
- `canCheckIn`
- `label`
- `actionLabel`

当前模板落点：

- `publish/index.html` 出勤卡片区

特点：

- 底层状态仍来自 `currentWorkAttendance()`
- 只把模板直接散读的字段收口成稳定 view object
- 不改变打卡行为链

### `companyPayPreviewView()`

用途：

- 收口薪酬绩效预览卡片展示信息

当前字段：

- `title`
- `summaryLine`
- `performanceLine`

当前模板落点：

- `publish/index.html` 薪酬绩效预览卡片区

特点：

- 底层数据仍来自 `monthlyPayPreview()`
- 不改薪酬计算逻辑
- 只把模板中的多段拼接文本收口为稳定展示对象

## 3. 当前兼容壳边界

`publish/company-actions.js` 当前只补了最小兼容入口：

- `companyHeaderView()`
- `companyAttendanceView()`
- `companyPayPreviewView()`

它们的职责仅为：

- 从 store/action 层继续暴露旧入口调用方式
- 将真实展示组合逻辑转发给 `publish/ui/company/view-helpers.js`

这意味着：

- 模板无需直接知道底层 helper 分布
- 旧 action 文件无需重新承担展示拼装职责

## 4. 当前没有动的区域

本轮没有进入以下区域：

- 招聘逻辑
- 入职/离职状态切换逻辑
- 出勤决策与打卡逻辑
- 组织结构生成逻辑
- lexicon 同步链
- 保存链与初始化链

这些区域仍属于：

- 业务逻辑区
- 数据构造区
- 高关联影响区

后续如果没有明确计划文档，不应顺手进入。

## 5. 当前模板消费落点

已确认切换为消费 view object 的位置包括：

- 公司 header 标题区
- 出勤卡片区
- 薪酬绩效预览卡片区

仍保留原状的区域包括：

- 公司字段词条区
- 组织结构区
- 招聘选项区
- 合同与投稿列表区
- 入职记录区

这说明当前策略是：

- 先收口最稳定、最纯展示的卡片与头部
- 复杂列表与业务交互区暂不冒进

## 6. 后续推荐推进顺序

建议后续按以下顺序继续推进：

1. 组织结构区只读 section view object
2. 公司字段词条区只读 section 或 rows object
3. 合同/投稿列表区 detail view object
4. 最后才考虑更复杂的招聘与入职记录展示包装

## 7. 编辑规则

后续任何 AI 在 `company` 上继续推进时，应遵守：

- 真实展示实现优先放到 `publish/ui/company/`
- `publish/company-actions.js` 只保留最小兼容壳
- 不要在同一轮里混做玩法逻辑改造
- 不要顺手进入初始化、同步、保存主链
- 模板只做最小消费入口切换
- 每新增一个 view object，都应能指出明确模板落点

## 8. 与总路线的关系

`company` 当前这批 view object 的意义在于：

- 它验证了“底层 helper + 聚合 helper + compat shell + 模板消费对象”的路线，不只适用于 `wechat` / `settings` / `real-world`
- 它让展示层逐步脱离旧 action 文件
- 它为未来桌面壳与移动壳共用设置、卡片、列表展示形式提供了更稳定的基础

## 9. 联动文件

- `publish/ui/company/view-helpers.js`
- `publish/ui/company/company-pay-view-helpers.js`
- `publish/ui/company/company-field-view-helpers.js`
- `publish/ui/company/company-attendance-view-helpers.js`
- `publish/company-actions.js`
- `publish/index.html`
- `docs/architecture/display-object-patterns-playbook-2026-07-11.md`
- `docs/architecture/module-migration-priority-ladder-2026-07-11.md`
