import { createDesktopSharedHostRuntimeContract } from './shared-runtime-contract-entry.js';

const contract = createDesktopSharedHostRuntimeContract(globalThis);
process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'desktop-shared-runtime-contract-verify',
  hostKind: contract.hostKind,
  bridgeNamespace: contract.bridge?.namespace || '',
  ready: contract.ready === true,
  checkpoints: contract.checkpoints || {},
}, null, 2)}\n`);
