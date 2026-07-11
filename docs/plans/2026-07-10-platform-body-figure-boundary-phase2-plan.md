# 2026-07-10 平台边界第二刀：Body Figure 兼容迁移计划

## 目标

在第一阶段已经完成平台入口收敛的基础上，进一步把 body figure 的平台实现迁入新目录骨架，同时保留旧路径兼容入口，避免直接打断现有逻辑。

## 本阶段动作

- 新增正式承载文件：`publish/platform/body-figure/source.js`
- 旧文件 `publish/platform-body-figure-source.js` 降级为兼容入口
- `script-manifest` 改为优先加载新目录实现，再加载旧路径兼容别名

## 预期收益

- 新结构开始承载真实平台实现，而不是只有桥接层
- 旧模块仍可继续通过 `window.GameModules.platformBodyFigureSource` 工作
- 新模块可统一依赖 `window.GameModules.platform.bodyFigureSource`
- 为后续迁移 `platform-key-source` 和其它平台模块建立模板

## 非目标

- 不修改 body figure 业务规则
- 不修改 UI 交互
- 不修改 dev server 行为
- 不改动现有上层调用结果
