import { createSharedHostRuntimeContractShape } from '../../publish/platform/host/shared-runtime-contract.js';
import { createDesktopSharedHostRuntimeContract } from './shared-runtime-contract-entry.js';
import { createMobileSharedHostRuntimeContract } from '../../mobile/shell/shared-runtime-contract-entry.js';

export function verifySharedHostRuntimeContractParity(target = globalThis) {
  const shape = createSharedHostRuntimeContractShape();
  const desktop = createDesktopSharedHostRuntimeContract(target);
  const mobile = createMobileSharedHostRuntimeContract(target);

  return {
    shape,
    desktop,
    mobile,
    parity: {
      sameRuntimeFamily: desktop.runtimeFamily === mobile.runtimeFamily,
      shellLocalOnly: desktop.shellLocalOnly === true && mobile.shellLocalOnly === true,
      publishUntouched: desktop.publishTouched === false && mobile.publishTouched === false,
      sharedFieldsPresent: Boolean(
        desktop.lifecycle &&
        desktop.view &&
        desktop.renderer &&
        desktop.bridge &&
        desktop.mapper &&
        mobile.lifecycle &&
        mobile.view &&
        mobile.renderer &&
        mobile.bridge &&
        mobile.mapper
      ),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifySharedHostRuntimeContractParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
