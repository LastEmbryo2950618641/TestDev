import { createDesktopPlatformExecutionChecklist } from './platform-execution-checklist-entry.js';
import { createMobilePlatformExecutionChecklist } from '../../mobile/shell/platform-execution-checklist-entry.js';

export function verifyPlatformExecutionChecklistParity(target = globalThis) {
  const desktop = createDesktopPlatformExecutionChecklist(target);
  const mobile = createMobilePlatformExecutionChecklist();

  return {
    desktop,
    mobile,
    parity: {
      sameRuntimeFamily: desktop.runtimeFamily === mobile.runtimeFamily,
      shellLocalOnly: desktop.shellLocalOnly === true && mobile.shellLocalOnly === true,
      publishUntouched: desktop.publishTouched === false && mobile.publishTouched === false,
      stepsPresent: Array.isArray(desktop.steps) && Array.isArray(mobile.steps),
      evidencePresent: Boolean(desktop.evidence && mobile.evidence),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyPlatformExecutionChecklistParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
