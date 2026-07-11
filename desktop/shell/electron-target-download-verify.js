import fs from 'node:fs';
import { downloadElectronTargetZip } from './electron-target-download.js';

export async function verifyElectronTargetDownload() {
  const result = await downloadElectronTargetZip();
  return {
    ...result,
    checks: {
      zipPresent: fs.existsSync(result.targetZipPath),
      checksumVerified: result.checksumVerified === true,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  process.stdout.write(`${JSON.stringify(await verifyElectronTargetDownload(), null, 2)}\n`);
}
