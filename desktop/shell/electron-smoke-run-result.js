// Desktop Electron smoke-run result skeleton
// Defines where a first real Electron smoke-run outcome should be recorded.

export function createDesktopElectronSmokeRunResultSkeleton() {
  return {
    runtimeFamily: 'desktop-electron-smoke-run-result',
    stage: 'desktop-electron-smoke-run-result-skeleton',
    shellLocalOnly: true,
    outcome: 'pending',
    checks: {
      windowCreated: false,
      preloadExposed: false,
      rendererLoaded: false,
    },
    notes: [],
  };
}
