# 2026-07-10 控制域迁移：Control State 兼容迁移计划

## 目标

在控制状态读取已经从重复逻辑中收敛出来的基础上，将 control state 的真实实现迁入新的领域目录，同时保留旧路径兼容入口，不打断当前页面与动作逻辑。

## 本阶段动作

- 新增正式承载文件：`publish/domain/control/state.js`
- 旧文件 `publish/control-state.js` 降级为兼容入口
- `script-manifest` 改为优先加载新目录实现，再加载旧路径兼容别名

## 预期收益

- control state 成为新的领域目录承载示范
- 上层仍可继续通过 `window.GameModules.controlState` 使用既有接口
- 新模块可逐步依赖 `window.GameModules.domain.control.state`
- 为后续迁移更多领域模块建立固定模板

## 非目标

- 不改变控制状态规则
- 不改变首页显示逻辑
- 不改变角色列表链接状态判断逻辑
- 不改动调用方的使用方式
