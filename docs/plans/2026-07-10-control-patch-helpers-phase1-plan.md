# 2026-07-10 控制域迁移：Control Patch Helpers 抽离计划

## 目标

继续细拆控制域组合动作，只抽出 summon / offline 流程中的纯 patch 构造逻辑，保留 sqliteSave、日志与 UI 编排在原组合层。

## 本阶段动作

- 新增 `publish/domain/control/control-patch-helpers.js`
- 抽离以下 patch 构造：
  - `buildSummonLocationPatch`
  - `buildSummonControlLinkPatch`
  - `buildOfflineControlLinkPatch`
- 原 `control-link-actions.js` 改为复用这些领域辅助

## 非目标

- 不迁移 `sqliteSave.saveCharacterState`
- 不迁移 real-world 日志追加
- 不迁移菜单与界面状态切换
- 不迁移上下线流程编排
