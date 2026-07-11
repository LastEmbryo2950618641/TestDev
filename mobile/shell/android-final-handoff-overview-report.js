import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

function fileState(targetPath) {
  return {
    path: targetPath,
    present: fs.existsSync(targetPath),
  };
}

const overview = runJson('node', ['mobile/shell/android-webview-toolchain-overview-report.js']);
const unified = runJson('node', ['mobile/shell/multi-platform-handoff-overview-report.js']);
const apkState = runJson('node', ['mobile/shell/android-apk-output-state-report.js']);

const report = {
  runtimeFamily: 'android-final-handoff-overview-report',
  stage: 'android-final-handoff-overview-report',
  readiness: {
    mobileReadyForPackagingPrep: unified.platformSummary?.mobile?.readyForPackagingPrep === true,
    toolchainOverviewOk: overview.readiness?.buildPrepOk === true,
    buildEnvReady: overview.readiness?.buildEnvOk === true,
    localDraftReady: overview.readiness?.localDraftReady === true,
    buildAttemptRecordReady: overview.readiness?.buildAttemptRecordReady === true,
    apkOutputReady: apkState.summary?.debugApkReady === true,
    adbReady: apkState.adb?.present === true,
  },
  reports: {
    overview,
    unified: {
      mobile: unified.platformSummary?.mobile || {},
      summary: unified.summary || {},
    },
    apkState,
  },
  keyFiles: {
    checklist: fileState(path.resolve(process.cwd(), 'mobile', 'android-webview-shell', 'BUILD-LAUNCH-CHECKLIST.md')),
    handoff: fileState(path.resolve(process.cwd(), 'docs', 'architecture', 'android-toolchain-handoff-2026-07-12.md')),
    finalSummary: fileState(path.resolve(process.cwd(), 'docs', 'architecture', 'android-final-handoff-summary-2026-07-12.md')),
    wrapperGuide: fileState(path.resolve(process.cwd(), 'mobile', 'android-webview-shell', 'WRAPPER-HANDOFF.md')),
    attemptRecord: fileState(path.resolve(process.cwd(), 'mobile', 'android-webview-shell', '.last-build-attempt.json')),
    localDraft: fileState(path.resolve(process.cwd(), 'mobile', 'android-webview-shell', 'local.properties.generated')),
  },
  recommendedCommands: [
    'node mobile/shell/android-apk-output-state-report.js',
    'node mobile/shell/android-webview-toolchain-overview-report.js',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1',
    'powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-toolchain-flow.ps1'
  ],
  recommendedNextActions: overview.recommendedNextActions || [],
  blockers: overview.blockers || [],
};

report.ok = report.readiness.mobileReadyForPackagingPrep === true
  && report.readiness.toolchainOverviewOk === true
  && report.readiness.buildAttemptRecordReady === true
  && report.readiness.apkOutputReady === true
  && report.readiness.adbReady === true
  && report.blockers.length === 0;

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
