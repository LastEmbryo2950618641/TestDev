# Desktop Storage Bridge Formal Verify Script Sketch (2026-07-11)

本文档用于把 `desktop storage bridge verify` 从“验证草案”进一步推进到“正式 verify 脚本草图”阶段。目标不是现在就落完整脚本，而是把后续真正要新增的验证脚本形状固定下来，减少实现阶段的摇摆。

## 一、建议脚本位置

建议后续新增：

- `desktop/shell/desktop-storage-bridge-verify.js`

定位：

- 专门验证 `desktop/shell/bridge/storage.js` 的最小宿主闭环
- 不替代 `desktop/shell/assembly-entry-verify.js`
- 不替代 `desktop/shell/desktop-packaging-electron-dist-state.cli.js`

三者关系应为：

1. `assembly-entry-verify.js`
   - 验证 desktop bridge 是否挂接成功
2. `desktop-packaging-electron-dist-state.cli.js`
   - 验证 packaging config 是否仍保持 Electron 主线稳定
3. `desktop-storage-bridge-verify.js`
   - 验证 storage bridge 最小 settings/raw 闭环是否成立

## 二、建议依赖前提

第一轮 verify 脚本建议依赖：

1. Electron channel 已存在
2. preload 最小 `settings/raw` API 面已定义
3. `desktop/shell/bridge/storage.js` 已至少对接一条最小宿主路径

在这些前提未具备前，不建议假装 verify 脚本已经可以完整跑通。

## 三、建议脚本目标

正式 verify 脚本的最小目标应包括：

### 1. bridge 识别

至少验证：

- 当前 channel 为 `electron`
- storage bridge 已存在
- `sourceShape()` 仍为：
  - `raw: readRaw / writeRaw / removeRaw`
  - `settings: readSettings / writeSettings`

### 2. settings round-trip

至少验证：

- 空值读取返回 `{}`
- 首次写入成功
- 二次浅合并仍成立
- 可选覆盖写入仍成立

### 3. raw round-trip

至少验证：

- 空值读取返回 `null`
- 原始值写入成功
- 再次读取与原始值完全一致
- 删除后返回 `null`

## 四、建议输出结构

建议正式 verify 脚本输出结构至少包含：

```json
{
  "runtimeFamily": "desktop-storage-bridge-verify",
  "channel": "electron",
  "bridgeReady": true,
  "sourceShape": {
    "raw": ["readRaw", "writeRaw", "removeRaw"],
    "settings": ["readSettings", "writeSettings"]
  },
  "settingsRoundTrip": true,
  "settingsMerged": true,
  "rawWriteRead": true,
  "rawRemove": true,
  "failures": []
}
```

说明：

- `bridgeReady` 用于快速判断最小宿主链是否具备前提
- `sourceShape` 用于避免实现时把接口面偷偷改歪
- `failures` 用于汇总失败位置而不是只抛第一处异常

## 五、建议脚本实现形状

第一轮脚本建议保持与现有 verify 风格一致：

- 构造最小 mock / target
- 调用 bridge
- 汇总结果
- `process.stdout.write(JSON.stringify(..., null, 2) + '\n')`

不建议第一轮就引入：

- 复杂测试框架
- 大量 fixture 文件
- 多 channel 测试矩阵

原因：

- 当前验证体系本身就是轻量 CLI verify
- 先保持风格一致，更利于快速集成到现有文档链与脚本链中

## 六、建议失败信息形状

建议 `failures` 至少可能包含：

- `bridge:channel-missing`
- `settings:initial-read`
- `settings:merge`
- `raw:initial-read`
- `raw:write-read`
- `raw:remove`

这样后续一旦失败，可以快速判断：

- 是 bridge 前提没成立
- 还是 settings 闭环有问题
- 还是 raw 删除语义不对

## 七、当前不建议 verify 第一轮就承担的职责

1. 覆盖 `electron / tauri / nativeBridge` 全矩阵
2. 覆盖生产级路径错误、权限错误、损坏恢复
3. 验证 shared gameplay 全链数据回放
4. 代替 packaging 验证或 assembly 验证

原因：

- 正式 verify 脚本第一轮仍应聚焦 storage bridge 最小闭环
- 不应把多个维度的验证混在一支脚本里

## 八、后续最自然的下一步

在这份脚本草图之后，最自然的推进是：

1. 先补 Electron 主线最小宿主 storage API 的实现草图或 mock 行为
2. 再真正新增 `desktop/shell/desktop-storage-bridge-verify.js`
3. 再根据需要补 `mobile-storage-bridge-verify` 的正式脚本草图

## 九、当前阶段证据

当前基础证据：

```bash
node desktop/shell/assembly-entry-verify.js
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

以及当前配套文档：

- `docs/architecture/desktop-storage-bridge-minimal-landing-sketch-2026-07-11.md`
- `docs/architecture/desktop-storage-bridge-verify-draft-2026-07-11.md`
- `docs/architecture/electron-preload-minimal-settings-raw-api-sketch-2026-07-11.md`

这些证据当前足以证明：

- desktop storage bridge 已从“纯 draft”推进到“可正式准备 verify 脚本”的阶段
- 当前正式 verify 脚本草图与既有 desktop 路线一致
