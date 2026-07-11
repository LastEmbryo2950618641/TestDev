const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = path.resolve(process.cwd(), 'mobile', 'shell', 'android-next-step-checklist-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'android-next-step-checklist-report',
  'android-blocker-matrix-report.js',
  'android-final-handoff-overview-report.js',
  'android-local-properties-materialization-report.js',
  'android-wrapper-state-report.js',
  'materialize-local-properties',
  'replace-wrapper',
  'run-gradle-tasks'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['mobile/shell/android-next-step-checklist-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'android-next-step-checklist-report' && Array.isArray(parsed.steps);
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'android-next-step-checklist-report-verify',
  stage: 'android-next-step-checklist-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'mobile/shell/android-next-step-checklist-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
