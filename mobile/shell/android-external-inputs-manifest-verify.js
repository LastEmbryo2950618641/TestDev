const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = path.resolve(process.cwd(), 'mobile', 'shell', 'android-external-inputs-manifest.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'android-external-inputs-manifest',
  'android-final-handoff-overview-report.js',
  'android-next-step-checklist-report.js',
  'android-blocker-matrix-report.js',
  'android-sdk-path',
  'real-local-properties',
  'real-gradle-wrapper',
  'real-gradle-command-run'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['mobile/shell/android-external-inputs-manifest.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'android-external-inputs-manifest' && Array.isArray(parsed.inputs);
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'android-external-inputs-manifest-verify',
  stage: 'android-external-inputs-manifest-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'mobile/shell/android-external-inputs-manifest.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
