# Gradle Wrapper Replacement Guide

This guide is the operational version of `WRAPPER-HANDOFF.md`.

## Preconditions
- Java 17 is available
- `mobile/android-webview-shell/local.properties` exists and `sdk.dir` is filled
- `app/src/main/assets/publish/index.html` exists
- shared runtime sync has already been executed

## Replacement steps
1. Enter `mobile/android-webview-shell`
2. Replace placeholder `gradlew` and `gradlew.bat` with a real Gradle wrapper bootstrap
3. Confirm `gradle/wrapper/gradle-wrapper.properties` points to the intended Gradle distribution
4. Run `gradlew.bat tasks`
5. Record the result through `mobile/shell/run-android-webview-build-attempt.ps1 -RunTasks`

## Files that must change
- `gradlew`
- `gradlew.bat`
- optionally `gradle/wrapper/gradle-wrapper.properties`

## Files that should not change for wrapper setup alone
- `publish/`
- `mobile/shell/android-webview-asset-sync.js`
- `mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/MainActivity.java`
- `mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/bridge/AndroidBridgeBinder.java`

## Expected result after replacement
- `run-android-webview-build-attempt.ps1` no longer returns `placeholder-wrapper`
- `gradlew.bat tasks` becomes callable
- `.last-build-attempt.json` advances to a new status
