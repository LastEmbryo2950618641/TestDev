import { createElectronLaunchPreview } from './electron-launch-preview.js';

export async function verifyElectronLaunchPreview() {
  const preview = await createElectronLaunchPreview();
  return {
    preview,
    checks: {
      previewShapeReady: Array.isArray(preview.plannedCalls),
      fallbackModeKnown: typeof preview.fallbackMode === 'string',
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = await verifyElectronLaunchPreview();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
