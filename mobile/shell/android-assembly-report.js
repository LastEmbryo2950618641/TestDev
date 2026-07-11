import { execFileSync } from 'node:child_process';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

export function createAndroidAssemblyReport() {
  const wrapperState = runJson('node', ['mobile/shell/android-wrapper-state-report.js']);
  const buildEnv = runJson('node', ['mobile/shell/android-webview-build-env-report.js']);
  const toolchainOverview = runJson('node', ['mobile/shell/android-webview-toolchain-overview-report.js']);
  const projectDraft = runJson('node', ['mobile/shell/android-webview-shell-project-draft-verify.js']);
  const assetSync = runJson('node', ['mobile/shell/android-webview-asset-sync-verify.js']);

  const blockers = Array.from(new Set([
    ...(Array.isArray(wrapperState.blockers) ? wrapperState.blockers : []),
    ...(Array.isArray(toolchainOverview.blockers) ? toolchainOverview.blockers : []),
  ]));

  return {
    runtimeFamily: 'android-assembly-report',
    hostKind: 'mobile',
    shell: 'android-webview-shell',
    sourceRoot: 'publish',
    assemblyMode: 'sync-materialization',
    targetRuntimeRoot: 'mobile/android-webview-shell/app/src/main/assets/publish/',
    runtimeEntry: 'file:///android_asset/publish/index.html',
    includedPaths: [
      'publish/index.html',
      'publish/boot/',
      'publish/assets/',
      'publish/domain/',
      'publish/ui/',
    ],
    freshness: {
      mode: 'sync-parity-and-wrapper-readiness',
      ok: assetSync.ok === true,
      details: {
        syncOk: assetSync.checks?.syncOk === true,
        parityOk: assetSync.checks?.parityOk === true,
        persistedParityOk: assetSync.checks?.persistedParityOk === true,
        runtimeEntryReady: buildEnv.checks?.runtimeEntryReady === true,
      },
      staleRisk: assetSync.summary?.cleanStale === true
        ? 'reduced-when-clean-stale-is-used'
        : 'present-unless-clean-stale-is-run',
    },
    checks: {
      wrapperReady: wrapperState.ok === true,
      buildEnvReady: buildEnv.ok === true,
      toolchainOverviewReady: toolchainOverview.ok === true,
      projectDraftReady: projectDraft.ok === true,
      assetSyncReady: assetSync.ok === true,
      runtimeEntryReady: buildEnv.checks?.runtimeEntryReady === true,
      localPropertiesReady: buildEnv.checks?.localPropertiesPresent === true && buildEnv.checks?.localPropertiesConfigured === true,
    },
    blockers,
    evidence: {
      wrapperStateReport: 'mobile/shell/android-wrapper-state-report.js',
      buildEnvReport: 'mobile/shell/android-webview-build-env-report.js',
      toolchainOverviewReport: 'mobile/shell/android-webview-toolchain-overview-report.js',
      projectDraftVerify: 'mobile/shell/android-webview-shell-project-draft-verify.js',
      assetSyncVerify: 'mobile/shell/android-webview-asset-sync-verify.js',
      reports: {
        wrapperState,
        buildEnv,
        toolchainOverview,
        projectDraft,
        assetSync,
      },
    },
    nextActions: Array.isArray(toolchainOverview.recommendedNextActions)
      ? toolchainOverview.recommendedNextActions
      : [],
  };
}

const report = createAndroidAssemblyReport();
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
