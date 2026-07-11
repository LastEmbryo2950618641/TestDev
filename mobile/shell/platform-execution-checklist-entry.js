import { createSharedPlatformExecutionChecklist } from '../../publish/platform/platform-execution-checklist.js';
import { createMobilePlatformPackagingGapReport } from './platform-packaging-gap-report-entry.js';

export function createMobilePlatformExecutionChecklist() {
  const gapReport = createMobilePlatformPackagingGapReport();
  return createSharedPlatformExecutionChecklist(gapReport);
}
