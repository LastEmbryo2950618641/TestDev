# Character State Store Core Consumer Expansion Note

本文档记录 `characterStateStore` 继续向更核心业务读取点扩展的本轮进展。

## 一、本轮新增覆盖

本轮继续将以下读取点收口到 `characterStateStore`：

- `publish/player-identity-actions.js`
- `publish/update/generic-update-applier.js`

## 二、当前策略

仍保持：

1. 先收口读取型调用
2. 写入型调用暂不统一改造
3. 优先选择“先读状态，再决定是否更新”的路径

## 三、意义

这代表 `characterStateStore` 已经开始接触更核心的业务链路，而不是只停留在外围辅助模块。

尤其是：

- 身份/玩家自我状态补全
- 通用更新落地前的状态读取

都开始逐步通过统一中层入口获取状态。
