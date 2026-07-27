# 角色卡与 RPG 社会字段一致性设计

## 背景

身份证身份页应以角色卡 `profile` 为资料来源。当前社群角色与人事归属同时存在于 `profile` 和 `state.values`，供角色卡展示与既有 RPG/组织结算流程分别使用；证书与称号只存在于 `profile`。

最新身份页改动移除了从 RPG 字段追加身份资料的旧展示路径，但角色卡列表字段使用带角色前缀的 UI key，未被通用 RPG 列表识别函数识别，导致社群角色、人事归属、证书和称号四组列表全部不显示。同时，社群角色与人事归属存在多处独立复制逻辑，缺少统一的一致性约束。

## 目标

1. 身份证直接展示角色卡中的 `factions`、`memberships`、`certificates`、`titles`。
2. 身份证不得用 `state.values` 中的同名字段作为兜底来源。
3. `profile.factions` 与 `values.factions` 必须一致。
4. `profile.memberships` 与 `values.memberships` 必须一致。
5. `certificates`、`titles` 继续只保存在 `profile`，不复制到 RPG `values`。
6. 保持现有组织结算和 Stage4 人事归属更新可用。

## 数据归属

| 字段 | 身份证来源 | RPG 镜像 | 最终资料来源 |
| --- | --- | --- | --- |
| `factions` | `profile.factions` | `values.factions` | `profile` |
| `memberships` | `profile.memberships` | `values.memberships` | `profile` |
| `certificates` | `profile.certificates` | 无 | `profile` |
| `titles` | `profile.titles` | 无 | `profile` |

`values.factions` 与 `values.memberships` 是现有结算流程使用的兼容镜像，不是身份证展示来源。

## 方案

### 角色卡列表展示

身份字段构造器为四个数组字段增加明确的角色卡列表元数据，例如 `profileListKey`。UI 保留带目标 ID 的唯一 key，用于详情面板与界面切换；列表类型判断使用显式元数据，不再通过 RPG 字段名猜测。

`identityInfoPresentation()` 根据角色卡列表元数据读取 `field.raw`，生成 `dossier.lists`。因此带前缀 key 不影响展示，也不需要重新追加 RPG 原始字段。

### 社会字段一致性

建立单一同步入口处理 `factions` 和 `memberships`：

- 角色卡生成、加载或刷新后，以 `profile` 为输入，规范化后同时写入 `profile` 与 `values`。
- Stage4 或组织结算先产生新的 RPG 值时，以本次明确更新结果为输入，同时写回 `values` 与 `profile`。
- 同步时使用复制后的数组，避免两侧共享同一数组引用造成绕过更新入口的隐式修改。
- 同步完成后刷新 `roleCardUpdatedAt`，并继续调用现有组织归属同步逻辑。
- 清空是合法更新；明确传入空数组时，两侧都必须清空，不能被旧值回填。

同步调用方必须明确指定本次数据来源，禁止在两侧冲突时依靠“哪个非空”自动猜测。

### 证书与称号

`certificates` 和 `titles` 只参与角色卡生成、校验、去重、身份页展示及角色卡更新，不进入 RPG schema、`state.values` 或 RPG 结算列表。

## 测试

1. 使用真实带前缀身份字段复现，验证四类字段全部进入 `identityInfoPresentation().lists`。
2. 验证身份页分区中不存在无前缀 RPG `factions`/`memberships` 兜底字段。
3. 验证以 `profile` 为来源同步后，社群角色和人事归属两侧内容一致但数组引用不同。
4. 验证以 RPG 更新结果为来源同步后，`profile` 被同步更新。
5. 验证显式空数组能同时清空两侧。
6. 验证证书和称号不会被写入 `state.values`。
7. 运行身份页、角色卡、组织结算和社会字段相关回归测试。

## 非目标

- 不移除现有 Stage4、组织结算对 `values.memberships` 的使用。
- 不把证书或称号加入 RPG 成长、战斗或结算系统。
- 不修改 AI 对四类身份事实的生成与归类规则。
