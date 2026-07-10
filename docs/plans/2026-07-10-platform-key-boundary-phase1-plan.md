# 2026-07-10 平台边界第一刀：Key 读取链路收敛计划

## 1. 目标

在不改变当前桌面开发可用性的前提下，先将 key 文件读取逻辑从“直接依赖固定路径 fetch”逐步收敛为更清晰的平台能力入口，为后续 `window exe / 安卓 apk` 适配打基础。

## 2. 当前问题

当前 key 读取链路存在以下特点：
- `dev/scripts/dev-server.cjs` 直接暴露 `/deepseek_key.txt` 与 `/pixatart_key.txt`
- `publish/local-settings.js` 直接通过固定路径 fetch 这些文件
- 这条链默认依赖当前本地开发服务器实现

问题在于：
- 业务层默认知道具体路径
- 将来桌面壳或移动壳不一定有同样的路径
- 平台替换时会影响前端业务层

## 3. 本刀范围

重点处理：
- `publish/local-settings.js`
- 如有必要，新增一个平台 key 读取入口模块

本刀不处理：
- key 存储 UI 重构
- 平台真实实现切换
- `window.dzmm` 能力替换
- sqlite 持久化替换
- body-figure 文件链路

## 4. 原则

- 保持当前桌面开发读取 key 的行为不变
- 不改当前 API key 设置页可用性
- 前端业务层逐步不再直接散落多个固定路径读取逻辑
- 先抽统一入口，再决定未来桌面/移动端如何分别实现

## 5. 建议方案

建议新增轻量入口，例如：
- `publish/platform-key-source.js`

该模块第一阶段只负责：
- 封装当前 key 文件读取尝试顺序
- 向上提供统一读取方法

这样未来：
- 桌面端仍可读本地 key 文件
- 移动端可改为读 `Preferences` / 本地设置 / 原生桥接
- 上层 `local-settings` 不需要知道平台细节

## 6. 验收标准

- 当前桌面开发环境读取 key 行为不变
- `local-settings.js` 不再自己维护多处分散 key 路径读取逻辑
- 第一批平台能力边界开始形成
- 不影响当前 AI / 绘图 provider 设置流程
