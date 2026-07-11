import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function findSdkCandidates() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    process.env.ANDROID_SDK_ROOT || '',
    process.env.ANDROID_HOME || '',
    home ? path.join(home, 'AppData', 'Local', 'Android', 'Sdk') : '',
  ].filter(Boolean);

  const seen = new Set();
  return candidates.filter((item) => {
    const normalized = path.resolve(item);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).map((sdkDir) => ({
    sdkDir,
    exists: fs.existsSync(sdkDir),
  }));
}

export function createAndroidLocalPropertiesDraft() {
  const draftPath = 'mobile/android-webview-shell/local.properties.generated';
  const candidates = findSdkCandidates();
  const preferred = candidates.find((item) => item.exists)?.sdkDir || '';
  const lines = [
    '# Generated draft. Review before copying to local.properties.',
    `sdk.dir=${preferred.replace(/\\/g, '\\\\')}`,
  ];
  fs.writeFileSync(draftPath, `${lines.join('\n')}\n`);

  return {
    runtimeFamily: 'android-local-properties-draft',
    stage: 'android-local-properties-draft',
    draftPath,
    candidates,
    preferred,
    ready: preferred.length > 0,
  };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  process.stdout.write(`${JSON.stringify(createAndroidLocalPropertiesDraft(), null, 2)}\n`);
}
