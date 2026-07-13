# Desktop Entry Integration Checklist

## 目标
把“当前桌面 handshake runner 示例”推进为“未来真实桌面入口可执行步骤”的 checklist，确保后续真正接 Electron / 桌面宿主时，有固定顺序可遵循。

## 起点
当前已有：
- desktop 五大高优先域 draft
- desktop handshake example
- 三条 safe-consumer 示例
- desktop safe-consumer runner example
- 浏览器/dev 回退路径

## Checklist
### 1. 保持共享主链不动
- 确认 `publish/index.html` 不作为桌面入口接线点被直接修改
- 确认当前浏览器/dev 路径仍可独立运行

### 2. 在桌面宿主启动流程中显式装配 `platform.core`
- 调用 `attachDesktopPlatformCore(...)`
- 确认 `host.kind() === 'desktop'`
- 确认 `host.capabilities().bridgeReady === true`

### 3. 仅在桌面入口层运行 handshake runner
- 调用 `runDesktopSafeConsumerHandshake(...)`
- 先只读取 runner 输出，不自动接高耦合链路
- 确认 `fallback === 'browser-dev-path'`

### 4. 只放开第一批安全消费者
按当前顺序：
1. `settings-local-read`
2. `role-card-json-export`
3. `role-card-json-import-preview`

要求：
- 每次只放开一条或一组极小链路
- 每条都必须能明确回退到共享浏览器实现

### 5. 每放开一条链路都单独验证
至少验证：
- bridge ready 时桌面优先路径可走通
- bridge 未 ready 时共享回退路径仍成立
- 不影响现有浏览器/dev 运行方式

### 6. 不在这个阶段做的事
- 不切剧情主链
- 不切现实推演主链
- 不切微信主链
- 不同时并行推进桌面和移动真实宿主

## 完成 Stage B 的最低标志
- 桌面入口能完成 `attachDesktopPlatformCore(...)`
- 桌面入口能运行 `runDesktopSafeConsumerHandshake(...)`
- 至少一条 safe-consumer 在桌面入口中被受控验证
- 浏览器/dev 仍保持可回退
