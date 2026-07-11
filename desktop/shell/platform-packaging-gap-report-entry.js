import { createSharedPlatformPackagingGapReport } from '../../publish/platform/platform-packaging-gap-report.js';
import { createDesktopPlatformPreflightReport } from './platform-preflight-report-entry.js';

export function createDesktopPlatformPackagingGapReport(target = globalThis) {
  const preflight = createDesktopPlatformPreflightReport(target);
  return createSharedPlatformPackagingGapReport(preflight);
}
