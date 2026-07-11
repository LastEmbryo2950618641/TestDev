import { createDesktopPlatformPreflightReport } from './platform-preflight-report-entry.js';
import { createMobilePlatformPreflightReport } from '../../mobile/shell/platform-preflight-report-entry.js';

export function verifyPlatformPreflightReportParity(target = globalThis) {
  const desktop = createDesktopPlatformPreflightReport(target);
  const mobile = createMobilePlatformPreflightReport();

  return {
    desktop,
    mobile,
    parity: {
      sameRuntimeFamily: desktop.runtimeFamily === mobile.runtimeFamily,
      shellLocalOnly: desktop.shellLocalOnly === true && mobile.shellLocalOnly === true,
      publishUntouched: desktop.publishTouched === false && mobile.publishTouched === false,
      readinessShapePresent: Boolean(desktop.readiness && mobile.readiness),
      missingShapePresent: Array.isArray(desktop.missing) && Array.isArray(mobile.missing),
      nextActionsPresent: Array.isArray(desktop.nextActions) && Array.isArray(mobile.nextActions),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyPlatformPreflightReportParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
