import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const file = path.resolve(process.cwd(), 'desktop', 'shell', 'desktop-packaging-artifact-structure-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'desktop-packaging-artifact-structure-report',
  'Gamefy.exe',
  'electron-main-bootstrap.cjs',
  'electron-preload.js',
  'publish',
  'dist-minimal',
  'win-unpacked'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
try {
  const output = execFileSync('node', ['desktop/shell/desktop-packaging-artifact-structure-report.js'], { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'desktop-packaging-artifact-structure-report';
  if (!runtimeOk) runtimeError = 'unexpected-runtime-family';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'desktop-packaging-artifact-structure-report-verify',
  stage: 'desktop-packaging-artifact-structure-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'desktop/shell/desktop-packaging-artifact-structure-report.js',
  missing,
  runtimeOk,
  runtimeError,
}, null, 2) + '\n');
