import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const file = path.resolve(process.cwd(), 'mobile', 'shell', 'android-execution-state-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'android-execution-state-report',
  'android-webview-toolchain-overview-report.js',
  'android-local-properties-draft.js',
  'run-android-webview-build-attempt.ps1',
  'local.properties.generated',
  'gradlew.bat',
  'recommendedCommands'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['mobile/shell/android-execution-state-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'android-execution-state-report';
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'android-execution-state-report-verify',
  stage: 'android-execution-state-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'mobile/shell/android-execution-state-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
