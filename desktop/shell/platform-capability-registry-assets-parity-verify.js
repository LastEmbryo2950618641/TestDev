import { createDesktopPlatformCapabilityRegistry } from './platform-capability-registry-entry.js';
import { createMobilePlatformCapabilityRegistry } from '../../mobile/shell/platform-capability-registry-entry.js';

export function verifyPlatformCapabilityRegistryWithAssetsParity(target = globalThis) {
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
      assetsPresent: Boolean(desktop.contracts?.assets && mobile.contracts?.assets),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyPlatformCapabilityRegistryWithAssetsParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
