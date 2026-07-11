import path from 'node:path';
import { attemptDesktopElectronRealLaunch } from './electron-real-launch-attempt.js';

export async function verifyDesktopElectronLaunchArtifactShape() {
  const artifactPath = path.resolve(process.cwd(), 'desktop', 'shell', '.artifacts', 'attempt-launch-verify.json');
  const disabled = await attemptDesktopElectronRealLaunch({ enabled: false, artifactPath });

  return {
    disabled: {
      enabled: disabled.enabled,
      electronAvailable: disabled.electronAvailable,
      checks: disabled.checks,
      evidence: disabled.evidence,
      notes: disabled.notes,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = await verifyDesktopElectronLaunchArtifactShape();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
