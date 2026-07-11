import { createDesktopElectronLiveAttemptResultLink } from './electron-live-attempt-result-link.js';

export async function verifyDesktopElectronLiveAttemptResultLink() {
  const link = await createDesktopElectronLiveAttemptResultLink();
  return {
    link,
    checks: {
      updateTargetKnown: typeof link.updateTarget === 'string' && link.updateTarget.length > 0,
      plannedCallsPresent: Array.isArray(link.plannedCalls),
      resultShapeReady: typeof link.result?.checks?.windowCreated === 'boolean',
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const output = await verifyDesktopElectronLiveAttemptResultLink();
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
