import { createSharedPlatformExecutionChecklist } from '../../publish/platform/platform-execution-checklist.js';
import { createDesktopPlatformPackagingGapReport } from './platform-packaging-gap-report-entry.js';

export function createDesktopPlatformExecutionChecklist(target = globalThis) {
  const gapReport = createDesktopPlatformPackagingGapReport(target);
  return createSharedPlatformExecutionChecklist(gapReport);
}
