# Desktop Storage Bridge Verify Draft (2026-07-11)

本文档用于为 `desktop/shell/bridge/storage.js` 后续第一轮最小实现，预先固定验证草案。目标不是立即新增完整测试脚本，而是明确：

- settings round-trip 最小应验证什么
- raw round-trip 最小应验证什么
- 哪些失败信息应被暴露出来
- 哪些验证能证明“desktop storage bridge 开始可落地”

## 一、当前验证缺口

当前 desktop 相关验证已覆盖：

- `desktop/shell/assembly-entry-verify.js`
- `desktop/shell/desktop-packaging-electron-dist-state.cli.js`

这些验证当前能证明：

- desktop bridge 装配形状存在
- desktop storage bridge 的 channel 探测存在
- packaging config 主线存在

但尚未覆盖：

- `readSettings / writeSettings` 是否真正闭环
- `readRaw / writeRaw / removeRaw` 是否真正闭环
- storage bridge 最小宿主后端是否已经开始可用

因此，需要为 storage bridge 单独补一份验证草案。

## 二、验证目标优先级

推荐按以下顺序验证：

### 阶段 A：settings round-trip

最小验证目标：

1. `readSettings(key)` 在空值情况下返回 `{}`
2. `writeSettings(key, patch)` 可写入 patch
3. 写入后再次 `readSettings(key)` 能拿到合并结果
4. 再次写入第二个 patch 时，仍保持浅合并语义

为什么先验证 settings：

- 语义最简单
- 与 `localSettings` 最直接相关
- 对 shared gameplay 影响最小

### 阶段 B：raw round-trip

最小验证目标：

1. `readRaw(slot)` 在空值情况下返回 `null`
2. `writeRaw(slot, raw)` 能写入原始内容
3. 写入后再次 `readRaw(slot)` 能拿到完全一致的内容
4. `removeRaw(slot)` 后再次读取应回到 `null`

为什么第二步再验证 raw：

- raw 更贴近角色状态与现实日志的最终落地层
- 会牵涉 slot 命名、序列化、删除语义
- 比 settings 更容易出现后端实现差异

## 三、推荐验证输出结构

后续若实现正式 verify 脚本，建议输出结构至少包含：

```json
{
  "runtimeFamily": "desktop-storage-bridge-verify",
  "channel": "electron",
  "settingsRoundTrip": true,
  "settingsMerged": true,
  "rawWriteRead": true,
  "rawRemove": true,
  "failures": []
}
```

目的：

- 让验证结果可快速机器判断
- 让失败信息集中展示，而不是只抛第一处异常

## 四、settings round-trip 建议检查项

建议最小检查项：

1. 初始读取
   - 输入：不存在的 key
   - 预期：返回 `{}`

2. 首次写入
   - 输入：`{ uiThemeId: 'custom' }`
   - 预期：写入成功，读取后得到对应字段

3. 二次合并写入
   - 输入：`{ uiThemeCustomColor: '#abcdef' }`
   - 预期：读取结果同时包含：
     - `uiThemeId: 'custom'`
     - `uiThemeCustomColor: '#abcdef'`

4. 可选覆盖检查
   - 输入：`{ uiThemeId: 'default' }`
   - 预期：最终读取时 `uiThemeId` 被更新为 `default`

## 五、raw round-trip 建议检查项

建议最小检查项：

1. 初始读取
   - 输入：不存在的 slot
   - 预期：返回 `null`

2. 写入字符串或 JSON 串
   - 输入：例如 `slot = 'state:demo'`, `raw = '{"ok":true}'`
   - 预期：写入成功

3. 读回一致性
   - 预期：`readRaw(slot)` 返回与写入完全一致的原始值

4. 删除后复查
   - 执行：`removeRaw(slot)`
   - 预期：再次读取返回 `null`

## 六、失败信息建议

后续正式 verify 脚本建议不要只抛通用错误，而应尽量输出：

- 当前 `channel`
- 失败发生在 `settings` 还是 `raw`
- 是初始化读取失败、写入失败、合并失败，还是删除后仍残留

建议失败汇总为：

- `failures: ['settings:initial-read', 'raw:remove']`

这样后续在高脏工作区里更容易快速判断问题位置。

## 七、当前不建议 verify 第一轮就覆盖的内容

1. 多 channel (`electron / tauri / nativeBridge`) 全覆盖
2. 生产级路径/权限/文件损坏恢复
3. 大体量数据压测
4. 与 shared gameplay 全链联调

原因：

- 第一轮 verify 的目标是证明 bridge 最小闭环成立
- 不是一次把宿主存储实现做成生产级测试矩阵

## 八、验证通过后意味着什么

如果上述 settings/raw round-trip 最小验证通过，意味着：

1. desktop storage bridge 不再只是纯 stub
2. shared `localSettings` 已开始具备真实桌面宿主落点可能
3. shared `characterStateStore / realWorldLogStore` 继续向桌面宿主后端接入迈出实质一步

## 九、后续最自然的下一步

在 verify 草案之后，最自然的推进是：

1. 补 Electron preload 最小 settings/raw API 草图
2. 再新增正式 `desktop-storage-bridge-verify` 脚本
3. 再决定 raw 最终落地采用文件还是其他容器

## 十、当前阶段证据

当前基础证据：

```bash
node desktop/shell/assembly-entry-verify.js
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

这些证据当前足以证明：

- desktop storage bridge 已具备可验证形状
- Electron 仍是当前首选真实 channel
- 当前 verify 草案与最小落地草图、桌面路线文档一致
