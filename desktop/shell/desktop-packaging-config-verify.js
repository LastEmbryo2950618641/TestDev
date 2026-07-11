import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDesktopPackagingConfig } from './desktop-packaging-config.js';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

export function verifyDesktopPackagingConfig() {
  const shellDir = resolveShellDir();
  const config = createDesktopPackagingConfig();
  const outputDir = config?.directories?.output || '';
  const appDir = config?.directories?.app || '';
  const buildResources = config?.directories?.buildResources || '';
  const files = Array.isArray(config?.files) ? config.files : [];

  return {
    runtimeFamily: 'desktop-packaging-config-verify',
    stage: 'desktop-packaging-config-verify',
    shellLocalOnly: true,
    config,
    checks: {
      appIdPresent: typeof config.appId === 'string' && config.appId.length > 0,
      productNamePresent: typeof config.productName === 'string' && config.productName.length > 0,
      appDirPresent: appDir === shellDir,
      outputDirPresent: typeof outputDir === 'string' && outputDir.length > 0,
      buildResourcesPresent: typeof buildResources === 'string' && buildResources.length > 0,
      bootstrapIncluded: files.includes('electron-main-bootstrap.cjs'),
      preloadIncluded: files.includes('electron-preload.js'),
      publishIncluded: files.some((item) => typeof item === 'object' && item?.to === 'publish'),
      winPortableTargetPresent: Array.isArray(config?.win?.target) && config.win.target.includes('portable'),
    },
  };
}
