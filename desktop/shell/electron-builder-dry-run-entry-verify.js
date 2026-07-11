import { createElectronBuilderDryRunEntry } from './electron-builder-dry-run-entry.js';

export function verifyElectronBuilderDryRunEntry() {
  const result = createElectronBuilderDryRunEntry();
  return {
    ...result,
    checks: {
      ...result.checks,
      readyForBuilderInstall: result.checks.recommendedBuilder === true && result.checks.builderConfigPresent === true,
    },
  };
}
