# Desktop Mobile Runtime Parity Map

## 目标
明确 desktop shell 与 mobile shell 当前 runtime 分层中：
- 哪些结构必须保持一致
- 哪些字段允许平台差异
- 后续真实宿主接入时优先复用哪些抽象层

## 当前共同层级
两端目前都已经具备以下分层：
1. bootstrap
2. runtime-binding
3. runtime-adapter
4. host-runner

这意味着后续真实接入时，优先复用的是“层级形状”和“阶段职责”，而不是强求字段名完全一致。

## 必须保持一致的抽象规则

### 1. Bootstrap 层
两端都必须继续提供：
- `runtime`
- `stage`
- `lifecycle`
- `window` 或等价容器描述
- `load`
- `assembly`

一致性要求：
- 都要以 manifest 方式输出
- 都要把平台 bridge assembly 放在 shell 层聚合
- 都不能直接把宿主实现写回共享 `publish/*`

### 2. Runtime Binding 层
两端都必须继续提供：
- `actions`
- `bindings`
- `checkpoints`
- `execution plan`

一致性要求：
- lifecycle 要被展开成顺序语义
- readiness 必须能被聚合判断
- binding 层必须承接 bootstrap manifest，而不是直接依赖业务主链

### 3. Runtime Adapter 层
两端都必须继续提供：
- `app` adapter
- 容器 adapter
- `renderer` adapter
- `ready`

一致性要求：
- app ready / shutdown 要独立表达
- 容器创建逻辑要与 renderer 加载逻辑分离
- renderer entry / load strategy 要能单独提取

### 4. Host Runner 层
两端都必须继续提供：
- 顺序 steps
- mock execution 或等价模拟输出
- renderer entry / expose namespace 可见输出

一致性要求：
- runner 必须是 shell-local
- runner 不能直接依赖真实宿主 API 才能运行
- runner 需要作为 future host integration 的过渡层

## 允许存在的平台差异

### Desktop 允许差异
- `main.js` / `preload.js` 额外存在
- `BrowserWindow` 概念存在
- `preloadPath` 存在
- `handshake` 独立存在
- `contextBridge` / `ipcRenderer` 是未来真实接入重点

### Mobile 允许差异
- 以 `webview` 作为主要容器
- 可能没有独立 `preload` 概念
- `AndroidWebView` / `Capacitor` 作为 future host factory
- `handshake` 当前可弱化，后续按需要补强

## 当前差异归类

### 差异属于“可接受平台差异”
- desktop adapter 使用 `window`
- mobile adapter 使用 `webview`
- desktop runner 有 `attach-preload-bridge`
- mobile runner 有 `attach-platform-bridge`

### 差异不应继续扩大
- 不要让 desktop 独有更多 runtime 层级而 mobile 不跟进
- 不要让 mobile 直接回到只写 bridge stub 的模式
- 不要在一端新增平台能力时绕过 binding/adapter/runner 链

## 后续真实接入建议
1. 真实 Electron 接入时，继续沿 desktop 的 binding -> adapter -> runner 替换。
2. 真实 APK 接入时，沿 mobile 的 binding -> adapter -> runner 替换。
3. 如果新增跨端共享 contract，应优先落在 bootstrap/binding/adapter 的共性字段，而不是 platform-specific hook 名称。
