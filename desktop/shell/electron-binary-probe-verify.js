import { createElectronBinaryProbe } from './electron-binary-probe.js';

export function verifyElectronBinaryProbe() {
  const probe = createElectronBinaryProbe();
  return {
    ...probe,
    checks: {
      ...probe.checks,
      stateShapeReady: typeof probe.electronDirPresent === 'boolean' && typeof probe.distDirPresent === 'boolean' && typeof probe.pathFilePresent === 'boolean',
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  process.stdout.write(`${JSON.stringify(verifyElectronBinaryProbe(), null, 2)}\n`);
}
