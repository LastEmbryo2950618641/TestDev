# 2026-07-10 存储边界第二刀：Real World Log Source 计划

## 目标

为现实日志建立统一存储入口，先只收口最小写入/计数能力，不碰分页读取与更复杂的日志整理逻辑。

## 本阶段动作

- 新增 `publish/platform/storage/real-world-log-source.js`
- 封装以下入口：
  - `append(entry)`
  - `saveAll(entries)`
  - `count()`
- 首批让 `publish/control-link-actions.js` 改为复用该 source

## 非目标

- 不替换 `listRealWorldLogEntries` 分页读取
- 不改动 real-world log 的排序与整理逻辑
- 不修改 sqlite-real-world-log.js 的底层实现
