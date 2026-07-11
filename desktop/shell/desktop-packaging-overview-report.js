import { execFileSync } from 'node:child_process';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

function safeRun(command, args) {
  try {
    return { ok: true, output: runJson(command, args) };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error),
      stdout: String(error?.stdout || '').trim(),
      stderr: String(error?.stderr || '').trim(),
    };
  }
}

const preflight = runJson('node', ['desktop/shell/desktop-packaging-preflight.js']);
const toolchain = runJson('node', ['desktop/shell/desktop-packaging-toolchain-preflight.cli.js']);
const dryRunPlan = runJson('node', ['desktop/shell/desktop-packaging-dry-run-plan.cli.js']);
const configState = runJson('node', ['desktop/shell/desktop-packaging-electron-dist-state.cli.js']);
const useNoArtifactWrite = process.argv.includes('--no-artifact-write');
const unifiedArgs = useNoArtifactWrite
  ? ['publish/platform/unified-platform-readiness-report.js', '--no-artifact-write']
  : ['publish/platform/unified-platform-readiness-report.js'];
const unified = runJson('node', unifiedArgs);
const dryRunState = safeRun('node', ['desktop/shell/desktop-packaging-dry-run-plan-verify.cli.js']);

const report = {
  runtimeFamily: 'desktop-packaging-overview-report',
  stage: 'desktop-packaging-overview-report',
  readiness: {
    desktopReadyForPackagingPrep: unified.overall?.desktopReadyForPackagingPrep === true,
    preflightReady: Object.values(preflight.checks || {}).every(Boolean),
    toolchainReady: Array.isArray(toolchain.missing) && toolchain.missing.length === 0,
    dryRunReady: dryRunPlan.checks?.dryRunAvailable === true && dryRunPlan.checks?.configReady === true,
    electronDistReady: configState.main?.hasElectronDist === true || configState.minimal?.hasElectronDist === true,
  },
  reports: {
    preflight,
    toolchain,
    dryRunPlan,
    configState,
    dryRunState,
  },
  recommendedCommands: [
    'node desktop/shell/desktop-packaging-preflight.js',
    'node desktop/shell/desktop-packaging-toolchain-preflight.cli.js',
    'node desktop/shell/desktop-packaging-dry-run-plan.cli.js',
    'node desktop/shell/desktop-packaging-electron-dist-state.cli.js'
  ],
};

report.blockers = [
  !report.readiness.preflightReady ? 'desktop-preflight-incomplete' : null,
  !report.readiness.toolchainReady ? 'desktop-toolchain-missing' : null,
  !report.readiness.dryRunReady ? 'desktop-dry-run-unavailable' : null,
  !report.readiness.electronDistReady ? 'desktop-electron-dist-missing' : null,
].filter(Boolean);

report.ok = report.readiness.desktopReadyForPackagingPrep === true
  && report.blockers.length === 0;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
