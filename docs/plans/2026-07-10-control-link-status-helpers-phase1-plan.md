# 2026-07-10 控制域迁移：Link Status Helpers 抽离计划

## 目标

继续细拆 `control-link-actions`，只抽出 control_link 状态 patch 的构造与应用逻辑，保持循环、落盘与编排仍留在原组合层。

## 本阶段动作

- 新增 `publish/domain/control/link-status-helpers.js`
- 抽离以下辅助逻辑：
  - `buildControlLinkPatch`
  - `applyControlLinkPatch`
- 原 `refreshControlLinkStates` 改为复用领域辅助，但继续负责循环与 `sqliteSave` 落盘

## 非目标

- 不迁移 `refreshControlLinkStates` 整个循环
- 不迁移 `sqliteSave.saveCharacterState`
- 不迁移召唤、下线叙事与 real-world 日志逻辑
