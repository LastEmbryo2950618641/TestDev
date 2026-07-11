# Display Object Patterns Playbook（2026-07-11）

本文档用于把当前已经在多个模块中验证过的“展示层对象化”方法正式沉淀下来，方便后续 AI 会话或人工协作者直接复用。

这里的“展示层对象化”主要指三类模式：

- `row object`
- `detail view object`
- `section view object`

目标不是增加抽象层数，而是：

- 减少模板对原始状态结构的直接依赖
- 提高展示规则的复用性
- 在不改变玩法逻辑的前提下，逐步形成适合多端复用的展示边界
- 为后续目录规范化提供更可复制的落地路径

## 1. 为什么需要展示层对象化

当页面长期直接消费原始状态时，通常会出现这些问题：

- 模板里散落大量 `title / subtitle / label / empty-state / button text`
- 同一类展示规则在多个模板或多个读链重复出现
- 页面一改文案就容易碰到底层状态字段
- 后续想迁移到桌面壳或移动壳时，展示规则难以复用

展示层对象化的核心作用是：

- 把“展示应该长什么样”从模板里拿出来
- 让模板更多只消费稳定对象，而不是临时拼字段
- 让旧入口保留 compat 壳，逐步降低耦合，而不是一次性重排主链

## 2. 三种已验证模式

### A. `row object`

适用场景：

- 列表行
- chip / tag / archive row
- facts / history / room chip / zone row
- 任何模板中反复出现的“单行展示单元”

典型字段：

- `key`
- `title`
- `subtitle`
- `meta`
- `badge`
- `actionLabel`
- `emptyText`

当前已验证模块：

- `faction`
- `real-world`
- `wechat`

一句话理解：

- 如果模板里正在循环列表，并且每个 item 都要临时拼展示字段，优先改成 `row object`。

### B. `detail view object`

适用场景：

- 房间详情
- 删除确认弹窗
- 裁剪弹窗
- 资料卡中的一小块详情区
- 某个模板区域本身不是列表，但需要消费一组稳定展示字段

典型字段：

- `title`
- `description`
- `residentsLine`
- `templateLabel`
- `hasTemplateLabel`
- `confirmLabel`
- `cancelLabel`

当前已验证模块：

- `real-world`
- `wechat`

一句话理解：

- 如果模板里不是循环列表，而是在同一块区域里多次读取几个相关展示字段，优先改成 `detail view object`。

### C. `section view object`

适用场景：

- 面板头部
- section 标题区
- 按钮 + 说明 + 标题组合区域
- 模态区头部

典型字段：

- `title`
- `actionLabel`
- `notice`
- `description`
- `eyebrow`

当前已验证模块：

- `faction`

一句话理解：

- 如果模板某个 section 头部总是在分别拼标题、按钮文案、说明文案，优先改成 `section view object`。

## 3. 当前真实样板对应关系

### `real-world`

当前已验证：

- `interiorRoomRows(floor)`：`row object`
- `interiorFloorRows()`：`row object`
- `selectedRoomDetailView()`：`detail view object`
- `infoInteriorActionLabel()` / `canOpenInfoInterior()` / `infoInteriorTargetNodeId()`：按钮与跳转相关展示对象化

适合学习的点：

- 同一条 interior 线如何从 row object 一直延伸到 detail view object
- 同一套展示规则如何服务 info / interior 两个相邻区域

### `faction`

当前已验证：

- archive / change log / structure / org chart 等大量 `row object`
- `structureSectionView()`：`section view object`

适合学习的点：

- 单模块详情区如何从多个零散模板字段，逐步演进为 section 级对象化边界
- 组织类页面如何在不碰初始化 / 同步链的前提下持续收口

### `wechat`

当前已验证：

- contact / thread / album photo 等 `row object`
- `wechatAlbumDeleteConfirmDetailView()`：`detail view object`
- `wechatAvatarCropDetailView()`：`detail view object`

适合学习的点：

- 小型弹窗、裁剪弹窗这种“轻详情区”也适合走 detail view object
- detail view object 不只适用于复杂面板，也适用于短弹窗

## 4. 推荐判断顺序

当你发现某块模板太脏时，先按这个顺序判断：

1. 这是列表吗？
   - 是：优先做 `row object`
2. 这不是列表，但同一区域里要消费多个相关展示字段吗？
   - 是：优先做 `detail view object`
3. 这是 section 头部，标题 / 说明 / 按钮文案散着写吗？
   - 是：优先做 `section view object`
4. 如果都不是，再考虑是否只抽单个 helper

## 5. 标准落地结构

默认推荐按以下链路推进：

1. 真实实现进入 `publish/ui/<module>/...`
2. 聚合层继续转发到现有 `view helpers` 入口
3. 旧 action 文件保留 compat 壳
4. 模板改为真实消费对象
5. 边界文档同步记录“本轮补充”

不要跳过第 3 步和第 5 步。

## 6. 停手条件

出现以下情况时，默认停止继续深拆：

- 下一步将进入状态写链
- 必须修改初始化 / 恢复 / 同步主链
- 旧大文件开始出现大范围替换风险
- 当前切口已经不再是展示对象，而是底层规则问题
- 继续抽象只会增加层级，但没有新的复用收益

## 7. 最小验证标准

每次对象化改造后，建议至少验证：

- helper 已真实存在
- compat 壳已接上
- 模板已切到新对象消费方式
- helper 文件最小语法检查通过
- 边界文档或 playbook 已同步

如果旧大文件历史污染导致整文件无法完整校验，应如实记录，并单独作为稳定化工作处理。

## 8. 不要误用对象化的情况

以下情况不建议硬做对象化：

- 只是单个简单空态，且后续没有复用迹象
- 对象化后仍然只有一个字段，没有组合价值
- 真实问题其实是状态来源不一致，而不是模板展示太脏
- 为了“好看”强行新建一层，但没有减少模板耦合

## 9. 推荐联动文档

- `docs/architecture/three-sample-playbook-2026-07-11.md`
- `docs/architecture/module-migration-priority-ladder-2026-07-11.md`
- `docs/architecture/wechat-ui-helper-boundary-2026-07-10.md`
- `docs/architecture/faction-ui-helper-boundary-2026-07-11.md`
- `docs/architecture/real-world-map-interior-helper-boundary-2026-07-11.md`
- `docs/architecture/encoding-collaboration-rules.md`
- `docs/architecture/ai-development-workflow.md`
