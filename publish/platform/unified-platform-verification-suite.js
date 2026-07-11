import { execFileSync } from 'node:child_process';

const VERIFY_STEPS = [
  { key: 'browserCore', label: 'Browser core verify', command: ['node', 'publish/platform/browser-core-verify.js'] },
  { key: 'desktopStorageBackend', label: 'Desktop storage backend verify', command: ['node', 'desktop/shell/electron-storage-backend-verify.js'] },
  { key: 'desktopStorageBridge', label: 'Desktop storage bridge verify', command: ['node', 'desktop/shell/desktop-storage-bridge-verify.js'] },
  { key: 'desktopPreloadExpose', label: 'Desktop preload expose verify', command: ['node', 'desktop/shell/electron-preload-expose-verify.js'] },
  { key: 'desktopShell', label: 'Desktop electron shell verify', command: ['node', 'desktop/shell/electron-shell-verify.js'] },
  { key: 'desktopAssembly', label: 'Desktop assembly verify', command: ['node', 'desktop/shell/assembly-entry-verify.js'] },
  { key: 'mobileStorageBackend', label: 'Mobile storage backend verify', command: ['node', 'mobile/shell/mobile-storage-backend-verify.js'] },
  { key: 'mobileStorageBridge', label: 'Mobile storage bridge verify', command: ['node', 'mobile/shell/mobile-storage-bridge-verify.js'] },
  { key: 'mobileLiveLikeArtifact', label: 'Mobile live-like artifact verify', command: ['node', 'mobile/shell/mobile-live-like-artifact-verify.js'] },
  { key: 'mobileWebViewShellConfig', label: 'Mobile Android WebView shell config verify', command: ['node', 'mobile/shell/android-webview-shell-config-verify.js'] },
  { key: 'mobileAssembly', label: 'Mobile assembly verify', command: ['node', 'mobile/shell/assembly-entry-verify.js'] },
  { key: 'mobileShellSnapshot', label: 'Mobile shell implementation snapshot verify', command: ['node', 'mobile/shell/mobile-shell-implementation-snapshot-verify.js'] },
  { key: 'mobileWebViewProjectDraft', label: 'Mobile Android WebView project draft verify', command: ['node', 'mobile/shell/android-webview-shell-project-draft-verify.js'] },
  { key: 'mobileWebViewProjectSkeleton', label: 'Mobile Android WebView project skeleton verify', command: ['node', 'mobile/shell/android-webview-shell-project-skeleton-verify.js'] },
  { key: 'mobileWebViewAssetSyncPlan', label: 'Mobile Android WebView asset sync plan verify', command: ['node', 'mobile/shell/android-webview-asset-sync-plan-verify.js'] },
  { key: 'mobileWebViewAssetSync', label: 'Mobile Android WebView asset sync verify', command: ['node', 'mobile/shell/android-webview-asset-sync-verify.js'] },
  { key: 'mobileWebViewBridgeContract', label: 'Mobile Android WebView bridge contract verify', command: ['node', 'mobile/shell/android-webview-bridge-contract-verify.js'] },
  { key: 'mobileWebViewProjectPreflight', label: 'Mobile Android WebView project preflight verify', command: ['node', 'mobile/shell/android-webview-project-preflight-verify.js'] },
  { key: 'mobileWebViewJsConsumptionMap', label: 'Mobile Android WebView JS consumption map verify', command: ['node', 'mobile/shell/android-webview-js-consumption-map-verify.js'] },
  { key: 'mobileWebViewBuildPrep', label: 'Mobile Android WebView build prep report verify', command: ['node', 'mobile/shell/android-webview-build-prep-report-verify.js'] },
  { key: 'mobileWebViewBuildEnv', label: 'Mobile Android WebView build env report verify', command: ['node', 'mobile/shell/android-webview-build-env-report-verify.js'] },
  { key: 'mobileWebViewBuildAttemptEntry', label: 'Mobile Android WebView build attempt entry report verify', command: ['node', 'mobile/shell/android-webview-build-attempt-entry-report-verify.js'] },
  { key: 'mobileWebViewLocalPropertiesDraft', label: 'Mobile Android local.properties draft verify', command: ['node', 'mobile/shell/android-local-properties-draft-verify.js'] },
  { key: 'mobileWebViewBuildAttemptRecord', label: 'Mobile Android WebView build attempt record verify', command: ['node', 'mobile/shell/android-webview-build-attempt-record-verify.js'] },
  { key: 'mobileWebViewToolchainDocs', label: 'Mobile Android toolchain docs verify', command: ['node', 'mobile/shell/android-toolchain-docs-verify.js'] },
  { key: 'mobileWebViewWrapperMaterializationTools', label: 'Mobile Android wrapper/materialization tools verify', command: ['node', 'mobile/shell/android-wrapper-materialization-tools-verify.js'] },
  { key: 'mobileWebViewToolchainOverview', label: 'Mobile Android toolchain overview verify', command: ['node', 'mobile/shell/android-webview-toolchain-overview-verify.js'] },
  { key: 'multiPlatformHandoffOverview', label: 'Multi-platform handoff overview verify', command: ['node', 'mobile/shell/multi-platform-handoff-overview-verify.js'] },
  { key: 'requirementAudit', label: 'Requirement audit verify', command: ['node', 'mobile/shell/requirement-audit-verify.js'] },
  { key: 'quickNavigation', label: 'Quick navigation verify', command: ['node', 'mobile/shell/quick-navigation-verify.js'] },
  { key: 'androidToolchainFlow', label: 'Android toolchain flow verify', command: ['node', 'mobile/shell/android-toolchain-flow-verify.js'] },
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  { key: 'androidExternalInputsManifest', label: 'Android external inputs manifest verify', command: ['node', 'mobile/shell/android-external-inputs-manifest-verify.js'] },
  { key: 'unifiedReadiness', label: 'Unified platform readiness report', command: ['node', 'publish/platform/unified-platform-readiness-report.js'] },
];

function runStep(step) {
  try {
    const stdout = execFileSync(step.command[0], step.command.slice(1), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const trimmed = String(stdout || '').trim();
    return {
      key: step.key,
      label: step.label,
      ok: true,
      command: step.command.join(' '),
      output: trimmed ? JSON.parse(trimmed) : null,
    };
  } catch (error) {
    return {
      key: step.key,
      label: step.label,
      ok: false,
      command: step.command.join(' '),
      error: String(error?.message || error),
      stdout: String(error?.stdout || '').trim(),
      stderr: String(error?.stderr || '').trim(),
    };
  }
}

const results = VERIFY_STEPS.map(runStep);
const failed = results.filter((item) => item.ok !== true);
const readiness = results.find((item) => item.key === 'unifiedReadiness' && item.ok)?.output?.readiness || {};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'unified-platform-verification-suite',
  stage: 'shared-desktop-mobile-browser-verification-suite',
  ok: failed.length === 0,
  total: results.length,
  failed: failed.map((item) => item.key),
  readiness,
  results,
}, null, 2)}\n`);







































