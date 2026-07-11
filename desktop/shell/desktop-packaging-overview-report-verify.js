import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const file = path.resolve(process.cwd(), 'desktop', 'shell', 'desktop-packaging-overview-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'desktop-packaging-overview-report',
  'desktop/shell/desktop-packaging-preflight.js',
  'desktop/shell/desktop-packaging-toolchain-preflight.cli.js',
  'desktop/shell/desktop-packaging-dry-run-plan.cli.js',
  'desktop/shell/desktop-packaging-electron-dist-state.cli.js',
  'recommendedCommands',
  'desktopReadyForPackagingPrep',
  'desktop-electron-dist-missing'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['desktop/shell/desktop-packaging-overview-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'desktop-packaging-overview-report';
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'desktop-packaging-overview-report-verify',
  stage: 'desktop-packaging-overview-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'desktop/shell/desktop-packaging-overview-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
