// Shared platform preflight report draft
// Consumes the platform capability registry and turns it into readiness, gaps, and next-action summaries.

function collectMissing(readiness = {}) {
  return Object.entries(readiness)
    .filter(([, value]) => value !== true)
    .map(([key]) => key);
}

function buildNextActions(hostKind, missing) {
  const actions = [];
  if (missing.includes('runtime')) actions.push('stabilize-host-runtime-entry');
  if (missing.includes('storage')) actions.push('implement-persistent-storage-bridge');
  if (missing.includes('files')) actions.push('implement-file-import-export-bridge');
  if (missing.includes('assets')) actions.push('implement-asset-index-and-save-bridge');
  if (missing.includes('keys')) actions.push('implement-secure-key-delivery-bridge');
  if (hostKind === 'desktop') actions.push('prepare-electron-host-integration');
  if (hostKind === 'mobile') actions.push('prepare-webview-or-capacitor-host-integration');
  if (hostKind === 'browser' && missing.length === 0) actions.push('stabilize-browser-direct-runtime');
  return actions;
}

function resolveHostPackagingReady(hostKind, registry, missing) {
  if (hostKind === 'browser') return false;
  return missing.length === 0 && registry.shellLocalOnly === true && registry.publishTouched === false;
}

function resolveDirectUseReady(hostKind, missing) {
  if (hostKind !== 'browser') return false;
  return missing.length === 0;
}

export function createSharedPlatformPreflightReport(registry = {}) {
  const summary = registry.summary || {};
  const hostKind = String(registry.hostKind || '');
  const readiness = {
    runtime: summary.runtimeReady === true,
    storage: summary.storageReady === true,
    host: summary.hostReady === true,
    files: summary.filesReady === true,
    assets: summary.assetsReady === true,
    keys: summary.keysReady === true,
  };
  const missing = collectMissing(readiness);
  const readyForHostPackaging = resolveHostPackagingReady(hostKind, registry, missing);
  const readyForDirectUse = resolveDirectUseReady(hostKind, missing);

  return {
    runtimeFamily: 'platform-preflight-report',
    stage: 'shared-platform-preflight-report',
    hostKind,
    shellLocalOnly: registry.shellLocalOnly === true,
    publishTouched: registry.publishTouched === true,
    readiness,
    missing,
    nextActions: buildNextActions(hostKind, missing),
    evidence: {
      rendererEntry: summary.rendererEntry || '',
      storageChannel: summary.storageChannel || '',
      preferredBridge: summary.preferredBridge || '',
      filesChannel: summary.filesChannel || '',
      assetsChannel: summary.assetsChannel || '',
      assetBasePath: summary.assetBasePath || '',
      keysChannel: summary.keysChannel || '',
    },
    readyForHostPackaging,
    readyForDirectUse,
  };
}
