import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function tryExec(command, args = []) {
  try {
    const output = execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, output: String(output || '').trim() };
  } catch (error) {
    return {
      ok: false,
      output: String(error?.stdout || '').trim(),
      error: String(error?.message || error),
    };
  }
}

const localPropertiesPath = 'mobile/android-webview-shell/local.properties';
const localPropertiesExamplePath = 'mobile/android-webview-shell/local.properties.example';
const gradlewPath = 'mobile/android-webview-shell/gradlew';
const gradlewBatPath = 'mobile/android-webview-shell/gradlew.bat';
const wrapperPath = 'mobile/android-webview-shell/gradle/wrapper/gradle-wrapper.properties';
const runtimeEntryPath = 'mobile/android-webview-shell/app/src/main/assets/publish/index.html';

const javaCheck = tryExec('java', ['-version']);
const gradleCheck = tryExec('gradle', ['-v']);
const localProperties = fs.existsSync(localPropertiesPath) ? fs.readFileSync(localPropertiesPath, 'utf8') : '';
const localPropertiesExample = fs.existsSync(localPropertiesExamplePath) ? fs.readFileSync(localPropertiesExamplePath, 'utf8') : '';
const gradlewSource = fs.existsSync(gradlewPath) ? fs.readFileSync(gradlewPath, 'utf8') : '';
const gradlewBatSource = fs.existsSync(gradlewBatPath) ? fs.readFileSync(gradlewBatPath, 'utf8') : '';
const wrapperSource = fs.existsSync(wrapperPath) ? fs.readFileSync(wrapperPath, 'utf8') : '';

const report = {
  runtimeFamily: 'android-webview-build-env-report',
  stage: 'android-webview-build-env-report',
  checks: {
    javaReady: javaCheck.ok,
    gradleCliReady: gradleCheck.ok,
    localPropertiesPresent: fs.existsSync(localPropertiesPath),
    localPropertiesConfigured: /sdk\.dir\s*=\s*.+/.test(localProperties),
    localPropertiesExampleReady: localPropertiesExample.includes('sdk.dir='),
    wrapperPropertiesReady: wrapperSource.includes('distributionUrl='),
    gradlewPresent: fs.existsSync(gradlewPath),
    gradlewBatPresent: fs.existsSync(gradlewBatPath),
    runtimeEntryReady: fs.existsSync(runtimeEntryPath),
    placeholderWrapperOnly: gradlewSource.includes('placeholder') || gradlewBatSource.includes('placeholder'),
  },
  evidence: {
    java: javaCheck,
    gradle: gradleCheck,
    paths: {
      localPropertiesPath,
      wrapperPath,
      runtimeEntryPath,
    },
  },
  nextActions: [
    'copy local.properties.example to local.properties',
    'set sdk.dir to a real Android SDK path',
    'replace placeholder gradlew/gradlew.bat with a real wrapper bootstrap',
    'run gradlew.bat tasks inside mobile/android-webview-shell',
  ],
};

report.ok = report.checks.javaReady
  && report.checks.localPropertiesPresent
  && report.checks.localPropertiesConfigured
  && report.checks.wrapperPropertiesReady
  && report.checks.gradlewPresent
  && report.checks.gradlewBatPresent
  && report.checks.runtimeEntryReady
  && !report.checks.placeholderWrapperOnly;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
