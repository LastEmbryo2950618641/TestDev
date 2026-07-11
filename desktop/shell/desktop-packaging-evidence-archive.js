import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return '';
  }
}

function listFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).sort().map((name) => {
    const fullPath = path.resolve(dirPath, name);
    const stat = fs.statSync(fullPath);
    return {
      name,
      path: fullPath,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    };
  });
}

const shellDir = resolveShellDir();
const artifactsDir = path.resolve(shellDir, '.artifacts');
const archiveDir = path.resolve(artifactsDir, 'desktop-packaging-evidence-archive');
const rerunDir = path.resolve(artifactsDir, 'builder-rerun');
fs.mkdirSync(archiveDir, { recursive: true });

const overview = runJson('node', ['desktop/shell/desktop-packaging-overview-report.js']);
const executionState = runJson('node', ['desktop/shell/desktop-packaging-execution-state-report.js']);
const builderEntry = runJson('node', ['desktop/shell/electron-builder-dry-run-entry-verify.cli.js']);

const baselineFiles = [
  'baseline-packaging-dry-run-plan.json',
  'baseline-packaging-toolchain.json',
  'baseline-packaging-config.json',
  'baseline-builder-dry-run-entry.json',
];

const snapshot = {
  runtimeFamily: 'desktop-packaging-evidence-archive',
  stage: 'desktop-packaging-evidence-archive',
  generatedAt: new Date().toISOString(),
  overview,
  executionState,
  builderEntry,
  baselineFiles: baselineFiles.map((name) => {
    const fullPath = path.resolve(artifactsDir, name);
    const text = readText(fullPath);
    return {
      name,
      path: fullPath,
      present: Boolean(text),
      preview: text.slice(0, 200),
      length: text.length,
    };
  }),
  rerunLogs: listFiles(rerunDir),
};

const snapshotPath = path.resolve(archiveDir, 'latest-desktop-packaging-evidence.json');
fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'desktop-packaging-evidence-archive',
  stage: 'desktop-packaging-evidence-archive',
  ok: overview.ok === true && executionState.ok === true && builderEntry.checks?.readyForBuilderInstall === true,
  archiveDir,
  snapshotPath,
  rerunLogCount: snapshot.rerunLogs.length,
  baselineCount: snapshot.baselineFiles.filter((item) => item.present).length,
}, null, 2)}\n`);
