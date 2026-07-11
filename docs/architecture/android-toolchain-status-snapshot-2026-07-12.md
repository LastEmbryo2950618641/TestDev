# Android Toolchain Status Snapshot (2026-07-12)

本文档用于固化 `mobile/android-webview-shell/` 当前在工具链层面的真实状态，避免后续协作者重复摸索“代码问题”和“环境问题”的边界。

## 一、当前总判断

截至当前状态：

1. Android WebView 宿主工程骨架已经存在
2. shared runtime 已可同步到 `app/src/main/assets/publish/`
3. JS 消费映射、bridge/storage 外形、build prep、build env、自检入口都已落地
4. 当前未完成点主要是外部工具链输入，而不是架构或 shared runtime 组织方式

## 二、已完成项

### 1. 宿主工程骨架

已存在：

- `build.gradle`
- `settings.gradle`
- `gradle.properties`
- `AndroidManifest.xml`
- `MainActivity.java`
- `AndroidBridgeBinder.java`
- `AppStorageAdapter.java`
- `app/src/main/assets/publish/index.html`

### 2. shared runtime 装配

已存在：

- `mobile/shell/android-webview-asset-sync.js`
- `mobile/android-webview-shell/.last-asset-sync.json`

当前状态：

- `publish/index.html`
- `publish/boot`
- `publish/assets`
- `publish/domain`
- `publish/ui`

均可同步到 Android assets。

### 3. bridge / JS 消费模型

已存在：

- `androidBridge.storage`
- `platformBridge.storage`
- `platformBridge.host`
- `platformBridge.capabilities`
- JS consumption map 报告与 verify

### 4. 工程预备与环境自检

已存在：

- `android-webview-build-prep-report.js`
- `android-webview-build-env-report.js`
- `BUILD-LAUNCH-CHECKLIST.md`
- `WRAPPER-HANDOFF.md`
- `run-android-webview-build-attempt.ps1`
- `.last-build-attempt.json`
- `local.properties.generated`

## 三、当前真实阻塞点

当前真正阻塞 Android shell 进入真实 Gradle 构建的点是：

1. `mobile/android-webview-shell/local.properties` 仍未生成正式文件
2. `sdk.dir` 尚未提供真实 Android SDK 路径
3. `gradlew` / `gradlew.bat` 仍是 placeholder
4. 尚未执行真实 `gradlew.bat tasks`

这几个阻塞点都属于外部工具链输入，不属于 shared runtime 架构问题。

## 四、当前证据

### 1. build env 报告

当前应重点参考：

- `node mobile/shell/android-webview-build-env-report.js`

当前已知结论：

- Java runtime 可用
- `local.properties` 不存在
- runtime assets 已同步
- wrapper 仍为 placeholder

### 2. build attempt 记录

当前应重点参考：

- `mobile/android-webview-shell/.last-build-attempt.json`

当前已知状态：

- `status = placeholder-wrapper`
- `runTasksRequested = false`

### 3. local.properties 草案

当前应重点参考：

- `mobile/android-webview-shell/local.properties.generated`

当前已知状态：

- 草案文件已生成
- `sdk.dir=` 仍为空

## 五、下一步最推荐顺序

1. 用真实 Android SDK 路径填充 `local.properties`
2. 替换 placeholder `gradlew` / `gradlew.bat`
3. 运行 `powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1`
4. 若状态变为 `ready-for-wrapper-command`，再带 `-RunTasks` 执行一次 `gradlew.bat tasks`
5. 记录并保留新的 `.last-build-attempt.json`

## 六、一句话结论

当前 Android 路线在代码结构、共享运行时装配、桥接外形、JS 消费模型和工具链自检层面已经基本铺平；最后未完成的核心问题，是本机 Android SDK 路径与真实 Gradle wrapper 仍未接入。
