# Business Store Migration Stage Snapshot (2026-07-11)

本文档用于固化当前这一轮“业务层 -> 中层 store / settings -> 平台 bridge/source”迁移的阶段性结果，避免后续协作者继续把平台桥接层误判为业务残留。

## 一、阶段结论

截至当前工作区状态：

1. 业务层对角色状态的直接平台保存，已基本统一收口到 `window.GameModules.characterStateStore`
2. 业务层对现实日志的直接平台写入，已基本统一收口到 `window.GameModules.realWorldLogStore`
3. 当前 `publish/` 中继续出现的 `platform.core.storage.*` / `platform.storage.*Source` 命中，主要属于平台桥接层保留项，不再属于“业务层未迁移尾巴”

这意味着：

- “业务层共享 store 收口”可以视为一个阶段性完成结果
- 后续重点不应再是机械扫描业务文件并替换所有 `platform` 字样
- 下一阶段应转向“平台桥接边界梳理 + 多端装配继续收口”

## 二、当前已完成的业务层收口范围

### 1. characterStateStore

当前业务层已落到 `window.GameModules.characterStateStore` 的典型模块包括：

- `publish/entry-age.js`
- `publish/company-faction-actions.js`
- `publish/inventory-actions.js`
- `publish/known-profession-actions.js`
- `publish/real-world-actions.js`
- `publish/result-actions.js`
- `publish/real-world-settlement-actions.js`
- `publish/real-world-longing-actions.js`
- `publish/wearing-sync-actions.js`
- `publish/wechat-actions.js`
- `publish/update/generic-update-applier.js`
- `publish/character-profile-metric-sources.js`
- `publish/init/init-prompt-registry.js`
- `publish/player-identity-actions.js`
- `publish/control-link-actions.js`

这说明：

- 玩家身份链
- 现实主流程链
- 穿着/背包/职业/数值结算链
- 泛型更新链
- 控制链

都已经开始通过统一角色状态中层落盘。

### 2. realWorldLogStore

当前业务层已落到 `window.GameModules.realWorldLogStore` 的典型模块包括：

- `publish/real-world-clock-actions.js`
- `publish/real-world-actions.js`
- `publish/control-link-actions.js`
- `publish/solidify-actions.js`
- `publish/app/storage/restore-post-flow.js`

这说明：

- 初始化日志
- 现实交互主链路日志
- 控制链系统日志
- 固化卡面板状态回写日志

都已经开始通过统一现实日志中层落盘。

### 3. localSettings

当前本地设置仍通过：

- `publish/local-settings.js`

作为统一设置入口。

应继续保持：

- 业务依赖 `window.GameModules.localSettings`
- 平台差异保留在 `platform.core.storage.localSettingsSource`

## 三、当前应视为保留项的平台桥接层

以下文件继续出现 `platform.core.storage.*` 或 `platform.storage.*Source` 是合理且必要的：

- `publish/local-settings.js`
- `publish/platform/browser-core.js`
- `publish/platform/storage/local-settings-source.js`
- `publish/platform/storage/character-state-source.js`
- `publish/platform/storage/real-world-log-source.js`

这些文件的职责不是玩法逻辑，而是：

- browser 默认能力接线
- desktop / mobile / web 的统一平台桥接
- store / settings 中层最终落到宿主 source 的接线点

因此：

- 不应把它们继续当成“业务层耦合残留”处理
- 不应为了让全文搜索结果更漂亮而把桥接职责散回业务层

## 四、下一阶段的重点

在当前阶段完成后，推荐重点转向以下方向：

1. 继续完善阶段快照与边界说明文档
2. 明确 browser / desktop / mobile 三端各自负责的桥接职责
3. 继续保持业务逻辑只依赖 shared store / settings，而不是依赖宿主差异
4. 为 Windows exe、Android apk、web index.html 的最终装配继续收口

## 五、后续协作约束

后续协作者应遵循：

1. 不要继续在业务模块中新增 `platform.storage.*Source` 直连调用
2. 不要把平台桥接职责再散写回 `publish/` 普通业务文件
3. 不要把 `publish/platform/*` 与 `publish/local-settings.js` 当作普通业务耦合残留去清扫
4. 若后续新增业务能力，优先判断是否应扩展现有 `characterStateStore` / `realWorldLogStore` / `localSettings`

## 六、当前阶段验收证据

当前阶段已反复通过以下验证：

```bash
node publish/character-state-store-verify.js
node publish/real-world-log-store-verify.js
node publish/platform/browser-core-verify.js
node desktop/shell/assembly-entry-verify.js
node mobile/shell/assembly-entry-verify.js
```

这些验证不能单独证明“多端目标完全完成”，但足以证明：

- 共享 store 主干仍稳定
- browser / desktop / mobile 的装配主干仍稳定
- 当前业务层收口并未破坏既有基础验证
