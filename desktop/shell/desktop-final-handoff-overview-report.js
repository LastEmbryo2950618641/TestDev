import { execFileSync } from 'node:child_process';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

const overview = runJson('node', ['desktop/shell/desktop-packaging-overview-report.js']);
const executionState = runJson('node', ['desktop/shell/desktop-packaging-execution-state-report.js']);
const evidenceArchive = runJson('node', ['desktop/shell/desktop-packaging-evidence-archive.js']);
const artifactStructure = runJson('node', ['desktop/shell/desktop-packaging-artifact-structure-report.js']);
const exeOutput = runJson('node', ['desktop/shell/desktop-exe-output-state-report.js']);
const runtimeOutput = runJson('node', ['desktop/shell/desktop-runtime-output-state-report.js']);

const report = {
  runtimeFamily: 'desktop-final-handoff-overview-report',
  stage: 'desktop-final-handoff-overview-report',
  readiness: {
    overviewOk: overview.ok === true,
    executionStateOk: executionState.ok === true,
    evidenceArchiveOk: evidenceArchive.ok === true,
    artifactStructureOk: artifactStructure.ok === true,
    exeOutputReady: exeOutput.ok === true,
    runtimeOutputReady: runtimeOutput.ok === true,
  },
  reports: {
    overview,
    executionState,
    evidenceArchive,
    artifactStructure,
    exeOutput,
    runtimeOutput,
  },
  summary: {
    desktopReadyForPackagingPrep: overview.readiness?.desktopReadyForPackagingPrep === true,
    preflightReady: overview.readiness?.preflightReady === true,
    dryRunReady: overview.readiness?.dryRunReady === true,
    artifactStructureReady: artifactStructure.ok === true,
    exeReady: exeOutput.summary?.anyDesktopExeReady === true,
    runtimeReady: runtimeOutput.summary?.liveWindowReady === true && runtimeOutput.summary?.rendererReady === true,
    rerunLogCount: evidenceArchive.rerunLogCount || 0,
    baselineCount: evidenceArchive.baselineCount || 0,
    archiveSnapshotPath: evidenceArchive.snapshotPath || '',
  },
  recommendedCommands: [
    'node desktop/shell/desktop-exe-output-state-report.js',
    'node desktop/shell/desktop-runtime-output-state-report.js',
    'node desktop/shell/desktop-packaging-overview-report.js',
    'node desktop/shell/desktop-packaging-execution-state-report.js',
    'node desktop/shell/desktop-packaging-evidence-archive.js',
    'node desktop/shell/desktop-packaging-artifact-structure-report.js'
  ],
};

report.blockers = [
  !report.readiness.overviewOk ? 'desktop-overview-not-ready' : null,
  !report.readiness.executionStateOk ? 'desktop-execution-state-not-ready' : null,
  !report.readiness.evidenceArchiveOk ? 'desktop-evidence-archive-not-ready' : null,
  !report.readiness.artifactStructureOk ? 'desktop-artifact-structure-not-ready' : null,
  !report.readiness.exeOutputReady ? 'desktop-exe-output-not-ready' : null,
  !report.readiness.runtimeOutputReady ? 'desktop-runtime-output-not-ready' : null,
].filter(Boolean);

report.ok = report.blockers.length === 0
  && report.summary.desktopReadyForPackagingPrep === true
  && report.summary.exeReady === true
  && report.summary.runtimeReady === true;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
