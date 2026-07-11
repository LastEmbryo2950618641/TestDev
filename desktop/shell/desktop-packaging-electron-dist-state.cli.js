import { createDesktopPackagingConfig } from './desktop-packaging-config.js';
import { createDesktopMinimalPackagingConfig } from './desktop-minimal-packaging-config.js';

function summarizeConfig(config) {
  return {
    output: config.directories?.output ?? null,
    buildResources: config.directories?.buildResources ?? null,
    electronDist: config.electronDist ?? null,
    hasElectronDist: Boolean(config.electronDist),
    winTargets: config.win?.target ?? [],
    fileEntries: Array.isArray(config.files) ? config.files.length : 0,
  };
}

const mainConfig = createDesktopPackagingConfig();
const minimalConfig = createDesktopMinimalPackagingConfig();

process.stdout.write(
  JSON.stringify(
    {
      runtimeFamily: 'desktop-packaging-config-state',
      main: summarizeConfig(mainConfig),
      minimal: summarizeConfig(minimalConfig),
    },
    null,
    2,
  ) + '\n',
);
