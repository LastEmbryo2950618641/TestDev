# 2026-07-10 控制域迁移：Online Control Helpers 抽离计划

## 目标

继续细拆 `onlineControlRole`，只抽出其 control_link patch 构造逻辑，保留 sharedControl 状态开关、日志、落盘与界面编排在原组合层。

## 本阶段动作

- 新增 `publish/domain/control/online-control-helpers.js`
- 抽离 `buildOnlineControlLinkPatch`
- 原 `onlineControlRole` 改为复用该领域辅助

## 非目标

- 不迁移 `sharedControlTargetId` / `sharedControlActive` 的赋值
- 不迁移 `sqliteSave.saveCharacterState`
- 不迁移 real-world 日志追加
- 不迁移界面状态切换
