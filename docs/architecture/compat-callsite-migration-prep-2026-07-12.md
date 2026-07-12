# Compat Callsite Migration Prep Checklist (2026-07-12)

## 目的

这份清单用于承接 `compat-cleanup-gate-checklist-2026-07-12.md` 与 `compat-callsite-audit-2026-07-12.md` 的结论，进一步回答：

- compat 当前还不能删，那么后续应该先迁哪些调用面
- 不同模块的迁移顺序应该怎么排
- 每个模块在进入 compat 清理前还缺什么前置条件

这不是执行删除 compat 的文档，而是“删除前的迁移准备顺序”文档。

## 适用模块

当前覆盖：

- company
- event
- worldline

## 统一迁移原则

### 1. 先迁源码主调用面，再考虑宿主镜像

迁移顺序优先级：

1. 源码中的页面模板与动作入口
2. 本地主运行目录中的聚合调用面
3. 宿主构建链与分发镜像

原因：

- 宿主镜像通常是主源码的派生产物
- 若主源码调用面还没稳定，先改宿主没有意义

### 2. 先迁只读消费面，再碰状态写入面

对于同一模块：

- 优先迁只读 panel / row / label / section 消费面
- 后迁界面选择状态写入
- 最后才考虑 compat facade 删除

### 3. 迁移准备阶段不混入高风险清理

在迁移准备阶段，不应同时做：

- 编码清洗
- 宿主镜像重排
- 顶层 actions 大改
- compat 删除

## 分模块迁移准备清单

### company

#### 当前主阻塞

- `publish/company-actions.js` 仍通过 `window.GameModules.ui.company.viewHelpers[name].call(...)` 动态分发
- `publish/company-attendance-actions.js` 仍直接消费 compat 路径
- 基础 helper 同时存在历史编码脏字风险

#### 迁移优先级

当前优先级：`中`

原因：

- company 的主页面 section 已明显收敛到 summary / section view contract
- 页面模板层的直接底层依赖已经显著下降
- 但动作层仍明显依赖 compat 动态分发
- recruit / tools 等剩余区块仍未完成同等级别收敛

#### 进入下一阶段前需要先满足

- 形成 company 动作层专门迁移计划
- 明确 `company-actions.js` 是否要继续保留动态转发壳
- 审计 recruit / tools 区块是否仍需要继续收敛到展示 contract

#### 当前建议

- company 仍不建议作为第一个 compat 迁移试点
- 但它已经不再只是“结构样板状态”，可以进入更积极的迁移准备阶段

### event

#### 当前主阻塞

- `publish/event-actions.js` 仍通过 compat 做动态分发
- `publish/index.html` 当前主要直接消费：
  - `eventPanelView()`
  - `eventListView()`
  - `selectedEventDetailView()`

#### 迁移优先级

当前优先级：`中`

原因：

- event 的结构已经开始形成 panel / label 分层
- 风险低于 company
- 但规则中心仍集中在 `eventSystem`
- 动作入口和页面模板仍未做迁移准备

#### 进入下一阶段前需要先满足

- 梳理 `publish/index.html` 中事件面板调用是否可切到更稳定的新聚合面
- 明确 `event-actions.js` 的动态分发未来是保留还是收缩
- 确认宿主最小分发链同步方式

#### 当前建议

- event 可以继续做小簇拆分
- 但仍不建议立刻启动 compat 删除

### worldline

#### 当前主阻塞

- `publish/index.html` 仍直接消费 worldline compat 路径
- `view-helpers.js` 仍承担 broader compat entry
- `selectRealWorldPlot()` 仍是最小界面选择状态写入点

#### 迁移优先级

当前优先级：`最高`

原因：

- worldline 结构成熟度最高
- helper 主题边界最清晰
- 连续多轮迁移稳定
- 当前主要阻塞已从“结构不清楚”转为“调用面尚未迁移”

#### 进入下一阶段前需要先满足

- 审计 `publish/index.html` 中 worldline 相关调用项
- 明确哪些调用可直接替换为新 helper 聚合面
- 保持 `selectRealWorldPlot()` 继续作为界面写入点，不与纯只读 helper 混迁

#### 当前建议

- worldline 最适合作为未来第一个 compat 迁移试点模块
- 但仍应先做页面模板调用迁移准备，而不是直接删 compat

## 当前推荐的迁移顺序

在当前证据下，推荐顺序为：

1. worldline
2. event
3. company

补充说明：

- company 当前仍排在最后，不是因为页面层没有进展
- 而是因为动作层 compat 动态分发依赖比 worldline / event 更重

理由：

- worldline：结构最成熟，最适合先做迁移准备
- event：风险中等，结构正在成型
- company：基础层风险最高，应继续后置

## 下一阶段最值得先做的动作

### 优先动作 A：worldline 页面模板调用迁移清单

建议下一步先盘：

- `publish/index.html` 中 worldline 相关调用
- 哪些已稳定切到新 helper 聚合面
- 哪些仍只是通过 compat facade 对外暴露

### 优先动作 B：event 页面模板与动作层迁移清单

在 worldline 之后，可继续盘：

- `publish/index.html` 里的 event 面板调用
- `publish/event-actions.js` 的动态分发职责

### 暂缓动作 C：company compat 迁移

company 当前仍不应进入第一批迁移试点。

## 当前总判断

当前项目最适合进入：

- “迁移准备排序”阶段
- 还不适合进入“批量 compat 删除”阶段

更具体地说：

- worldline 已进入“可以准备迁移调用面”的阶段
- event 已进入“继续扩大小簇并同步准备迁移”的阶段
- company 仍处于“先稳住、后审计”的阶段
