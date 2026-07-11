import { createSharedFilesCapabilityContract } from './files/shared-capability-contract.js';

function createBrowserFilesCapabilities(target = globalThis) {
  const source = target?.GameModules?.platform?.core?.files || target?.window?.GameModules?.platform?.core?.files;
  return {
    ready: Boolean(source),
    canPickFile: typeof source?.pickFile === 'function',
    canSaveFile: typeof source?.saveFile === 'function',
    canReadText: typeof source?.readText === 'function',
    canWriteText: typeof source?.writeText === 'function',
    canReadJson: typeof source?.readJson === 'function',
    canWriteJson: typeof source?.writeJson === 'function',
  };
}

export function createBrowserSharedFilesCapabilityContract(target = globalThis) {
  const capabilities = createBrowserFilesCapabilities(target);
  const methods = ['readText', 'writeText', 'readJson', 'writeJson', 'pickFile', 'saveFile'];

  return createSharedFilesCapabilityContract({
    hostKind: 'browser',
    shellLocalOnly: false,
    publishTouched: true,
    channel: 'browser-files',
    capabilities,
    methods,
    fallback: {
      browserCore: 'window.GameModules.platform.core.files',
    },
    checkpoints: {
      capabilityShapeReady: typeof capabilities.ready === 'boolean',
      methodsReady: methods.length === 6,
      fallbackReady: true,
    },
  });
}
