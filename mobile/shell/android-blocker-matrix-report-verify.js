const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = path.resolve(process.cwd(), 'mobile', 'shell', 'android-blocker-matrix-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'android-blocker-matrix-report',
  'android-webview-toolchain-overview-report.js',
  'android-execution-state-report.js',
  'android-local-properties-materialization-report.js',
  'android-wrapper-state-report.js',
  'android-final-handoff-overview-report.js',
  'missing-local-properties',
  'missing-sdk-dir',
  'placeholder-wrapper'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['mobile/shell/android-blocker-matrix-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'android-blocker-matrix-report';
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'android-blocker-matrix-report-verify',
  stage: 'android-blocker-matrix-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'mobile/shell/android-blocker-matrix-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
