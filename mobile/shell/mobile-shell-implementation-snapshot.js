import { createMobileShellMappingReport } from './mobile-shell-mapping-report.js';
import { createAndroidWebViewShellConfigDraft } from './android-webview-shell-config-draft.js';
import { createAndroidWebViewShellProjectDraft } from './android-webview-shell-project-draft.js';

export function createMobileShellImplementationSnapshot() {
  const mappingReport = createMobileShellMappingReport();
  const configDraft = createAndroidWebViewShellConfigDraft();
  const projectDraft = createAndroidWebViewShellProjectDraft();

  return {
    runtimeFamily: 'mobile-shell-implementation-snapshot',
    stage: 'mobile-shell-implementation-snapshot',
    hostKind: 'mobile',
    preferredShell: mappingReport.recommendation?.currentPreferredShell || 'android-webview-shell',
    fallbackShell: mappingReport.recommendation?.fallbackShell || 'capacitor-shell',
    artifactChecks: mappingReport.artifactChecks || {},
    implementationView: {
      app: configDraft.app,
      renderer: configDraft.renderer,
      bridge: configDraft.bridge,
      storage: configDraft.storage,
      lifecycle: configDraft.lifecycle,
      hostTasks: configDraft.hostTasks,
      projectDraft: {
        projectLayout: projectDraft.projectLayout,
        runtimeLayout: projectDraft.runtimeLayout,
        nativeEntryLayout: projectDraft.nativeEntryLayout,
        buildInputs: projectDraft.buildInputs,
        hostIntegrationTasks: projectDraft.hostIntegrationTasks,
      },
    },
    recommendation: mappingReport.recommendation,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const snapshot = createMobileShellImplementationSnapshot();
  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}

