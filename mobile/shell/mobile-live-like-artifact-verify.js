import path from 'node:path';
import { createMobileLiveLikeArtifact } from './mobile-live-like-artifact.js';

const artifact = createMobileLiveLikeArtifact({
  hostPaths: {
    appStorage: path.resolve(process.cwd(), 'mobile', 'shell', '.android-app-data', 'com.gamefy.shell'),
  },
  appId: 'com.gamefy.shell',
});

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'mobile-live-like-artifact-verify',
  ok: Object.values(artifact.checks || {}).every(Boolean),
  checks: artifact.checks,
  evidence: artifact.evidence,
}, null, 2)}\n`);
