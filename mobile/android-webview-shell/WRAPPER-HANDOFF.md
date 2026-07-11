# Gradle Wrapper Handoff

This document explains how to replace the placeholder Gradle wrapper files in `mobile/android-webview-shell/` with a real wrapper bootstrap.

## Why placeholders exist
- The current repository does not assume an Android SDK on every machine.
- The wrapper files are present only to reserve the expected file layout.
- Shared gameplay must stay in `publish/`; Android build tooling should adapt around that runtime.

## Replace these files when toolchain is ready
- `mobile/android-webview-shell/gradlew`
- `mobile/android-webview-shell/gradlew.bat`
- optionally refresh `mobile/android-webview-shell/gradle/wrapper/gradle-wrapper.properties`

## Recommended replacement flow
1. Ensure Java 17 is available
2. Configure `mobile/android-webview-shell/local.properties`
3. Open a terminal in `mobile/android-webview-shell`
4. Generate or copy a real Gradle wrapper bootstrap
5. Run `gradlew.bat tasks`
6. If successful, keep wrapper files under version control only if the project policy allows it

## Stop if
- `sdk.dir` is empty
- wrapper still prints the placeholder message
- Android assets were not synced from `publish/`
- build attempts would require moving shared gameplay into Android-specific directories

## Principle
A real wrapper should only enable the Android host shell build. It must not introduce a second gameplay runtime or duplicate the `publish/` application logic.
