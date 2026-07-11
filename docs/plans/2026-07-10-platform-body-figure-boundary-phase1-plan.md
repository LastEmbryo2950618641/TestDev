# 2026-07-10 平台边界第二刀：Body Figure 资源链路收敛计划

## 1. 目标

在不改变当前 body figure 使用行为的前提下，先将其 dev-only 平台依赖入口从业务模块中收口，为未来桌面壳与移动壳适配准备统一入口。

## 2. 当前问题

当前 `body-figure` 相关逻辑同时包含两类资源访问：
- 静态资源访问：`assets/body-figures/...`
- dev-only 接口访问：`/__dev/body-figure-index`、`/__dev/body-figure-meta`、`/__dev/body-figure-image`

问题在于：
- 业务模块直接知道 dev-only 端点路径
- 平台替换时，`body-figure.js` 与 `wechat-album-actions.js` 都需要跟着改
- dev-only 资源写入逻辑还没有清晰的平台边界

## 3. 本刀范围

重点处理：
- `publish/body-figure.js`
- `publish/wechat-album-actions.js`
- 如有必要，新增 body figure 平台入口模块

本刀不处理：
- body figure 业务匹配规则
- 身体图元数据结构
- 平台实际持久化替换
- 图片生成流程规则
- UI 行为和交互结构

## 4. 原则

- 保持当前桌面开发环境中的 body figure 功能行为不变
- 不改变当前资源读取与生成结果
- 业务层不再直接散落多个 `__dev/body-figure-*` 路径
- 先抽平台入口，再考虑未来桌面/移动端具体实现替换

## 5. 建议方案

建议新增一个轻量平台入口模块，例如：
- `publish/platform-body-figure-source.js`

第一阶段该模块只负责：
- 暴露 dev-only 端点调用方法
- 提供 body figure 静态资源基础路径访问方法

这样后续：
- 桌面端仍然可以继续通过当前 dev server 工作
- 移动端可以替换为本地文件或原生桥接
- 上层业务模块不需要继续知道具体 dev-only 路径

## 6. 验收标准

- `body-figure.js` 不再直接散落多个 `__dev/body-figure-*` fetch 路径
- `wechat-album-actions.js` 的图片写入入口不再直接依赖具体 dev-only 路径
- 当前桌面开发功能行为不变
- 本次改动不改变 body figure 业务规则与 UI 交互结果
