import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const file = path.resolve(process.cwd(), 'mobile', 'shell', 'android-assembly-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'android-assembly-report',
  'android-webview-shell',
  'sync-materialization',
  'file:///android_asset/publish/index.html',
  'mobile/shell/android-wrapper-state-report.js',
  'mobile/shell/android-webview-build-env-report.js',
  'mobile/shell/android-webview-toolchain-overview-report.js',
  'mobile/shell/android-webview-shell-project-draft-verify.js',
  'mobile/shell/android-webview-asset-sync-verify.js',
  'includedPaths',
  'freshness',
  'nextActions'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
let parsed = null;
try {
  const output = execFileSync('node', ['mobile/shell/android-assembly-report.js'], { encoding: 'utf8' }).trim();
  parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'android-assembly-report'
    && parsed.hostKind === 'mobile'
    && parsed.assemblyMode === 'sync-materialization'
    && parsed.sourceRoot === 'publish'
    && parsed.runtimeEntry === 'file:///android_asset/publish/index.html';
  if (!runtimeOk) runtimeError = 'unexpected-report-shape';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'android-assembly-report-verify',
  stage: 'android-assembly-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'mobile/shell/android-assembly-report.js',
  missing,
  runtimeOk,
  runtimeError,
  sample: parsed,
}, null, 2) + '\n');
