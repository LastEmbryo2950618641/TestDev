import fs from 'node:fs';
import path from 'node:path';

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return '';
  }
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

const shellRoot = path.resolve(process.cwd(), 'mobile', 'android-webview-shell');
const gradlew = path.resolve(shellRoot, 'gradlew');
const gradlewBat = path.resolve(shellRoot, 'gradlew.bat');
const wrapperProps = path.resolve(shellRoot, 'gradle', 'wrapper', 'gradle-wrapper.properties');
const handoff = path.resolve(shellRoot, 'WRAPPER-HANDOFF.md');
const guide = path.resolve(shellRoot, 'WRAPPER-REPLACEMENT-GUIDE.md');
const localProperties = path.resolve(shellRoot, 'local.properties');

const gradlewText = readText(gradlew);
const gradlewBatText = readText(gradlewBat);
const localPropertiesText = readText(localProperties);

const report = {
  runtimeFamily: 'android-wrapper-state-report',
  stage: 'android-wrapper-state-report',
  files: {
    gradlew: {
      path: gradlew,
      present: exists(gradlew),
      placeholderOnly: /placeholder/i.test(gradlewText),
      preview: gradlewText.slice(0, 160),
    },
    gradlewBat: {
      path: gradlewBat,
      present: exists(gradlewBat),
      placeholderOnly: /placeholder/i.test(gradlewBatText),
      preview: gradlewBatText.slice(0, 160),
    },
    wrapperProperties: {
      path: wrapperProps,
      present: exists(wrapperProps),
      preview: readText(wrapperProps).slice(0, 160),
    },
    handoff: {
      path: handoff,
      present: exists(handoff),
    },
    replacementGuide: {
      path: guide,
      present: exists(guide),
    },
    localProperties: {
      path: localProperties,
      present: exists(localProperties),
      configured: /sdk\.dir\s*=\s*.+/.test(localPropertiesText),
      preview: localPropertiesText.slice(0, 160),
    },
  },
  recommendedCommands: [
    'powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1 -RunTasks'
  ],
};

report.blockers = [
  !report.files.localProperties.present ? 'missing-local-properties' : null,
  !report.files.localProperties.configured ? 'missing-sdk-dir' : null,
  report.files.gradlew.placeholderOnly || report.files.gradlewBat.placeholderOnly ? 'placeholder-wrapper' : null,
].filter(Boolean);

report.ok = report.files.gradlew.present
  && report.files.gradlewBat.present
  && report.files.wrapperProperties.present
  && report.blockers.length === 0;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
