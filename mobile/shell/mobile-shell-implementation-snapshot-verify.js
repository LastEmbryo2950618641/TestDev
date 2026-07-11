import { createMobileShellImplementationSnapshot } from './mobile-shell-implementation-snapshot.js';

const snapshot = createMobileShellImplementationSnapshot();
const checks = {
  preferredShellReady: snapshot.preferredShell === 'android-webview-shell',
  fallbackShellReady: snapshot.fallbackShell === 'capacitor-shell',
  artifactChecksReady: Object.values(snapshot.artifactChecks || {}).every(Boolean),
  appReady: snapshot.implementationView?.app?.activity?.role === 'single-webview-host',
  rendererReady: snapshot.implementationView?.renderer?.loadStrategy === 'webview-load-url',
  storageReady: snapshot.implementationView?.storage?.channel === 'androidBridge',
  lifecycleReady: snapshot.implementationView?.lifecycle?.ready === 'webview-ready',
  hostTasksReady: Array.isArray(snapshot.implementationView?.hostTasks) && snapshot.implementationView.hostTasks.length >= 5,
  projectDraftReady: snapshot.implementationView?.projectDraft?.projectLayout?.projectRoot === 'mobile/android-webview-shell',
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'mobile-shell-implementation-snapshot-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    preferredShell: snapshot.preferredShell,
    packageName: snapshot.implementationView?.app?.packageName || '',
    rendererEntry: snapshot.implementationView?.renderer?.entry || '',
    bridgeNamespace: snapshot.implementationView?.bridge?.namespace || '',
  },
}, null, 2)}\n`);

