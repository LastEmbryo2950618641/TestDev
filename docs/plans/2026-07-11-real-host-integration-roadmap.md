# Real Host Integration Roadmap (2026-07-11)

## 目标
在不破坏当前 `publish/index.html` 浏览器运行链路的前提下，明确从“壳骨架 + bridge stub + assembly example”推进到真实桌面 / 移动宿主接入的分阶段顺序。

## 当前判断
### 结论
- 第一优先：Desktop first
- 第二优先：Mobile after desktop host path is proven

### 原因
1. 当前项目仍以本地静态开发服务器和浏览器链路为核心。
2. Windows `exe` 更容易先打通：
   - 文件系统
   - 宿主窗口
   - 本地存储
   - 导入导出链路
3. Android `apk` 受 WebView / 权限 / 文件访问 / bridge 生命周期影响更大，更适合在桌面壳路径验证后推进。

## 总体阶段
### Stage A: Desktop host proof
目标：建立第一条真实宿主链路，但不迁移玩法逻辑。

顺序：
1. `desktop host`
2. `desktop files`
3. `desktop storage`
4. `desktop assets`
5. `desktop keys`

最小验收：
- 能识别 `kind() === 'desktop'`
- 能从宿主层触发文件导入/导出
- 能提供桌面侧本地存储 fallback
- 不要求一次完成所有 bridge 域真实实现

### Stage B: Desktop shared runtime handshake
目标：验证桌面宿主可将 bridge 装配到共享 `platform.core.*`。

顺序：
1. 在桌面宿主启动流程中调用 `attachDesktopPlatformCore(...)`
2. 只让少量非玩法关键链路先消费桌面桥接
3. 保留浏览器/dev 现有路径作为兼容回退

最小验收：
- `platform.core.host` 能被真实桌面宿主接管
- `platform.core.files` 至少支持一个真实导入/导出链路
- 不影响现有浏览器开发链路

### Stage C: Mobile host proof
目标：建立第一条真实移动宿主链路。

顺序：
1. `mobile host`
2. `mobile storage`
3. `mobile files`
4. `mobile assets`
5. `mobile keys`

最小验收：
- 能识别 `kind() === 'mobile'`
- WebView / shell bridge ready 生命周期可控
- 至少有一条本地存储链路成立

### Stage D: Mobile shared runtime handshake
目标：验证移动宿主可将 bridge 装配到共享 `platform.core.*`。

顺序：
1. 在移动宿主启动流程中调用 `attachMobilePlatformCore(...)`
2. 先接 `host + storage`
3. 再按需要补 `files/assets/keys`

最小验收：
- `platform.core.host` 能被真实移动宿主接管
- `platform.core.storage` 至少能接住一条真实持久化路径
- 共享玩法主链不需要因移动端而改写

## 技术选择建议
### Desktop
- 第一阶段建议：Electron
- 第二阶段再评估：Tauri

原因：
- Electron 更适合尽快验证宿主桥接和文件能力。
- 待共享边界稳定后，再决定是否为了体积与分发迁到 Tauri。

### Mobile
- 第一阶段建议：Capacitor
- 备选快速原型：Android WebView 壳

原因：
- Capacitor 更接近当前共享 Web runtime 的长期方案。
- Android WebView 可用于快速验证，但不应自动视为长期工程结构。

## 明确不做的事
1. 不在宿主接入阶段大规模改写玩法模块。
2. 不把平台细节重新扩散回 `publish/` 业务文件。
3. 不要求 desktop/mobile 同时并行落真实宿主。
4. 不在桥接未稳定前提前切掉浏览器/dev 路径。

## 每阶段都必须保留的安全线
- 当前唯一真实运行入口仍是 `publish/index.html`
- 每次只接一个端、少量域
- 先 bridge / platform 边界，再考虑 UI 或玩法链路的宿主差异
- 每一轮真实接入都必须带验证文档
