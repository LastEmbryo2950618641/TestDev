# 2026-07-10 平台边界第一刀：Key Source 兼容迁移计划

## 目标

在 key 文件读取入口已经完成平台收敛的基础上，进一步把 key source 的真实实现迁入新目录骨架，同时保留旧路径兼容入口，不打断当前上层逻辑。

## 本阶段动作

- 新增正式承载文件：`publish/platform/keys/source.js`
- 旧文件 `publish/platform-key-source.js` 降级为兼容入口
- `script-manifest` 改为优先加载新目录实现，再加载旧路径兼容别名

## 预期收益

- key source 的真实平台实现进入新目录承载
- 上层仍可继续通过 `window.GameModules.platformKeySource` 调用
- 新模块可逐步切换为依赖 `window.GameModules.platform.keySource`
- 为后续迁移更多平台能力建立统一模板

## 非目标

- 不改变 key 文件路径
- 不改变设置页逻辑
- 不改变 provider 初始化行为
- 不调整上层调用方式
