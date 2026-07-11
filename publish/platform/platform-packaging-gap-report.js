// Shared platform packaging gap report draft
// Turns preflight readiness into packaging-focused gap analysis for desktop and mobile hosts.

function buildGapPriorities(missing = []) {
  return missing.map((key, index) => ({
    key,
    priority: index + 1,
  }));
}

function buildHostTasks(hostKind, missing = []) {
  const tasks = [];
  if (hostKind === 'desktop') {
    tasks.push('wire-real-electron-main-and-preload');
    tasks.push('define-electron-packaging-config');
  }
  if (hostKind === 'mobile') {
    tasks.push('select-webview-or-capacitor-shell');
    tasks.push('define-android-packaging-config');
  }
  if (missing.includes('storage')) tasks.push('finish-persistent-storage-host-adapter');
  if (missing.includes('files')) tasks.push('finish-file-host-adapter');
  if (missing.includes('assets')) tasks.push('finish-asset-host-adapter');
  if (missing.includes('keys')) tasks.push('finish-key-host-adapter');
  return tasks;
}

export function createSharedPlatformPackagingGapReport(preflight = {}) {
  const missing = Array.isArray(preflight.missing) ? preflight.missing : [];
  const hostKind = String(preflight.hostKind || '');
  return {
    runtimeFamily: 'platform-packaging-gap-report',
    stage: 'shared-platform-packaging-gap-report',
    hostKind,
    shellLocalOnly: preflight.shellLocalOnly === true,
    publishTouched: preflight.publishTouched === true,
    readyForHostPackaging: preflight.readyForHostPackaging === true,
    readiness: preflight.readiness || {},
    gaps: missing,
    priorities: buildGapPriorities(missing),
    hostSpecificTasks: buildHostTasks(hostKind, missing),
    evidence: preflight.evidence || {},
  };
}
