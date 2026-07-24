# 身份页：人生取向与长期目标分栏设计

## 目标

把「长期目标系统」从现有混杂的「人生目标」面板中拆出，单独成标签页；原面板改名为「人生取向」，只展示价值取向类字段。用紧凑推进卡呈现短/中/长期目标的内容、期限、进度与阶段成果，避免看起来像被还原成纯长文。

## 背景与问题

- `profile.goalSystem` 已具备结构化字段：`short` / `medium` / `long`（`content`、`deadline`、`progress`、`detail`）与 `achievements`。
- 当前身份页「人生目标」把取向字段与目标字段混在同一 `view: 'goals'` 面板，且向导 seed 常只有正文，期限/进度为空，观感像普通文本卡。
- 手机框宽度约 390px，三列目标卡会挤压；取向信息与目标推进职责不清。

## 标签结构

身份信息之后的相关标签顺序：

| 标签标题 | Tab 短标签 | view | 职责 |
| --- | --- | --- | --- |
| 人生取向 | 取向 | `lifeOrientation`（或沿用改造后的取向专用 view） | 价值立场、决策风格、人生六维、底线锚点、心理偏好、人生总结 |
| 长期目标 | 目标 | `goalSystem` | 短/中/长期目标 + 阶段成果 |
| 本质偏好 | 偏好 | `essentialPreference` | 本质偏好五层（不变） |

- 现有「人生目标」→ 改名为「人生取向」；短标签由「目标」改为「取向」。
- 新建「长期目标」；短标签「目标」（或「志向」若与冲突再定，默认「目标」）。
- 「本质偏好」不变。

## 字段归属

### 人生取向页

来源：`profileGroup === '人生取向'` 中**非**目标系统字段，例如：

- 价值立场、决策风格、人生六维、底线锚点、心理偏好、人生总结 / 人生取向总结
- 可选：顶部保留人生总结摘要（最多 3 行）

**不得**再包含：短期目标、中期目标、长期目标、阶段成果、结构化 `goalSystem` lexicon 行。

### 长期目标页

来源：`profile.goalSystem`（经 `characterGoalSystem.ensureOnProfile` / `lexiconFields`），仅：

- 短期 / 中期 / 长期目标（含 `goalTier`）
- 阶段成果（`goalAchievements`）

**不得**再塞入价值立场、六维、心理偏好等取向字段。

## 长期目标页 UI（紧凑推进卡）

手机框内目标轨道**始终单列竖排**（不依赖 viewport media query 决定列数；以 `.goals-panel` / `.phone-frame` 容器为准）。

每张目标卡结构：

1. 头行：图标 + 标题 + 期限文案（无则「未设期限」）+ 进度百分比（无结算也显示 `0%`）
2. 细进度条（始终可见，体现结构化）
3. 正文：`content`，约 2–3 行省略
4. 详情：有 `detail` 时一行展示
5. 点击仍打开现有 `ability-detail-sheet`，展示完整字段

阶段成果区：

- 标题「阶段成果」+ 共 N 条
- 默认最多展示 5 条；超出可依赖详情抽屉或「查看全部」行为（实现时优先列表截断 + 点击展开已有详情机制）
- 有 `at` 时显示弱化日期

可选顶部：一行目标摘要（来自向导 `summary` / 目标摘要字段）；无则省略 hero 长文。

空状态：无 `goalSystem` 且无法从取向 seed 时，显示「尚未建立长期目标；完成人生取向向导后自动生成」。

## 数据与兼容

- 权威存储：`profile.goalSystem`（见 `publish/character-goal-system.js`）。
- 向导确认后继续 seed 正文；期限/进度可由后续 Stage4「长期目标」结算写入。
- **本设计不修改**结算协议、向导步骤 UI、本质偏好五层逻辑。
- 身份字段组装：`player-identity-actions` / `profileSections` 需把取向 fields 与 `goalSystem` fields 分到两个 section；过滤条件更新为保留 `view === 'lifeOrientation' | 'goalSystem' | 'essentialPreference'`（最终实现可用等价命名，但职责必须分离）。

## 样式约束

- 字号与现有身份子面板统一（约 12px），卡片内边距紧凑。
- 不引入时间轴、仪表盘总进度环。
- 视觉语言延续现有 tone-cyan / gold / pink 目标卡配色。

## 测试要点

- `profileSections` 在有取向字段时出现「人生取向」；在有 `goalSystem`（或可 seed）时出现「长期目标」。
- 「人生取向」section 不含短/中/长期/阶段成果字段。
- 「长期目标」section 不含价值立场等取向字段。
- 目标卡在 phone-frame 宽度下为单列；进度条与 `0%` /「未设期限」在仅有 content 的 seed 数据下仍可见。
- 现有 `character-goal-system` normalize / seed / lexicon 单测继续通过；可补 section 拆分的轻量测试或呈现函数断言。

## 非目标（本轮不做）

- 改造人生取向向导第 7 步为结构化编辑器
- 改 Stage4 长期目标结算 prompt / applier 协议
- 时间轴或总览仪表盘布局
- 把取向字段合并进本质偏好页
