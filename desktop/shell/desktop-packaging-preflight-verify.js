import { createDesktopPackagingPreflight } from './desktop-packaging-preflight.js';

export function verifyDesktopPackagingPreflight() {
  const result = createDesktopPackagingPreflight();
  return {
    ...result,
    checks: {
      ...result.checks,
      readyForPackagingPrep: Object.values(result.checks).every(Boolean),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  process.stdout.write(`${JSON.stringify(verifyDesktopPackagingPreflight(), null, 2)}\n`);
}
