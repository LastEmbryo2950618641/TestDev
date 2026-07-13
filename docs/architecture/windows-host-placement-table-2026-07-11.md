# Windows Host Placement Table (2026-07-11)

本文档用于把当前 `desktop/shell` 已预留的 bridge 能力，进一步细化为“Windows 宿主落点表”，帮助后续协作者直接判断：

- 当前 desktop bridge 接口是什么
- 将来这些能力应落在哪类 Windows 宿主位置
- 哪些实现细节应留在 desktop bridge，不应暴露给 shared runtime

## 一、总体原则

当前 Windows 路线仍坚持：

1. shared runtime 继续保留在 `publish/`
2. `desktop/shell` 只负责 bridge、packaging、宿主能力接线
3. Windows 差异优先在 `host / files / storage / assets / keys` 五类 bridge 中吸收
4. shared gameplay、store、UI 逻辑不直接感知 Electron / Tauri / 原生桌面私有 API

## 二、当前 bridge 与宿主落点方向

### 1. host bridge

当前文件：

- `desktop/shell/bridge/host.js`

当前作用：

- 标识 desktop 宿主类型
- 提供宿主 ready / capability 语义
- 为 shared 层提供统一宿主判断入口

未来宿主落点方向：

- Electron 主进程 / preload 协作后的宿主 ready 信号
- 窗口生命周期
- 桌面运行环境识别（dev / packaged）
- 如后续需要，可增加深链接、窗口恢复、启动来源等上下文

bridge 层应负责：

- 把 Windows 宿主生命周期翻译成 shared runtime 能消费的统一接口

不应泄漏给 shared 层：

- Electron BrowserWindow 细节
- Tauri 窗口对象细节
- 原生桌面私有 API 名称

### 2. files bridge

当前文件：

- `desktop/shell/bridge/files.js`

当前作用：

- 为 shared 层预留统一文本/JSON 读写、文件选择、保存能力

未来宿主落点方向：

- 用户数据目录下的普通文本/JSON 读写
- 导入外部文件
- 导出到用户指定位置
- 与桌面文件系统交互相关的桥接点

bridge 层应负责：

- 统一 Electron / Tauri / 原生桌面文件读写能力
- 统一错误与路径校验语义
- 屏蔽不同宿主的文件选择、保存对话框细节

不应泄漏给 shared 层：

- 绝对路径拼接规则
- 宿主私有文件 API 名称
- 原始 Node/Electron/Tauri 文件调用方式

### 3. storage bridge

当前文件：

- `desktop/shell/bridge/storage.js`

当前状态：

- 已定义 channel：`electron / tauri / nativeBridge`
- 已定义 `raw` 与 `settings` 两类 source shape
- 具体实现仍为 draft

未来宿主落点方向：

- 角色状态、现实日志、其他原始存档的宿主落地层
- 本地设置的宿主落地层
- 与 shared `characterStateStore / realWorldLogStore / localSettings` 的最终衔接

bridge 层应负责：

- 将桌面宿主的原始存储能力统一成：
  - `readRaw / writeRaw / removeRaw`
  - `readSettings / writeSettings`
- 屏蔽底层究竟落在文件、SQLite、桌面 KV、原生容器还是其他方案

不应泄漏给 shared 层：

- Electron 侧文件/数据库的具体位置
- Tauri 侧插件或存储实现细节
- 原始宿主存储容器选择逻辑

### 4. assets bridge

当前文件：

- `desktop/shell/bridge/assets.js`

当前状态：

- 已定义 `bodyFigureRoot = assets/body-figures`
- 已定义 `loadIndex / saveMeta / saveImage` 能力形状
- 具体实现仍为 draft

未来宿主落点方向：

- 包内静态资源访问
- 用户可写缓存资源访问
- 身体资源索引、图片元数据、运行时图片写入
- 包内只读资源与用户目录可写资源的边界

bridge 层应负责：

- 统一 shared 层对 body figure / 静态资源的访问方式
- 区分“构建时打包资源”与“运行时生成资源”
- 统一桌面宿主的资源索引、元数据、图片写入流程

不应泄漏给 shared 层：

- Windows 实际资源根目录绝对路径
- 包内资源与用户目录资源的具体路径结构
- Electron / Tauri 资源解析差异

### 5. keys bridge

当前文件：

- `desktop/shell/bridge/keys.js`

当前状态：

- 已定义 channel：`electron / tauri / nativeBridge`
- 已定义 providerSources：
  - `secureStore`
  - `env`
  - `desktopFile`
- 具体读取实现仍为 draft

未来宿主落点方向：

- 桌面安全存储
- 环境变量
- 桌面本地配置文件

bridge 层应负责：

- 将不同桌面宿主的密钥/配置来源统一成稳定读取接口
- 屏蔽安全存储与环境变量的具体实现差异
- 保持 shared 层只关心“能否读取某 provider key”

不应泄漏给 shared 层：

- 密钥真实保存路径
- 环境变量名称细节
- 桌面安全存储初始化实现

## 三、当前推荐落点原则

当前更推荐的桌面宿主落点策略：

1. 玩法数据、状态、日志：优先通过 storage bridge 落到统一 raw/settings 宿主层
2. 包内静态资源：继续由 packaging config 打包，运行时通过 assets bridge 访问
3. 运行时生成资源：优先落在用户可写目录，通过 assets bridge 抽象访问
4. 密钥：优先考虑安全存储，其次环境变量或受控本地配置文件

## 四、推荐接线顺序

### 阶段 1：先补 storage / host

原因：

- 这两类决定最小桌面可运行宿主是否真正成立
- 共享 store 与宿主 ready 依赖最基础

### 阶段 2：再补 files / assets

原因：

- 文件和资源更容易与路径、构建、运行目录差异耦合
- 在 storage/host 稳定后接入更不容易返工

### 阶段 3：最后补 keys

原因：

- 密钥策略通常与最终交付、安全策略、打包模式关系更强
- 适合在运行链和资源链更稳定后继续收口

## 五、后续协作者检查点

在真正实现 desktop 宿主接线前，应先确认：

1. 改动是否仅发生在 `desktop/shell` 或平台桥接层
2. 是否没有把宿主私有 API 直接暴露给 shared runtime
3. 是否没有在 desktop 层分叉 shared gameplay
4. 是否与 `characterStateStore / realWorldLogStore / localSettings` 的统一入口兼容

## 六、当前阶段证据

当前可反复使用的基础证据：

```bash
node desktop/shell/assembly-entry-verify.js
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

这些证据当前足以证明：

- desktop bridge 主干已存在
- packaging config 主干已存在
- 当前 Windows 宿主落点表与现有 bridge 结构是对应的
