import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const file = path.resolve(process.cwd(), 'desktop', 'shell', 'desktop-final-handoff-overview-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'desktop-final-handoff-overview-report',
  'desktop-packaging-overview-report.js',
  'desktop-packaging-execution-state-report.js',
  'desktop-packaging-evidence-archive.js',
  'desktop-packaging-artifact-structure-report.js',
  'archiveSnapshotPath',
  'recommendedCommands'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['desktop/shell/desktop-final-handoff-overview-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'desktop-final-handoff-overview-report' && typeof parsed.summary?.archiveSnapshotPath === 'string';
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'desktop-final-handoff-overview-report-verify',
  stage: 'desktop-final-handoff-overview-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'desktop/shell/desktop-final-handoff-overview-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
