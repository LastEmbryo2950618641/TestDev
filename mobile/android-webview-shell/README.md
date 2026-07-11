# Android WebView Shell

This directory is the Android host shell for the shared `publish/` runtime.

Rules:
- Do not copy gameplay logic into this directory.
- Keep host logic limited to WebView/container/bridge/storage wiring.
- Shared runtime assets should stay under `publish/` and be packaged into `app/src/main/assets/publish/`.

Current verified state:
- real Gradle wrapper is present and usable
- `gradlew.bat tasks` has been verified successfully
- `gradlew.bat assembleDebug` has been verified successfully
- debug APK output is present at `app/build/outputs/apk/debug/app-debug.apk`
- `adb.exe` is available from the local Android SDK, but no connected device was present during the latest verification

Asset sync:
- Run `node mobile/shell/android-webview-asset-sync.js` to copy the shared `publish/` runtime into `app/src/main/assets/publish/`.
- Verify with `node mobile/shell/android-webview-asset-sync-verify.js`.

Build verification:
- Review `node mobile/shell/android-webview-build-env-report.js`
- Review `node mobile/shell/android-wrapper-state-report.js`
- Run `powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1 -RunTasks`
- Run `gradlew.bat assembleDebug` from `mobile/android-webview-shell`

Current packaging evidence:
- APK: `mobile/android-webview-shell/app/build/outputs/apk/debug/app-debug.apk`
- Metadata: `mobile/android-webview-shell/app/build/outputs/apk/debug/output-metadata.json`

Principle:
- Build tooling and host packaging must adapt around the shared runtime layout.
- Do not move gameplay logic into the Android shell just to make packaging easier.