import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const file = path.resolve(process.cwd(), 'desktop', 'shell', 'desktop-packaging-execution-state-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'desktop-packaging-execution-state-report',
  'desktop/shell/desktop-packaging-overview-report.js',
  'desktop/shell/electron-builder-dry-run-entry-verify.cli.js',
  'baseline-packaging-dry-run-plan.json',
  'baseline-packaging-toolchain.json',
  'baseline-packaging-config.json',
  'baseline-builder-dry-run-entry.json',
  'builder-rerun',
  'recommendedCommands'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['desktop/shell/desktop-packaging-execution-state-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'desktop-packaging-execution-state-report';
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'desktop-packaging-execution-state-report-verify',
  stage: 'desktop-packaging-execution-state-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'desktop/shell/desktop-packaging-execution-state-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
