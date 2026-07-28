# Profile / Values 单一数据源收敛方案

## 背景

当前角色状态对象同时包含 `profile` 与 `values`：

- `profile`：角色卡 / 身份档案。保存人物资料、社会身份、外貌、偏好、随身物品、穿着、组织归属等会随剧情变化的档案事实。
- `values`：RPG 运行态。保存等级、经验、生命池、体力池、基础属性、战斗推导、更新时间、模板初始化状态等纯运行数值。

问题是部分“资料字段”被同时写入两边，导致背包、身份证、AI提示词、结算更新看到的来源不一致。

## 目标原则

1. 与人物资料相关、可能被剧情改变并需要进入角色卡的字段，只保留在 `profile`。
2. `values` 只保留 RPG 机制运行字段，不再保存与 `profile` 重复的资料字段。
3. 旧存档加载时允许一次性迁移：优先选择更可信的一侧合并到 `profile`，随后删除 `values` 重复字段。
4. 展示层、技能层、结算层不得再通过 `values.xxx` 读取这些资料字段。
5. AI 提示词中涉及角色资料变化时，应指向 `profile.xxx`，不再要求写 `values.xxx`。

## 需要移出 values 的重复字段

| 字段类别 | 当前重复来源 | 收敛后唯一来源 | 说明 |
| --- | --- | --- | --- |
| 世界 | `profile.worldTag` / `profile.work` / `values.world_tag` | `profile.worldTag` / `profile.work` | `values.world_tag` 删除；运行态 `state.worldTag` 可作为索引字段保留。 |
| 年龄 | `profile.age` / `values.age` / `values.age_label` | `profile.age` | 年龄是身份资料；入口年龄同步应写 `profile.age`。 |
| 社群角色 | `profile.factions` / `values.factions` | `profile.factions` | 软性社群身份属于角色卡资料。 |
| 人事归属 | `profile.memberships` / `values.memberships` | `profile.memberships` | 组织、学校、岗位、学籍等属于角色卡资料。 |
| 物品 | `profile.items` / `values.items` | `profile.items` | 购买、获得、消耗、转让均更新角色卡物品。 |
| 穿着 | `profile.wearing` / `profile.wearingItems` / `values.wearing` | `profile.wearingItems`，必要时同步 `profile.wearing` 展示结构 | 穿戴状态是当前角色卡事实，不放 `values`。 |
| 知识 | `profile.knowledge` / `values.knowledge` | `profile.knowledge` | 学到的知识是角色档案能力。 |
| 技能 | `profile.skills` / `values.skills` | `profile.skills` | 技能升级或新增写角色卡。 |
| 职业 | `profile.professions` / `values.professions` | `profile.professions` | 职业能力 / 经验归角色卡。 |
| 上线体验 | `profile.control_experience` / `values.control_experience` | `profile.control_experience` | 这是人物对被控制的经历认知，属于资料。 |

## values 应保留的字段

`values` 继续保存以下运行态字段：

- 等级与成长：`level`、`exp`、`level_growth`、`free_attribute_points`
- 身内属性：`strength`、`agility`、`constitution`、`intelligence`、`perception`、`willpower`、`charisma`
- 池与状态数值：`vitality`、`stamina_pool`、`satiety`、`hydration`、`fatigue`、`mental_stability`、`action_ability`
- 推导与机制：`derived`、`combat_simulation`、`intrinsic_sources`
- 初始化模板状态：`intimacy`、`bodyStatus`
- 时间戳：`updatedAt`、`updatedGameTime`、`updatedGameTimeValue`
- 世界机制扩展：`worldValues` 的运行结果可进入 `values`，但若是角色资料型字段应进入 `profile`

## 迁移策略

### 1. 读取层先收敛

新增或调整统一 accessor，让旧代码过渡期可以读到同一来源：

- `profileInventoryItems(state)` 读取 `state.profile.items`
- `profileWearingItems(state)` 读取 `state.profile.wearingItems`
- `profileSocialFields(state)` 读取 `state.profile.factions` / `state.profile.memberships`
- `profileLearnedFields(state)` 读取 `state.profile.knowledge` / `state.profile.skills` / `state.profile.professions`
- `profileControlExperience(state)` 读取 `state.profile.control_experience`

展示、背包、AI资料查询、角色查询先全部切到 accessor。

### 2. 写入层改为 profile

以下入口必须从写 `values` 改为写 `profile`：

- 淘宝购买 / 物品增删：`inventory-actions.js`、`item-skill-actions.js`
- 装备 / 穿戴：`inventory-actions.js`、`inventory-equip-actions.js`、`wearing-sync-actions.js`
- 组织与人事归属：`rpg-state.js`、`company-faction-actions.js`、`org-territory-system.js`、`settlement-actions.js`
- 知识 / 技能 / 职业：`known-profession-actions.js`、`rpg-profession-state.js`
- 上线体验：`result-actions.js`、`character-feedback.js`、`control-experience-update.js`
- 年龄：`entry-age.js`、`rpg-age.js`

### 3. Prompt 与 update field 改名

所有结算提示词与 update 兼容层应改为：

- `values.memberships` → `profile.memberships`
- `values.factions` → `profile.factions`
- `values.wearing` → `profile.wearingItems`
- `values.control_experience` → `profile.control_experience`

兼容层可短期接受旧字段名，但落盘必须转写到 `profile`。

### 4. 加载迁移删除旧字段

在角色状态加载 / 保存入口增加迁移：

1. 若 `profile` 缺字段且 `values` 有旧字段，则拷贝到 `profile`。
2. 若两边都有，以 `profile` 为主；只有当 `profile` 为空时才用 `values` 补齐。
3. 迁移后删除 `values` 中的重复字段。
4. 保存时强制清理，防止旧代码再次写回。

建议迁移函数名：

- `migrateProfileOwnedFields(state)`
- `stripProfileOwnedValues(state)`

## 风险点

- 背包当前直接读 `values.items`，必须先切到 `profile.items`。
- 穿着槽位逻辑目前依赖 `values.wearing` 自动补 12 个槽位，迁移时要保证 `profile.wearingItems` 也能维持槽位规范。
- 职业、技能、知识参与战斗与成长推导，读取层要同步切换到 profile，否则 combat / life-energy 会丢数据。
- 组织系统有多处默认写 `values.memberships`，必须统一转写，否则又会出现两套归属。
- 测试中已有多处断言 `values.*`，需要对应更新为 `profile.*`。

## 建议实施顺序

1. 增加 accessor 与迁移函数，不改变业务语义。
2. 背包 / 身份证 / 角色查询改读 `profile`。
3. 物品 / 穿着写入改写 `profile`，移除刚添加的 `syncInventoryProfileFromValues` 双写。
4. 社群 / 人事归属写入改写 `profile`。
5. 知识 / 技能 / 职业 / 上线体验 / 年龄改写 `profile`。
6. 更新提示词和 update 兼容层，旧 `values.*` 输入只做兼容转写。
7. 预定义角色卡与旧存档迁移：删除 `values` 重复字段。
8. 同步 Android / 桌面资源并跑针对性测试。

## 完成判定

- 新存档角色 JSON 中，`values` 不再包含上表重复字段。
- 购买物品后，背包和身份证都从 `profile.items` 显示同一份数据。
- 组织、人事、技能、知识、职业、穿着更新后，只改 `profile`。
- 旧存档加载后自动迁移，不需要用户手动重开。
- Android assets 与 `publish` 保持一致。
