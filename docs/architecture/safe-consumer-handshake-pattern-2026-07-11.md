# Safe Consumer Handshake Pattern

## 目标
作为 `Stage B` 的补充模式文档，记录桌面 safe-consumer handshake 的统一接入规则。

## 核心原则
1. 先看桌面 host bridge 是否 ready。
2. 再看目标域 bridge 是否 ready。
3. ready 则优先桌面。
4. 否则回退共享浏览器/dev 路径。
5. 不在 safe-consumer 阶段改高耦合玩法链路。

## 当前模板位置
- `desktop/docs/desktop-safe-consumer-handshake-template-2026-07-11.md`

## 当前已验证的消费者
- `settings-local-read`
- `role-card-json-export`
