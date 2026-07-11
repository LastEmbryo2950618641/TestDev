import { createSharedFilesCapabilityContractShape } from '../../publish/platform/files/shared-capability-contract.js';
import { createDesktopSharedFilesCapabilityContract } from './shared-files-capability-contract-entry.js';
import { createMobileSharedFilesCapabilityContract } from '../../mobile/shell/shared-files-capability-contract-entry.js';

export function verifySharedFilesCapabilityContractParity(target = globalThis) {
  const shape = createSharedFilesCapabilityContractShape();
  const desktop = createDesktopSharedFilesCapabilityContract(target);
  const mobile = createMobileSharedFilesCapabilityContract();

  return {
    shape,
    desktop,
    mobile,
    parity: {
      sameRuntimeFamily: desktop.runtimeFamily === mobile.runtimeFamily,
      shellLocalOnly: desktop.shellLocalOnly === true && mobile.shellLocalOnly === true,
      publishUntouched: desktop.publishTouched === false && mobile.publishTouched === false,
      sharedMethodShapePresent: Array.isArray(desktop.methods) && Array.isArray(mobile.methods),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifySharedFilesCapabilityContractParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
