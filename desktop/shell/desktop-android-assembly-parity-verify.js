import { execFileSync } from 'node:child_process';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

const desktop = runJson('node', ['desktop/shell/desktop-assembly-report.js']);
const mobile = runJson('node', ['mobile/shell/android-assembly-report.js']);

const checks = {
  desktopRuntimeFamilyReady: desktop.runtimeFamily === 'desktop-assembly-report',
  mobileRuntimeFamilyReady: mobile.runtimeFamily === 'android-assembly-report',
  sourceRootAligned: desktop.sourceRoot === 'publish' && mobile.sourceRoot === 'publish' && desktop.sourceRoot === mobile.sourceRoot,
  desktopHostKindAllowed: desktop.hostKind === 'desktop',
  mobileHostKindAllowed: mobile.hostKind === 'mobile',
  desktopShellAllowed: desktop.shell === 'desktop-electron-shell',
  mobileShellAllowed: mobile.shell === 'android-webview-shell',
  desktopAssemblyModeAllowed: desktop.assemblyMode === 'packaging-inclusion',
  mobileAssemblyModeAllowed: mobile.assemblyMode === 'sync-materialization',
  desktopRuntimeEntryAllowed: desktop.runtimeEntry === 'publish/index.html',
  mobileRuntimeEntryAllowed: mobile.runtimeEntry === 'file:///android_asset/publish/index.html',
  desktopIncludedPathsReady: Array.isArray(desktop.includedPaths) && desktop.includedPaths.length > 0,
  mobileIncludedPathsReady: Array.isArray(mobile.includedPaths) && mobile.includedPaths.length > 0,
  desktopFreshnessShapeReady: isObject(desktop.freshness) && typeof desktop.freshness.ok === 'boolean' && typeof desktop.freshness.mode === 'string',
  mobileFreshnessShapeReady: isObject(mobile.freshness) && typeof mobile.freshness.ok === 'boolean' && typeof mobile.freshness.mode === 'string',
  desktopChecksShapeReady: isObject(desktop.checks),
  mobileChecksShapeReady: isObject(mobile.checks),
  desktopBlockersShapeReady: Array.isArray(desktop.blockers),
  mobileBlockersShapeReady: Array.isArray(mobile.blockers),
  desktopEvidenceShapeReady: isObject(desktop.evidence),
  mobileEvidenceShapeReady: isObject(mobile.evidence),
  desktopNextActionsShapeReady: Array.isArray(desktop.nextActions),
  mobileNextActionsShapeReady: Array.isArray(mobile.nextActions),
};

const report = {
  runtimeFamily: 'desktop-android-assembly-parity-verify',
  stage: 'desktop-android-assembly-parity-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    sharedSourceRoot: desktop.sourceRoot,
    desktopAssemblyMode: desktop.assemblyMode,
    mobileAssemblyMode: mobile.assemblyMode,
    desktopRuntimeEntry: desktop.runtimeEntry,
    mobileRuntimeEntry: mobile.runtimeEntry,
  },
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
