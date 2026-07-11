const fs = require('fs');
const path = require('path');

const file = path.resolve(process.cwd(), 'docs', 'architecture', 'android-live-toolchain-runbook-2026-07-12.md');
const text = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'missing-local-properties',
  'missing-sdk-dir',
  'placeholder-wrapper',
  'android-final-handoff-overview-report.js',
  'android-blocker-matrix-report.js',
  'android-local-properties-materialization-report.js',
  'android-wrapper-state-report.js',
  'run-android-webview-build-attempt.ps1',
  'android-toolchain-evidence-archive.js',
  'gradlew.bat tasks'
];
const missing = requiredPhrases.filter((item) => !text.includes(item));

process.stdout.write(JSON.stringify({
  runtimeFamily: 'android-live-toolchain-runbook-verify',
  stage: 'android-live-toolchain-runbook-verify',
  ok: missing.length === 0,
  file: 'docs/architecture/android-live-toolchain-runbook-2026-07-12.md',
  missing,
}, null, 2) + '\n');
