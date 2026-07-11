import { createSharedPlatformPackagingGapReport } from '../../publish/platform/platform-packaging-gap-report.js';
import { createMobilePlatformPreflightReport } from './platform-preflight-report-entry.js';

export function createMobilePlatformPackagingGapReport() {
  const preflight = createMobilePlatformPreflightReport();
  return createSharedPlatformPackagingGapReport(preflight);
}
