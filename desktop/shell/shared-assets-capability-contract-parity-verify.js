import { createSharedAssetsCapabilityContractShape } from '../../publish/platform/assets-shared-capability-contract.js';
import { createDesktopSharedAssetsCapabilityContract } from './shared-assets-capability-contract-entry.js';
import { createMobileSharedAssetsCapabilityContract } from '../../mobile/shell/shared-assets-capability-contract-entry.js';

export function verifySharedAssetsCapabilityContractParity(target = globalThis) {
  const shape = createSharedAssetsCapabilityContractShape();
  const desktop = createDesktopSharedAssetsCapabilityContract(target);
  const mobile = createMobileSharedAssetsCapabilityContract();

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
  const result = verifySharedAssetsCapabilityContractParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
