import { createDesktopPlatformPackagingGapReport } from './platform-packaging-gap-report-entry.js';
import { createMobilePlatformPackagingGapReport } from '../../mobile/shell/platform-packaging-gap-report-entry.js';

export function verifyPlatformPackagingGapReportParity(target = globalThis) {
  const desktop = createDesktopPlatformPackagingGapReport(target);
  const mobile = createMobilePlatformPackagingGapReport();

  return {
    desktop,
    mobile,
    parity: {
      sameRuntimeFamily: desktop.runtimeFamily === mobile.runtimeFamily,
      shellLocalOnly: desktop.shellLocalOnly === true && mobile.shellLocalOnly === true,
      publishUntouched: desktop.publishTouched === false && mobile.publishTouched === false,
      gapsPresent: Array.isArray(desktop.gaps) && Array.isArray(mobile.gaps),
      prioritiesPresent: Array.isArray(desktop.priorities) && Array.isArray(mobile.priorities),
      hostSpecificTasksPresent: Array.isArray(desktop.hostSpecificTasks) && Array.isArray(mobile.hostSpecificTasks),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyPlatformPackagingGapReportParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
