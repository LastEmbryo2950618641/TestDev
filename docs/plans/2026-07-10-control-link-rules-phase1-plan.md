# 2026-07-10 控制域迁移：Link Rules 纯规则抽离计划

## 目标

不整块迁移 `control-link-actions`，只先抽出其中纯领域规则部分进入 `publish/domain/control/`，让 UI、持久化与叙事组合逻辑仍留在原文件中。

## 本阶段动作

- 新增 `publish/domain/control/link-rules.js`
- 抽离纯规则函数：
  - `controlLinkState`
  - `controlLinkId`
  - `controlLinkHasHighMetric`
  - `controlLinkHasPlayerIntimacy`
  - `isControlRoleLinked`
  - `isSameWorldControlTarget`
  - 共享控制只读展示函数
- 原 `publish/control-link-actions.js` 改为复用领域规则模块

## 非目标

- 不迁移菜单开关逻辑
- 不迁移状态写回与落盘逻辑
- 不迁移上下线叙事与实时世界日志逻辑
- 不改变 UI 结构与按钮行为
