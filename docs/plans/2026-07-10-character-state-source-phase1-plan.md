# 2026-07-10 存储边界第一刀：Character State Source 计划

## 目标

为角色状态读写建立统一的存储入口，先在控制域小范围接入，避免业务模块继续直接散落依赖 `sqliteSave.saveCharacterState`。

## 本阶段动作

- 新增 `publish/platform/storage/character-state-source.js`
- 封装以下入口：
  - `get`
  - `getByName`
  - `list`
  - `save`
- 先让 `publish/control-link-actions.js` 改为复用该 source 的保存入口

## 非目标

- 不替换 memory / worldline / real-world-log 等其他 sqlite 子域
- 不改动 sqliteSave 的底层实现
- 不一次性全仓替换所有 `saveCharacterState` 调用
