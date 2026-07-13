# 2026-07-11 faction-overview-view-validation

## 目标

将 `faction` 详情弹窗上半区从直接依赖多个零散 helper 的写法，收敛为单一 `selectedFactionOverviewView()` 对象消费，验证显示层对象化模式可以继续复制到第三个模块。

## 本轮范围

- 新增 `selectedFactionOverviewView()`
- 保留既有 `selectedFaction()` / `selectedFactionOverviewSummary()` / `factionCapabilityCards()` 等细粒度 helper
- 仅迁移详情弹窗上半区：hero、势力总览、战略态势图
- 不改变势力初始化、结构树、档案、角色弹窗等行为逻辑

## 改动文件

- `publish/ui/faction/overview-view-helpers.js`
- `publish/faction-actions.js`
- `publish/index.html`

## 设计说明

### 1. 新增上半区聚合对象

`selectedFactionOverviewView()` 统一输出：

- `title`
- `description`
- `maturityLabel`
- `typeLabel`
- `levelLabel`
- `statusLabel`
- `resolutionBadge`
- `parentLabel`
- `summaryTitle`
- `summaryEyebrow`
- `summaryText`
- `overviewTitle`
- `overviewEyebrow`
- `overviewCards`

### 2. 模板迁移范围

仅迁移：

- 势力 hero 顶部信息
- 势力总览摘要
- 战略态势图 overview cards

改为：

- `x-data="{ view: $store.game.selectedFactionOverviewView() }"`
- `x-effect="view = $store.game.selectedFactionOverviewView()"`

### 3. 保持其余区块原状

以下区块本轮未改动逻辑边界：

- 组织架构
- 规则 / 资源 / 下级势力
- 档案卷宗
- 角色弹窗
- 审计/一致性相关功能

这样可以在不扩大风险面的前提下，先完成第三个模块样板验证。

## 验证

已执行：

```powershell
node --check publish/ui/faction/overview-view-helpers.js
node --check publish/faction-actions.js
```

并使用 Node 逐行读取 `publish/index.html` 目标区间，确认：

- hero 区已消费 `view` 对象
- summary 区已消费 `view.summary*`
- overview cards 已消费 `view.overviewCards`
- 下半区组织结构及后续区块保持原有调用链

## 收益

到这一轮为止，显示层对象化样板已经扩展到三个模块：

- `real-world`
- `event`
- `faction`

这证明当前项目规范化路线具有跨模块通用性，可以继续推广到更多业务区块。
