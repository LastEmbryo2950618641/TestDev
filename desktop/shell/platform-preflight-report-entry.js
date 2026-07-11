import { createSharedPlatformPreflightReport } from '../../publish/platform/platform-preflight-report.js';
import { createDesktopPlatformCapabilityRegistry } from './platform-capability-registry-entry.js';

export function createDesktopPlatformPreflightReport(target = globalThis) {
  const registry = createDesktopPlatformCapabilityRegistry(target);
  return createSharedPlatformPreflightReport(registry);
}
