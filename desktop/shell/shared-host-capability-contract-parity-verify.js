import { createSharedHostCapabilityContractShape } from '../../publish/platform/host/shared-capability-contract.js';
import { createDesktopSharedHostCapabilityContract } from './shared-host-capability-contract-entry.js';
import { createMobileSharedHostCapabilityContract } from '../../mobile/shell/shared-host-capability-contract-entry.js';

export function verifySharedHostCapabilityContractParity(target = globalThis) {
  const shape = createSharedHostCapabilityContractShape();
  const desktop = createDesktopSharedHostCapabilityContract(target);
  const mobile = createMobileSharedHostCapabilityContract();

  return {
    shape,
    desktop,
    mobile,
    parity: {
      sameRuntimeFamily: desktop.runtimeFamily === mobile.runtimeFamily,
      shellLocalOnly: desktop.shellLocalOnly === true && mobile.shellLocalOnly === true,
      publishUntouched: desktop.publishTouched === false && mobile.publishTouched === false,
      sharedFeatureShapePresent: Boolean(desktop.features && mobile.features && desktop.bridge && mobile.bridge),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifySharedHostCapabilityContractParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
