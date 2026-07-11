const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = path.resolve(process.cwd(), 'mobile', 'shell', 'android-wrapper-state-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'android-wrapper-state-report',
  'gradlew',
  'gradlew.bat',
  'gradle-wrapper.properties',
  'WRAPPER-HANDOFF.md',
  'WRAPPER-REPLACEMENT-GUIDE.md',
  'recommendedCommands'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['mobile/shell/android-wrapper-state-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'android-wrapper-state-report';
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'android-wrapper-state-report-verify',
  stage: 'android-wrapper-state-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'mobile/shell/android-wrapper-state-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
