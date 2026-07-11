import fs from 'node:fs';
import path from 'node:path';
import { acquireElectronBinaryFromCache } from './electron-binary-acquire.js';

export async function verifyElectronBinaryAcquire() {
  const result = await acquireElectronBinaryFromCache();
  return {
    ...result,
    checks: {
      extracted: result.extracted === true,
      binaryPresent: fs.existsSync(path.resolve(result.binaryPath)),
      ready: result.ready === true,
      cachedZipPresent: fs.existsSync(path.resolve(result.cachedZipPath)),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  process.stdout.write(`${JSON.stringify(await verifyElectronBinaryAcquire(), null, 2)}\n`);
}
