import { execFileSync } from 'node:child_process';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  return JSON.parse(String(output || '').replace(/^\uFEFF/, '').trim());
}

const readiness = runJson('node', ['publish/platform/unified-platform-readiness-report.js']);
const androidOverview = runJson('node', ['mobile/shell/android-webview-toolchain-overview-report.js']);
const androidApk = runJson('node', ['mobile/shell/android-apk-output-state-report.js']);
const desktopExe = runJson('node', ['desktop/shell/desktop-exe-output-state-report.js']);
const desktopRuntime = runJson('node', ['desktop/shell/desktop-runtime-output-state-report.js']);

const summary = {
  runtimeFamily: 'multi-platform-handoff-overview-report',
  stage: 'multi-platform-handoff-overview-report',
  readiness: readiness.readiness,
  overall: readiness.overall,
  verification: {
    note: 'refer to publish/platform/unified-platform-verification-suite.js for the authoritative full verification run',
  },
  platformSummary: {
    desktop: {
      readyForPackagingPrep: readiness.platforms?.desktop?.ready?.preflightReady === true,
      exeReady: desktopExe.summary?.anyDesktopExeReady === true,
      runtimeReady: desktopRuntime.summary?.liveWindowReady === true && desktopRuntime.summary?.rendererReady === true,
      minimalExeReady: desktopExe.summary?.minimalExeReady === true,
      mainExeReady: desktopExe.summary?.mainExeReady === true,
      nextActions: readiness.platforms?.desktop?.ready?.nextActions || [],
      hostSpecificTasks: readiness.platforms?.desktop?.ready?.hostSpecificTasks || [],
      blockers: [...(desktopExe.blockers || []), ...(desktopRuntime.blockers || [])],
    },
    mobile: {
      readyForPackagingPrep: readiness.platforms?.mobile?.ready?.preflightReady === true,
      apkReady: androidApk.summary?.debugApkReady === true,
      installReady: androidApk.summary?.installReady === true,
      deviceReady: androidApk.summary?.deviceReady === true,
      nextActions: readiness.platforms?.mobile?.ready?.nextActions || [],
      hostSpecificTasks: readiness.platforms?.mobile?.ready?.hostSpecificTasks || [],
      blockers: [...(androidOverview.blockers || []), ...(androidApk.blockers || [])],
    },
    browser: {
      readyForDirectUse: readiness.platforms?.browser?.ready?.preflightReady === true,
      nextActions: readiness.platforms?.browser?.ready?.nextActions || [],
    },
  },
};

summary.artifacts = {
  desktopExe: desktopExe.summary || {},
  desktopRuntime: desktopRuntime.summary || {},
  androidApk: androidApk.summary || {},
};

summary.ok = summary.readiness?.desktop === true
  && summary.readiness?.mobile === true
  && summary.readiness?.browser === true;

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
