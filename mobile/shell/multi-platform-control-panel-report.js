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

const unifiedReadiness = runJson('node', ['publish/platform/unified-platform-readiness-report.js']);
const androidOverview = runJson('node', ['mobile/shell/android-webview-toolchain-overview-report.js']);
const desktopToolchain = safeRun('node', ['desktop/shell/desktop-packaging-toolchain-preflight.cli.js']);
const desktopDryRun = safeRun('node', ['desktop/shell/desktop-packaging-dry-run-plan.cli.js']);

const report = {
  runtimeFamily: 'multi-platform-control-panel-report',
  stage: 'multi-platform-control-panel-report',
  summary: {
    desktopReadyForPackagingPrep: unifiedReadiness.overall?.desktopReadyForPackagingPrep === true,
    mobileReadyForPackagingPrep: unifiedReadiness.overall?.mobileReadyForPackagingPrep === true,
    browserReadyForDirectUse: unifiedReadiness.overall?.browserReadyForDirectUse === true,
    recommendedFocus: unifiedReadiness.overall?.recommendedFocus || '',
  },
  browser: {
    readyForDirectUse: unifiedReadiness.platforms?.browser?.ready?.preflightReady === true,
    nextActions: unifiedReadiness.platforms?.browser?.ready?.nextActions || [],
    recommendedCommands: [
      'node publish/platform/browser-core-verify.js',
      'node publish/platform/unified-platform-verification-suite.js'
    ],
  },
  desktop: {
    readyForPackagingPrep: unifiedReadiness.platforms?.desktop?.ready?.preflightReady === true,
    nextActions: unifiedReadiness.platforms?.desktop?.ready?.nextActions || [],
    hostSpecificTasks: unifiedReadiness.platforms?.desktop?.ready?.hostSpecificTasks || [],
    toolchainPreflight: desktopToolchain,
    dryRunPlan: desktopDryRun,
    recommendedCommands: [
      'node desktop/shell/desktop-packaging-toolchain-preflight.cli.js',
      'node desktop/shell/desktop-packaging-dry-run-plan.cli.js',
      'node publish/platform/unified-platform-verification-suite.js'
    ],
  },
  mobile: {
    readyForPackagingPrep: unifiedReadiness.platforms?.mobile?.ready?.preflightReady === true,
    nextActions: unifiedReadiness.platforms?.mobile?.ready?.nextActions || [],
    hostSpecificTasks: unifiedReadiness.platforms?.mobile?.ready?.hostSpecificTasks || [],
    blockers: androidOverview.blockers || [],
    toolchainOverview: androidOverview,
    recommendedCommands: [
      'node mobile/shell/android-webview-toolchain-overview-report.js',
      'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-toolchain-flow.ps1',
      'node publish/platform/unified-platform-verification-suite.js'
    ],
  },
};

report.ok = report.summary.desktopReadyForPackagingPrep
  && report.summary.mobileReadyForPackagingPrep
  && report.summary.browserReadyForDirectUse;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
