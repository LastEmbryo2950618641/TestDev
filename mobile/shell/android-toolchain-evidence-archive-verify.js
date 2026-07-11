const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = path.resolve(process.cwd(), 'mobile', 'shell', 'android-toolchain-evidence-archive.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'android-toolchain-evidence-archive',
  'android-webview-toolchain-overview-report.js',
  'android-execution-state-report.js',
  'android-final-handoff-overview-report.js',
  'latest-android-toolchain-evidence.json',
  'WRAPPER-HANDOFF.md',
  'BUILD-LAUNCH-CHECKLIST.md',
  'android-toolchain-status-snapshot-2026-07-12.md'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['mobile/shell/android-toolchain-evidence-archive.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'android-toolchain-evidence-archive' && Boolean(parsed.snapshotPath);
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'android-toolchain-evidence-archive-verify',
  stage: 'android-toolchain-evidence-archive-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'mobile/shell/android-toolchain-evidence-archive.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
