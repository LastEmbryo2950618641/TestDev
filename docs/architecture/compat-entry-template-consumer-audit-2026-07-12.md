# Compat Entry Template Consumer Audit (2026-07-12)

## 目的

核对当前已桥接的 `publish/game.js` compat 入口，是否仍被 Web 主模板与 Android 镜像模板直接消费。

这份审计的用途是回答一个关键问题：

- “已桥接”是否已经等于“可以删除顶层入口”\n
当前结论是否定的。

## 审计范围

本轮重点核对以下几组已经完成桥接的入口：

- taobao
- calendar
- skills
- prompt
- boss（只读展示与低风险边缘）

审计对象：

- `publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`

## 审计结论

### 1. taobao

以下入口在 Web 模板与 Android 镜像模板中都仍有直接消费：

- `taobaoWalletRows()`
- `taobaoFilterLabel()`
- `taobaoWearFilters()`
- `taobaoFilteredSlots()`
- `selectedTaobaoSlot()`
- `taobaoProductDetail()`
- `taobaoSetItems()`

结论：
- taobao 线虽然已桥接到 `gm.taobaoActions`
- 但模板 contract 仍是 `$store.game.taobao...`
- 当前不能删除 `game.js` 上这些 compat 入口

### 2. calendar

以下入口仍被模板直接消费：

- `calendarMonthTitle()`
- `calendarDays()`

结论：
- 仍是模板主 contract
- 当前仍需保留 compat 入口

### 3. skills

以下入口仍被模板直接消费：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`

结论：
- 虽然正式实现已在 `skillsActions`
- 但模板仍未迁移 away from `$store.game`

### 4. prompt

以下入口仍被模板直接消费：

- `promptCategoryLabel()`
- `promptCategories()`
- `promptList()`
- `currentPromptItem()`

结论：
- 仍是模板主入口 contract
- 当前只能视为 compat facade，不是删除候选

### 5. boss

以下入口仍被模板直接消费：

- `currentBossJobs()`
- `selectedBossJob()`
- `selectedBossCompanyJob()`
- `bossOptions()`
- `bossAppointmentChoices()`
- `bossCompanyFields()`
- `bossApplyHint()`
- `bossApplyButtonText()`
- `bossJobPayText()`
- `bossMatchText()`

结论：
- boss 线当前只是“展示/派生面已桥接”
- 模板仍重度依赖 `$store.game.boss...`
- 当前远未到删除 compat 入口的阶段

## 总结判断

本轮审计证明：

1. 已桥接入口在 Web 模板中仍有直接消费
2. Android 镜像模板仍保留同名消费
3. 因此，这批入口当前的真实身份是：
   - 兼容 facade
   - 模板稳定 contract
   - 非删除候选

## 对后续清理的意义

后续若想真正删除 `publish/game.js` 上的 compat 入口，至少还需要满足：

1. Web 模板先迁移到新的稳定公开面
2. Android 镜像模板同步迁移
3. 复杂模块内部调用链完成复核
4. fallback 兜底职责不再需要，或已有更安全替代方案

在此之前，正确做法应继续是：

- 保留 `game.js` compat 入口
- 继续让其变薄
- 继续把真实实现留在模块侧
- 把“删除旧入口”视为后置阶段，而不是当前阶段目标

## 当前阶段结论

`publish/game.js` 的这批入口目前已经从“厚逻辑残留”逐步转为“兼容 contract 层”，但从模板消费角度看，它们依然是主运行链公开面的一部分。

因此：

- 当前可以继续桥接收口
- 当前不应直接清理删除
- 下一阶段若要继续推进，应优先准备模板消费迁移策略，而不是直接删 compat 入口