# 2026-07-11 platform files role card json export validation

## Goal

为 `platform.core.files` 选择一个低风险、真实可用的运行时接入点，验证文件平台接口已经可以服务实际应用功能。本轮选择角色卡 JSON app 的导出场景。

## Scope

- 为 `publish/role-card-json-app/role-card-json-app.js` 新增导出动作。
- 为角色卡 JSON app 新增“导出 JSON”按钮。
- 导出动作统一走 `window.GameModules.platform.core.files.saveFile()`。
- 不改变角色卡 JSON 的构建逻辑。

## Changed Files

- `publish/role-card-json-app/role-card-json-app.js`
- `publish/index.html`

## Validation

1. `publish/role-card-json-app/role-card-json-app.js`
- 已新增 `exportRoleCardJson()`。
- 若当前 JSON 文本为空，会先尝试 `refreshRoleCardJsonText()`。
- 若仍为空，则给出导出失败提示。
- 导出文件名会基于 slot 和 exportedAt 生成。
- 实际导出统一调用 `window.GameModules.platform.core.files.saveFile(...)`。

2. `publish/index.html`
- 在角色卡 JSON app 工具栏中新增“导出 JSON”按钮。
- 按钮点击后调用 `$store.game.exportRoleCardJson()`。

## Checks

- `node --check publish/role-card-json-app/role-card-json-app.js`
- 使用 Node 逐行读取确认：
- action 已新增 `exportRoleCardJson()`
- 模板已新增“导出 JSON”按钮

## Result

这一步证明 `platform.core.files` 已经不再只是平台骨架，而是开始服务真实运行时功能。由于角色卡 JSON 导出不牵涉玩法状态变更，它是验证文件平台接口的理想低风险接入点。