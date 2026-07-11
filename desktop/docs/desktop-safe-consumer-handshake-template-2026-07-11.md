# Desktop Safe Consumer Handshake Template

## 目标
把当前已落地的两个桌面 safe-consumer handshake 示例抽象成统一模板，供后续继续接入更多低风险消费者时复用。

## 当前已验证的样例
1. `settings-local-read`
2. `role-card-json-export`

## 通用模板
### Step 1: 确认消费者属于 safe-consumer
满足以下条件再进入桌面 handshake 试点：
- 不直接驱动剧情主链
- 不直接写入高耦合推演结果
- 失败后可回退到浏览器/dev 原有实现
- 可单独验证，不需要同时改多个系统

### Step 2: 先检查桌面宿主状态
优先检查：
- `platform.core.host.capabilities(target).bridgeReady === true`

如果 bridge 未 ready：
- 直接回退到共享浏览器/dev 路径
- 不做强切换

### Step 3: 再检查目标域能力
根据消费者所属域，再检查对应能力：
- 本地设置读取：`platform.core.storage.desktopBridge.readSettings`
- 文件导出：`platform.core.files.capabilities(target).ready`
- 文件导入预览：`platform.core.files.capabilities(target).ready`

### Step 4: 优先桌面 / 回退共享
推荐固定模式：
1. 若桌面 bridge ready 且目标域能力存在
   - 优先走桌面宿主能力
2. 否则
   - 回退到共享 `platform.core.*` 浏览器/dev 实现

### Step 5: 不修改共享主链
safe-consumer 试点阶段默认不要做：
- 不直接改 `publish/index.html`
- 不直接让高耦合玩法模块依赖桌面 bridge
- 不同时切多个 consumer

## 推荐优先顺序
1. `settings-local-read`
2. `role-card-json-export`
3. `role-card-json-import-preview`
4. 其他低风险导入导出或本地配置链路

## 当前模板的价值
- 把“桌面优先 / 共享回退”模式固定下来
- 让后续 safe-consumer 扩展时不再重复设计接入规则
- 保持浏览器/dev 主链始终可回退
