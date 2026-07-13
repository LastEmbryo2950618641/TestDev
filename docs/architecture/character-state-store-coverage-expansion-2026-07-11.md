# Character State Store Coverage Expansion Note

本文档记录 `characterStateStore` 从首批读取样板继续扩展覆盖面的本轮进展。

## 一、本轮新增覆盖

在首批接入：

- `publish/real-world-agent-memory.js`
- `publish/item-skill-actions.js`

之后，本轮继续将以下读取点收口到 `characterStateStore`：

- `publish/real-world-longing-actions.js`
- `publish/predefined-role-cards.js`

## 二、收口原则

本轮仍坚持：

1. 优先读取型调用
2. 暂不改写写入型调用
3. 不改变玩法逻辑
4. 先扩大中层样板覆盖，再处理更敏感的持久化流程

## 三、当前意义

`characterStateStore` 现在已经不再只是一个孤立雏形，而是开始承接：

- 记忆读取
- 技能/角色解析
- 相思事件候选读取
- 预设角色状态读取

这让角色状态相关业务逐步脱离对平台底层 source 位置的直接依赖。
