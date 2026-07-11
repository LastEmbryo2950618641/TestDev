const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = path.resolve(process.cwd(), 'mobile', 'shell', 'android-final-handoff-overview-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'android-final-handoff-overview-report',
  'android-webview-toolchain-overview-report.js',
  'multi-platform-handoff-overview-report.js',
  'BUILD-LAUNCH-CHECKLIST.md',
  'android-toolchain-handoff-2026-07-12.md',
  'android-final-handoff-summary-2026-07-12.md',
  'WRAPPER-HANDOFF.md',
  'local.properties.generated',
  'recommendedCommands'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['mobile/shell/android-final-handoff-overview-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'android-final-handoff-overview-report';
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'android-final-handoff-overview-report-verify',
  stage: 'android-final-handoff-overview-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'mobile/shell/android-final-handoff-overview-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
