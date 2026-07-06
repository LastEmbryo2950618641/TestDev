# 势力 / 社群系统替换原实现 · 迁移分期

> 状态：执行计划 v0.1  
> 日期：2026-07-06  
> 目标：在不打断现有存档与 UI 的前提下，逐步把旧实现迁移到 `结构真源 + 五面板总览` 新模型

---

## 1. 迁移目标

把当前旧实现：

- 一级视图按 `gov / geo / corp / community`
- 宏观能力按 `solid.overviewPanels.political / economic / asset / military`
- 角色组织归属重构在 `membership`

逐步替换为新实现：

- 一级页面按 `势力 / 社群`
- 结构真源按 `orgDomain + ownership + parentId + structure + membership`
- 宏观总览真源按 `overviewPanels.ideology / economy / politics / military / diplomacy`
- `gov / corp / community` 降为结构属性与筛选标签

### 1.1 本轮概念替换结论

- 旧“势力地位”不再作为角色卡里的自由文本主字段；改由 `org registry + membership + overviewPanels` 表达。
- 旧“社群角色”不再作为另一套轻量模型；社群与势力共用同一套 org schema，只通过 `classification` 或等价判断区分。
- “正式组织身份”不是“法定身份”。反抗军、地下会、非法帮派也可以拥有正式组织身份；是否合法、是否被承认，应写入 `legitimacy`、`relations`、`rules[]` 或外部评价字段。
- `community` 不再泛指一切社群，只保留给地理社区、居民共同体、地方共同体等结构域；微信群、同好会、秘密会社等属于“社群型 org”，可挂在 `gov`、`corp` 或具体上级链下。
- “势力 / 社群”的分类边界暂按五面板成熟度判断：五大基础全部确立为势力；任一基础未确立时仍归为社群。
- “中兴会”这类模糊地带先按弱信息 org 或 `membership` 迷雾处理；只有推演逐步补齐五大基础后，才升级为势力。

---

## 2. 真源顺序

重构后统一遵守以下优先级：

1. `structure[]`
2. `membership`
3. `overviewPanels`
4. `solid.overviewPanels.*`（旧字段已移除）
5. `values.membership`（旧字段已移除）

规则：

- 新事实先写 1-3
- 旧字段仅由新字段派生或双写
- 禁止反过来让旧字段覆盖新字段

---

## 3. 分期

### Phase 0 文档统一

目标：

- 统一“势力 / 社群”为玩家一级主轴
- 明确 `gov / corp / community` 只是结构域
- 明确 `overviewPanels` 为长期总览真源
- 把 `asset` 降为重构容器
- 明确旧“势力地位 / 社群角色”替换为 `membership + overviewPanels + classification`
- 明确“正式组织身份”不等于“法定身份”，违法/地下组织同样可建 org

产出：

- `org-territory-system-design.md`
- `faction-org-forest-design.md`
- 本迁移文档

### Phase 1 运行时加新真源，不拆旧 UI

目标：

- 在现有 `factions[]` 上稳定挂载 `overviewPanels`
- 增加 `classification: faction | community` 或等价判断函数
- 建立从 `membership -> membership`、`overviewPanels -> legacy overviewPanel summary` 的重构派生
- 增加灰区默认策略：五面板未齐的强组织先归类为 `community`，不因危险、规模或违法性自动升为 `faction`

优先涉及文件：

- `publish/org-territory-system.js`
- `publish/org-territory-actions.js`
- `publish/faction-system.js`

完成标准：

- 新存档与旧存档都能读到 `overviewPanels`
- 不改主界面入口时，旧功能不崩

### Phase 2 先替换数据写入，再替换读取

目标：

- Stage4 / update apply 先写新字段
- 旧字段改成同步产物

优先涉及文件：

- `publish/update/faction-overview-update.js`
- `publish/update/org-overview-panel-update.js`
- `publish/update/membership-update.js`
- `publish/real-world-agent-loop.js`

完成标准：

- 新推演写入时，`overviewPanels`、`structure`、`membership` 一定先落地
- `overviewPanels.*`、`membership` 仅作直接写入新字段

### Phase 3 UI 主轴切换

目标：

- 玩家一级页面切换到 **势力 / 社群**
- `gov / geo / corp / community` 改为对象标签、筛选器、结构面包屑

优先涉及文件：

- `publish/faction-system.js`
- `publish/faction-org-forest.js`
- `publish/faction-actions.js`
- `publish/rpg-field-ui.js`

完成标准：

- 玩家看到的不是“国家机构 / 经济组织 / 社群”一级页
- 进入详情后仍能看到结构域路径

### Phase 4 清理旧重构模型

目标：

- 逐步移除 `asset` 作为独立能力维度
- 缩减 `solid.overviewPanels` 到只剩缓存或完全移除
- 弱化 `membership`，保留导出重构

完成标准：

- 新 UI 与新推演不再依赖旧字段
- 旧字段最多只在导出、旧存档重构时出现

---

## 4. 字段替换映射

| 旧实现 | 新实现 | 说明 |
| --- | --- | --- |
| `solid.overviewPanels.political` | `overviewPanels.politics` | 旧政治能力条目逐步迁入治理骨架 |
| `solid.overviewPanels.economic` | `overviewPanels.economy` | 经济资源、产能、人口、面积等统一进经济面板 |
| `solid.overviewPanels.asset` | `overviewPanels.economy` 或 `playerProfile.wealth*` | 不再作为第六类核心 |
| `solid.overviewPanels.military` | `overviewPanels.military` + `structure[]` | 兵种条目可先双写，长期以新模型为准 |
| `membership` | `membership` | 旧角色卡字段保留重构展示 |
| 势力地位（角色卡文本） | `membership` + `overviewPanels` + `classification` | 角色在组织中的身份、职位、席位、头衔归 `membership`；组织能力归五面板 |
| 社群角色 / 社群身份 | `membership` + `classification=community` | 社群不是独立模型，而是同构 org 的未完成势力态 |
| 法定身份 | 正式组织身份 + `legitimacy` | “合法/非法/未承认”不决定是否能建 org，只决定合法性与外部关系 |
| 泛化 `community` | 地理 `community` 域 + 社群型 org 分类 | `community` 域只保留给地理社区；线上/圈层社群按直接管理者挂链 |
| 域 Tab | 势力 / 社群 页 + 结构筛选 | 页面主轴与结构域分离 |

---

## 5. 当前建议的实际执行顺序

1. 先改 `org-territory-system.js`，补齐 `overviewPanels` 默认值与分类判断
2. 再改 `org-territory-actions.js`，让 apply 先写新字段
3. 再改 `faction-system.js` / `faction-org-forest.js`，把 UI 主轴切到 `势力 / 社群`
4. 最后清理 update prompt 与旧重构展示

---

## 6. 当前不做

- 一次性删除全部旧字段
- 一次性重写所有角色卡
- 一次性放弃旧存档重构
- 为强网络型组织单独引入图数据库
- 把“中兴会”这类灰区对象提前写死为势力
- 用合法性、官方承认或公开活动状态替代五面板成熟度判断

---

## 7. 社群保留与边界暂定

社群仍保留为玩家一级主轴之一，但它不是另一套存储结构，而是同一套 org 模型下的成熟度分类。后续仍需继续讨论边界，当前计划先按以下默认规则落地：

| 场景 | 默认处理 |
| --- | --- |
| 只有称呼、往来、被认为属于某会 | 建弱信息 org 或 `membership` 迷雾，不直接判定为势力 |
| 有固定名称、负责人、成员筛选、行动分工，但五面板未齐 | 归类为社群型 org |
| 五大基础 `ideology / economy / politics / military / diplomacy` 全部被推演确立 | 升级为势力 |
| 已升级为势力后基础崩塌 | 记录为衰败、分裂、解体、吞并或消亡，不退回社群 |
| 反抗军、地下会、非法组织 | 按同一规则判断势力/社群；违法性写 `legitimacy=unrecognized/contested` 或关系字段 |

开放问题：

- 强网络型、强重叠型、强横向协作型社群是否需要额外关系层，暂不在本阶段实现。
- 社群态五面板 UI 文案是否完全重解释为“凝聚力 / 可用资源 / 管理 / 隐藏武力 / 联谊”，后续随 UI 实现再定。

---

## 8. 里程碑判断

当满足以下条件时，可认为“新模型已接管系统”：

- 新推演先写 `overviewPanels / structure / membership`
- 玩家一级页面按 `势力 / 社群`
- `gov / corp / community` 仅作为结构属性显示
- `membership` 与 `solid.overviewPanels` 不再决定核心逻辑
- 灰区组织默认能以社群型 org 落地，并可在五面板补齐后升级为势力
