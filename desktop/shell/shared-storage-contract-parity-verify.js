import { createSharedStorageRuntimeContractShape } from '../../publish/platform/storage/shared-runtime-contract.js';
import { createDesktopSharedStorageRuntimeContract } from './shared-storage-contract-entry.js';
import { createMobileSharedStorageRuntimeContract } from '../../mobile/shell/shared-storage-contract-entry.js';

export function verifySharedStorageRuntimeContractParity(target = globalThis) {
  const shape = createSharedStorageRuntimeContractShape();
  const desktop = createDesktopSharedStorageRuntimeContract(target);
  const mobile = createMobileSharedStorageRuntimeContract();

  return {
    shape,
    desktop,
    mobile,
    parity: {
      sameRuntimeFamily: desktop.runtimeFamily === mobile.runtimeFamily,
      shellLocalOnly: desktop.shellLocalOnly === true && mobile.shellLocalOnly === true,
      publishUntouched: desktop.publishTouched === false && mobile.publishTouched === false,
      sharedSourcesPresent: Boolean(
        Array.isArray(desktop.sources?.raw) &&
        Array.isArray(desktop.sources?.settings) &&
        Array.isArray(mobile.sources?.raw) &&
        Array.isArray(mobile.sources?.settings)
      ),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifySharedStorageRuntimeContractParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
