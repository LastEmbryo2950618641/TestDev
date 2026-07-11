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

function listLogs(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .map((name) => {
      const fullPath = path.resolve(dirPath, name);
      const stat = fs.statSync(fullPath);
      return { name, size: stat.size, modifiedAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readTextEvidence(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
    return text ? {
      path: filePath,
      present: true,
      preview: text.slice(0, 160),
      length: text.length,
    } : null;
  } catch {
    return null;
  }
}

const shellDir = resolveShellDir();
const artifactsDir = path.resolve(shellDir, '.artifacts');
const rerunDir = path.resolve(artifactsDir, 'builder-rerun');
const distDir = path.resolve(shellDir, 'dist');
const distMinimalDir = path.resolve(shellDir, 'dist-minimal');

const overview = runJson('node', ['desktop/shell/desktop-packaging-overview-report.js']);
const dryRunEntry = runJson('node', ['desktop/shell/electron-builder-dry-run-entry-verify.cli.js']);
const baselinePlan = readTextEvidence(path.resolve(artifactsDir, 'baseline-packaging-dry-run-plan.json'));
const baselineToolchain = readTextEvidence(path.resolve(artifactsDir, 'baseline-packaging-toolchain.json'));
const baselineConfig = readTextEvidence(path.resolve(artifactsDir, 'baseline-packaging-config.json'));
const baselineEntry = readTextEvidence(path.resolve(artifactsDir, 'baseline-builder-dry-run-entry.json'));

const report = {
  runtimeFamily: 'desktop-packaging-execution-state-report',
  stage: 'desktop-packaging-execution-state-report',
  readiness: {
    overviewOk: overview.ok === true,
    builderEntryReady: dryRunEntry.checks?.readyForBuilderInstall === true,
    rerunLogsPresent: fs.existsSync(rerunDir) && listLogs(rerunDir).length > 0,
    distDirPresent: fs.existsSync(distDir),
    distMinimalDirPresent: fs.existsSync(distMinimalDir),
    baselinePlanPresent: !!baselinePlan,
    baselineToolchainPresent: !!baselineToolchain,
    baselineConfigPresent: !!baselineConfig,
    baselineEntryPresent: !!baselineEntry,
  },
  evidence: {
    overview,
    dryRunEntry,
    baselines: { plan: baselinePlan, toolchain: baselineToolchain, config: baselineConfig, entry: baselineEntry },
    rerunLogs: listLogs(rerunDir),
    dist: { distDir, distDirPresent: fs.existsSync(distDir), distMinimalDir, distMinimalDirPresent: fs.existsSync(distMinimalDir) },
  },
  recommendedCommands: [
    'node desktop/shell/desktop-packaging-overview-report.js',
    'node desktop/shell/electron-builder-dry-run-entry-verify.cli.js',
    'npx electron-builder --dir --config "desktop/shell/electron-builder.config.js"'
  ],
};

report.blockers = [
  !report.readiness.overviewOk ? 'desktop-overview-not-ready' : null,
  !report.readiness.builderEntryReady ? 'desktop-builder-entry-not-ready' : null,
  !report.readiness.rerunLogsPresent ? 'desktop-builder-rerun-logs-missing' : null,
  !report.readiness.baselinePlanPresent ? 'desktop-baseline-plan-missing' : null,
  !report.readiness.baselineToolchainPresent ? 'desktop-baseline-toolchain-missing' : null,
  !report.readiness.baselineConfigPresent ? 'desktop-baseline-config-missing' : null,
  !report.readiness.baselineEntryPresent ? 'desktop-baseline-entry-missing' : null,
].filter(Boolean);

report.ok = report.blockers.length === 0;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
