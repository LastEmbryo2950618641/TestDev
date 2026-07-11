import fs from 'node:fs';

const files = {
  rootBuild: 'mobile/android-webview-shell/build.gradle',
  settingsGradle: 'mobile/android-webview-shell/settings.gradle',
  gradleProperties: 'mobile/android-webview-shell/gradle.properties',
  wrapperProperties: 'mobile/android-webview-shell/gradle/wrapper/gradle-wrapper.properties',
  gradlew: 'mobile/android-webview-shell/gradlew',
  gradlewBat: 'mobile/android-webview-shell/gradlew.bat',
  localPropertiesExample: 'mobile/android-webview-shell/local.properties.example',
  appBuild: 'mobile/android-webview-shell/app/build.gradle',
  manifest: 'mobile/android-webview-shell/app/src/main/AndroidManifest.xml',
  mainActivity: 'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/MainActivity.java',
  bridgeBinder: 'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/bridge/AndroidBridgeBinder.java',
  storageAdapter: 'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/storage/AppStorageAdapter.java',
  runtimeEntry: 'mobile/android-webview-shell/app/src/main/assets/publish/index.html',
};

const appBuild = fs.existsSync(files.appBuild) ? fs.readFileSync(files.appBuild, 'utf8') : '';
const settingsGradle = fs.existsSync(files.settingsGradle) ? fs.readFileSync(files.settingsGradle, 'utf8') : '';
const gradleProperties = fs.existsSync(files.gradleProperties) ? fs.readFileSync(files.gradleProperties, 'utf8') : '';
const wrapperProperties = fs.existsSync(files.wrapperProperties) ? fs.readFileSync(files.wrapperProperties, 'utf8') : '';
const localPropertiesExample = fs.existsSync(files.localPropertiesExample) ? fs.readFileSync(files.localPropertiesExample, 'utf8') : '';

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-build-prep-report',
  stage: 'android-webview-build-prep-report',
  ok: Object.values(files).every((file) => fs.existsSync(file)),
  checks: {
    filesReady: Object.values(files).every((file) => fs.existsSync(file)),
    appPluginReady: appBuild.includes('com.android.application'),
    namespaceReady: appBuild.includes("namespace 'com.gamefy.shell'"),
    sdkReady: appBuild.includes('compileSdk 34') && appBuild.includes('targetSdk 34') && appBuild.includes('minSdk 26'),
    settingsIncludeReady: settingsGradle.includes("include(':app')"),
    gradleJvmReady: gradleProperties.includes('org.gradle.jvmargs'),
    wrapperReady: wrapperProperties.includes('distributionUrl=') && wrapperProperties.includes('gradle-8.7-bin.zip'),
    localPropertiesExampleReady: localPropertiesExample.includes('sdk.dir='),
  },
  buildCommands: [
    'copy local.properties.example to local.properties and fill sdk.dir',
    'replace placeholder gradlew/gradlew.bat with a real Gradle wrapper bootstrap',
    'run gradlew.bat tasks from mobile/android-webview-shell after Android toolchain setup',
  ],
  nextBuildInputs: [
    'android-sdk-path-or-local-properties',
    'real-gradle-wrapper-bootstrap',
    'android-studio-or-gradle-runtime',
    'real-shell-build-command-validation',
  ],
  files,
}, null, 2)}\n`);
