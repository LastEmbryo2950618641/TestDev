import { createMobileLiveLikeArtifact } from './mobile-live-like-artifact.js';
import { createMobilePlatformPackagingGapReport } from './platform-packaging-gap-report-entry.js';
import { createAndroidWebViewShellConfigDraft } from './android-webview-shell-config-draft.js';

function createWebViewShellMapping(artifact, gapReport) {
  const configDraft = createAndroidWebViewShellConfigDraft();

  return {
    shell: 'android-webview-shell',
    hostKind: 'mobile',
    recommended: true,
    fit: 'prototype-first',
    runtime: {
      readyHook: artifact.evidence?.lifecycle?.readyHook || '',
      bootActions: artifact.evidence?.lifecycle?.bootActions || [],
      lifecycleMap: artifact.evidence?.lifecycle?.lifecycle || {},
      rendererEntry: artifact.evidence?.rendererEntry || '',
      loadStrategy: artifact.evidence?.loadStrategy || '',
      bridgeNamespace: artifact.evidence?.bridgeNamespace || '',
    },
    storage: {
      channel: artifact.evidence?.storageChannel || '',
      root: artifact.evidence?.storageRoot || null,
      hostPathReady: artifact.checks?.hostPathReady === true,
    },
    packaging: {
      hostSpecificTasks: gapReport.hostSpecificTasks || [],
      nextFocus: ['wire-webview-container', 'map-app-private-storage', 'connect-webview-lifecycle'],
    },
    configDraft,
  };
}

function createCapacitorShellMapping(artifact, gapReport) {
  return {
    shell: 'capacitor-shell',
    hostKind: 'mobile',
    recommended: false,
    fit: 'maintenance-first',
    runtime: {
      readyHook: artifact.evidence?.lifecycle?.readyHook || '',
      bootActions: artifact.evidence?.lifecycle?.bootActions || [],
      lifecycleMap: artifact.evidence?.lifecycle?.lifecycle || {},
      rendererEntry: artifact.evidence?.rendererEntry || '',
      loadStrategy: artifact.evidence?.loadStrategy || '',
      bridgeNamespace: artifact.evidence?.bridgeNamespace || '',
    },
    storage: {
      channel: artifact.evidence?.storageChannel || '',
      root: artifact.evidence?.storageRoot || null,
      hostPathReady: artifact.checks?.hostPathReady === true,
    },
    packaging: {
      hostSpecificTasks: gapReport.hostSpecificTasks || [],
      nextFocus: ['map-capacitor-filesystem', 'map-capacitor-lifecycle', 'wrap-bridge-as-plugin-boundary'],
    },
  };
}

export function createMobileShellMappingReport() {
  const artifact = createMobileLiveLikeArtifact();
  const gapReport = createMobilePlatformPackagingGapReport();

  return {
    runtimeFamily: 'mobile-shell-mapping-report',
    stage: 'mobile-shell-mapping-report',
    hostKind: 'mobile',
    artifactChecks: artifact.checks,
    shells: [
      createWebViewShellMapping(artifact, gapReport),
      createCapacitorShellMapping(artifact, gapReport),
    ],
    recommendation: {
      currentPreferredShell: 'android-webview-shell',
      reason: 'current live-like artifact already matches webview-load-url and androidBridge storage semantics',
      fallbackShell: 'capacitor-shell',
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const report = createMobileShellMappingReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

