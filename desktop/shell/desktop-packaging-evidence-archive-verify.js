import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const file = path.resolve(process.cwd(), 'desktop', 'shell', 'desktop-packaging-evidence-archive.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'desktop-packaging-evidence-archive',
  'desktop-packaging-overview-report.js',
  'desktop-packaging-execution-state-report.js',
  'electron-builder-dry-run-entry-verify.cli.js',
  'desktop-packaging-evidence-archive',
  'latest-desktop-packaging-evidence.json',
  'builder-rerun',
  'baseline-packaging-dry-run-plan.json'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['desktop/shell/desktop-packaging-evidence-archive.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'desktop-packaging-evidence-archive' && Boolean(parsed.snapshotPath);
  if (!runtimeOk) runtimeError = 'unexpected-archive-result';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'desktop-packaging-evidence-archive-verify',
  stage: 'desktop-packaging-evidence-archive-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'desktop/shell/desktop-packaging-evidence-archive.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
