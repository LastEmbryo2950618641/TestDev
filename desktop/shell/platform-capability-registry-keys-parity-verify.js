import { createDesktopPlatformCapabilityRegistry } from './platform-capability-registry-entry.js';
import { createMobilePlatformCapabilityRegistry } from '../../mobile/shell/platform-capability-registry-entry.js';

export function verifyPlatformCapabilityRegistryWithKeysParity(target = globalThis) {
  const desktop = createDesktopPlatformCapabilityRegistry(target);
  const mobile = createMobilePlatformCapabilityRegistry();

  return {
    desktop,
    mobile,
    parity: {
      sameRuntimeFamily: desktop.runtimeFamily === mobile.runtimeFamily,
      desktopContractsPresent: Object.values(desktop.contracts || {}).every(Boolean),
      mobileContractsPresent: Object.values(mobile.contracts || {}).every(Boolean),
      shellLocalOnly: desktop.shellLocalOnly === true && mobile.shellLocalOnly === true,
      publishUntouched: desktop.publishTouched === false && mobile.publishTouched === false,
      keysPresent: Boolean(desktop.contracts?.keys && mobile.contracts?.keys),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyPlatformCapabilityRegistryWithKeysParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
