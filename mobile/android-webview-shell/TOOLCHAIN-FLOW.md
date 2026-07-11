# Android Toolchain Flow

统一执行入口：

- `powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-toolchain-flow.ps1`

可选参数：

- `-MaterializeLocalProperties`
- `-SdkDir "<真实SDK路径>"`
- `-RunTasks`

推荐顺序：

1. 先不带参数运行，查看 `overview` 与 `build-attempt` 当前状态
2. 有真实 SDK 路径后，再带 `-MaterializeLocalProperties -SdkDir "..."`
3. wrapper 替换完成后，再带 `-RunTasks`

注意：

- 该入口不会绕过现有 guard
- placeholder wrapper 存在时，build attempt 会明确停在 `placeholder-wrapper`
- 没有 `local.properties` 时，会明确停在 `missing-local-properties`
