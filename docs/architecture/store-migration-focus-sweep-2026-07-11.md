# Store Migration Focus Sweep Note

本文档记录本轮对剩余高价值读取型直接平台调用的集中收口。

## 一、本轮新增收口点

### realWorldLogStore

- `publish/real-world-actions.js`
  - `count()`
  - `get(id)`

### characterStateStore

- `publish/character-profile-metric-sources.js`
  - `get(id)`

## 二、当前意义

这批调用都更贴近现实推演主流程与角色指标补全过程，继续收口后：

- 现实推演主流程对日志底层 source 的直接感知进一步减少
- 角色指标补全流程对角色状态底层 source 的直接感知进一步减少

## 三、当前策略未变

仍保持：

1. 读取型优先
2. 局部、可验证、低风险推进
3. 不直接大规模触碰高风险入口文件
