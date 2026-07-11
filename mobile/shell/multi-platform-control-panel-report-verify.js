const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = path.join(process.cwd(), 'mobile', 'shell', 'multi-platform-control-panel-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'multi-platform-control-panel-report',
  'publish/platform/unified-platform-readiness-report.js',
  'mobile/shell/android-webview-toolchain-overview-report.js',
  'desktop/shell/desktop-packaging-toolchain-preflight.cli.js',
  'desktop/shell/desktop-packaging-dry-run-plan.cli.js',
  'recommendedCommands',
  'browserReadyForDirectUse',
  'mobileReadyForPackagingPrep',
  'desktopReadyForPackagingPrep'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['mobile/shell/multi-platform-control-panel-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'multi-platform-control-panel-report';
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'multi-platform-control-panel-report-verify',
  stage: 'multi-platform-control-panel-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'mobile/shell/multi-platform-control-panel-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
