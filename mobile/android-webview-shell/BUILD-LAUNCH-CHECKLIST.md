# Android WebView Shell Build Launch Checklist

This checklist tracks the current verified launch/build state for the Android host shell.

## Goal
- Keep shared runtime in `publish/`
- Keep Android-specific work inside `mobile/android-webview-shell/`
- Verify toolchain readiness before running any real build or install command

## Current verified state
1. `local.properties` is present and points to a valid Android SDK path
2. real `gradlew` and `gradlew.bat` are present
3. Java 17 is available
4. `gradlew.bat tasks` has completed successfully
5. `gradlew.bat assembleDebug` has completed successfully
6. debug APK output exists at `app/build/outputs/apk/debug/app-debug.apk`

## Recommended validation order
1. Run `node mobile/shell/android-webview-build-env-report.js`
2. Run `node mobile/shell/android-wrapper-state-report.js`
3. Run `node publish/platform/unified-platform-verification-suite.js`
4. Run `gradlew.bat tasks` from `mobile/android-webview-shell`
5. Run `gradlew.bat assembleDebug` from `mobile/android-webview-shell`
6. If a device is connected, run `adb devices` and then `gradlew.bat installDebug`

## Current stop conditions
- `local.properties` missing or malformed
- Android SDK path invalid
- real Gradle wrapper missing
- Java runtime missing
- shared runtime assets not synced into `app/src/main/assets/publish/`
- no connected Android device when attempting `installDebug`

## Principle
Do not move gameplay logic into the Android shell just to satisfy build tooling. Build tooling must adapt to the shared runtime layout, not the other way around.