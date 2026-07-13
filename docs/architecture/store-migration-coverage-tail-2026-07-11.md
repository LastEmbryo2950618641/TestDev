# Store Migration Coverage Tail Note

本文档记录本轮对剩余读取型尾部调用的继续收口。

## 一、本轮新增收口点

### characterStateStore

- `publish/character-memory-flow.js`

### realWorldLogStore

- `publish/real-world-agent-loop.js`

## 二、当前意义

这两处都属于“业务主干附近但仍然是读取型调用”的点：

1. `character-memory-flow.js` 负责角色记忆流转中的状态读取
2. `real-world-agent-loop.js` 负责现实推演过程中基于日志 ID 的条目读取

将它们继续收口到 store 层，有助于进一步减少核心业务对平台底层 source 位置的直接感知。
