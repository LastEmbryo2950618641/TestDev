# Android Live Toolchain Runbook (2026-07-12)

这份 runbook 只服务一个目标：

在不继续重构代码结构的前提下，把当前 Android `apk` 路线从“准备就绪”推进到“真实 Gradle 命令可执行”。

## 一、执行前提

在开始前，先接受当前事实：

1. shared runtime 与 Android 壳结构已经准备好
2. 当前真正 blocker 只剩外部工具链输入
3. 不要再继续改 `publish/` 或 Android bridge 结构来“试图绕过” SDK / wrapper 问题

## 二、当前三个 blocker

1. `missing-local-properties`
2. `missing-sdk-dir`
3. `placeholder-wrapper`

## 三、最短执行顺序

严格按这个顺序做，不要跳步：

### Step 1. 确认当前状态

先运行：

- `node mobile/shell/android-final-handoff-overview-report.js`
- `node mobile/shell/android-blocker-matrix-report.js`

目标：

- 确认 blocker 仍是当前三项
- 确认没有出现新的结构性问题

### Step 2. 生成 / 检查 local properties 草稿

运行：

- `node mobile/shell/android-local-properties-draft.js`
- `node mobile/shell/android-local-properties-materialization-report.js`

目标：

- 确认 `local.properties.generated` 已生成
- 确认当前仍缺 `sdk.dir`

### Step 3. 物化正式 local.properties

运行：

- `powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"`

完成后再次运行：

- `node mobile/shell/android-local-properties-materialization-report.js`

通过标准：

- `target.present = true`
- `target.configured = true`

### Step 4. 替换 placeholder wrapper

替换以下文件：

- `mobile/android-webview-shell/gradlew`
- `mobile/android-webview-shell/gradlew.bat`

必要时一起确认：

- `mobile/android-webview-shell/gradle/wrapper/gradle-wrapper.properties`

完成后运行：

- `node mobile/shell/android-wrapper-state-report.js`

通过标准：

- `placeholder-wrapper` 不再出现

### Step 5. 执行最小 Gradle 命令

先运行：

- `powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1`

如果状态不再是 `placeholder-wrapper`，继续运行：

- `powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1 -RunTasks`

目标：

- 更新 `mobile/android-webview-shell/.last-build-attempt.json`
- 至少完成一次真实 `gradlew.bat tasks` 尝试

### Step 6. 做最终回看

运行：

- `node mobile/shell/android-execution-state-report.js`
- `node mobile/shell/android-final-handoff-overview-report.js`
- `node mobile/shell/android-toolchain-evidence-archive.js`
- `node mobile/shell/android-next-step-checklist-report.js`

目标：

- 确认 blocker 是否减少
- 固化新的证据归档快照
- 判断是否已从“准备态”进入“真实构建态”

## 四、执行中不要做的事

1. 不要修改 `publish/` 业务层来规避 wrapper 或 SDK 问题
2. 不要复制 shared gameplay 到 Android 壳目录
3. 不要在没有真实 wrapper 的前提下宣称 APK 已可构建
4. 不要跳过 Step 3 直接替换 wrapper 再跑 Gradle

## 五、权威入口

优先使用以下文件与脚本：

- `mobile/shell/android-final-handoff-overview-report.js`
- `mobile/shell/android-blocker-matrix-report.js`
- `mobile/shell/android-local-properties-materialization-report.js`
- `mobile/shell/android-wrapper-state-report.js`
- `mobile/shell/run-android-webview-build-attempt.ps1`
- `mobile/shell/android-toolchain-evidence-archive.js`

## 六、一句话结论

当前 Android 线已经不是结构改造问题，而是外部工具链接电问题。
后续执行应围绕 `sdk.dir`、正式 `local.properties`、真实 wrapper、`gradlew.bat tasks` 这四件事推进。
