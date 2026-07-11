import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const file = path.resolve(process.cwd(), 'desktop', 'shell', 'desktop-assembly-report.js');
const source = fs.readFileSync(file, 'utf8');
const requiredPhrases = [
  'desktop-assembly-report',
  'desktop-electron-shell',
  'packaging-inclusion',
  'desktop/shell/desktop-packaging-overview-report.js',
  'desktop/shell/desktop-packaging-config.cli.js',
  'publish/index.html',
  'includedPaths',
  'freshness',
  'nextActions'
];
const missing = requiredPhrases.filter((item) => !source.includes(item));

let runtimeOk = false;
let runtimeError = '';
let parsed = null;
try {
  const output = execFileSync('node', ['desktop/shell/desktop-assembly-report.js'], { encoding: 'utf8' }).trim();
  parsed = JSON.parse(output);
  runtimeOk = parsed.runtimeFamily === 'desktop-assembly-report'
    && parsed.hostKind === 'desktop'
    && parsed.assemblyMode === 'packaging-inclusion'
    && parsed.sourceRoot === 'publish'
    && parsed.runtimeEntry === 'publish/index.html';
  if (!runtimeOk) runtimeError = 'unexpected-report-shape';
} catch (error) {
  runtimeError = String(error?.message || error);
}

process.stdout.write(JSON.stringify({
  runtimeFamily: 'desktop-assembly-report-verify',
  stage: 'desktop-assembly-report-verify',
  ok: missing.length === 0 && runtimeOk,
  file: 'desktop/shell/desktop-assembly-report.js',
  missing,
  runtimeOk,
  runtimeError,
  sample: parsed,
}, null, 2) + '\n');
