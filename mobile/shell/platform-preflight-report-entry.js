import { createSharedPlatformPreflightReport } from '../../publish/platform/platform-preflight-report.js';
import { createMobilePlatformCapabilityRegistry } from './platform-capability-registry-entry.js';

export function createMobilePlatformPreflightReport() {
  const registry = createMobilePlatformCapabilityRegistry();
  return createSharedPlatformPreflightReport(registry);
}
