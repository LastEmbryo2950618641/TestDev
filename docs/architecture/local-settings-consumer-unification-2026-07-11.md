# Local Settings Consumer Unification Note

本文档用于记录本轮针对 `localSettingsSource` 相关业务消费路径的最小收口动作。

## 一、目标

在不改玩法逻辑、不触碰高风险大入口文件的前提下，先把一个最小业务点从“直接访问平台存储实现”收口为“访问统一本地设置入口”。

## 二、选择的切口

本轮选择：

- `publish/ui-theme-actions.js`

原因：

1. 其启动阶段原本直接读取 `platform.core.storage.localSettingsSource`
2. 影响范围明确
3. 不涉及复杂异步存档流
4. 可作为后续更多本地设置消费点收口的模板

## 三、本轮收口前后

### 收口前

`ui-theme-actions.js` 底部自启动代码直接调用：

- `window.GameModules.platform.core.storage.localSettingsSource.read('gamefy-local-settings-v1')`

### 收口后

改为统一调用：

- `window.GameModules.localSettings?.readStored?.()`

## 四、为什么这一步有意义

这代表业务消费层开始逐步依赖：

- `window.GameModules.localSettings`

而不是依赖更底层、更平台化的：

- `window.GameModules.platform.core.storage.localSettingsSource`

这样后续若 browser / desktop / mobile 的底层存储实现变化，只需优先保持 `localSettings` 入口稳定，不必把变化扩散到业务消费层。

## 五、当前验证

已核对：

- `publish/local-settings.js` 仍作为统一本地设置入口，内部通过 `platform.core.storage.localSettingsSource` 读写
- `publish/ui-theme-actions.js` 启动阶段已改为调用 `window.GameModules.localSettings?.readStored?.()`

## 六、后续建议

下一步可继续沿同一策略排查：

1. 其他直接访问 `platform.core.storage.localSettingsSource` 的 UI/设置模块
2. 再逐步收口到 `window.GameModules.localSettings`
3. 保持“业务层依赖统一入口，平台层依赖具体 bridge”的结构原则
