const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = path.resolve(process.cwd(), 'mobile', 'shell', 'android-local-properties-materialization-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'android-local-properties-materialization-report',
  'android-local-properties-draft.js',
  'local.properties',
  'local.properties.generated',
  'materialize-android-local-properties.ps1',
  'recommendedCommands'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['mobile/shell/android-local-properties-materialization-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'android-local-properties-materialization-report';
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'android-local-properties-materialization-report-verify',
  stage: 'android-local-properties-materialization-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'mobile/shell/android-local-properties-materialization-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
