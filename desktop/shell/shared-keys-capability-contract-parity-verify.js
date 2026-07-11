import { createSharedKeysCapabilityContractShape } from '../../publish/platform/keys/shared-capability-contract.js';
import { createDesktopSharedKeysCapabilityContract } from './shared-keys-capability-contract-entry.js';
import { createMobileSharedKeysCapabilityContract } from '../../mobile/shell/shared-keys-capability-contract-entry.js';

export function verifySharedKeysCapabilityContractParity(target = globalThis) {
  const shape = createSharedKeysCapabilityContractShape();
  const desktop = createDesktopSharedKeysCapabilityContract(target);
  const mobile = createMobileSharedKeysCapabilityContract();

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
  const result = verifySharedKeysCapabilityContractParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
