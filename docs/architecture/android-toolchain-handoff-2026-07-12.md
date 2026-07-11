# Android Toolchain Handoff

这份文档面向下一位继续推进 Android `apk` 路线的协作者，目的只有一个：快速区分“代码已完成的部分”和“外部工具链仍缺的部分”。

## 已完成的代码层准备

1. Android WebView 宿主工程骨架已建立
2. shared runtime 已能同步到 `app/src/main/assets/publish/`
3. `MainActivity` 已明确加载 `file:///android_asset/publish/index.html`
4. Android bridge/storage 最小接口外形已存在
5. JS consumption map 已建立
6. build prep / build env / build attempt / build attempt record 证据链已建立

## 当前不要重复做的事

- 不要再复制 shared gameplay 到 Android 目录
- 不要再重新拆 platform bridge 结构
- 不要把 Android 私有 API 暴露回 `publish/` 业务层
- 不要绕开现有 verify 另写一套临时检查

## 当前真正要做的事

1. 提供真实 Android SDK 路径
2. 将 `local.properties.generated` 转化为正式 `local.properties`
3. 用真实 Gradle wrapper 替换 placeholder wrapper
4. 运行一次最小 Gradle 命令并更新 `.last-build-attempt.json`

## 关键参考文件

- `docs/architecture/android-toolchain-status-snapshot-2026-07-12.md`
- `mobile/android-webview-shell/BUILD-LAUNCH-CHECKLIST.md`
- `mobile/android-webview-shell/WRAPPER-HANDOFF.md`
- `mobile/shell/android-webview-build-env-report.js`
- `mobile/shell/run-android-webview-build-attempt.ps1`
- `mobile/android-webview-shell/.last-build-attempt.json`

## 当前结论

如果没有新的 Android SDK 路径与真实 Gradle wrapper，这条线继续往前推的收益会快速下降；当前最有效的下一步，是把外部工具链输入补齐，而不是继续重构代码结构。
