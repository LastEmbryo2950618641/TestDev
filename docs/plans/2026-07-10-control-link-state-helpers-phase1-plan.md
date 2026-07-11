# 2026-07-10 控制域迁移：Link State Helpers 抽离计划

## 目标

继续细拆 `control-link-actions`，将其中偏状态修正的辅助逻辑抽入 `publish/domain/control/`，同时保持落盘、叙事与 UI 编排仍由原组合层负责。

## 本阶段动作

- 新增 `publish/domain/control/link-state-helpers.js`
- 抽离以下辅助逻辑：
  - `controlLinkLocationText`
  - `ensureControlRoleLocation`
- 原 `publish/control-link-actions.js` 改为复用该辅助模块

## 非目标

- 不迁移 `refreshControlLinkStates`
- 不迁移 `summonControlRole`
- 不迁移 `offlineSharedControlRole`
- 不改变 UI、落盘和 real-world 日志编排
