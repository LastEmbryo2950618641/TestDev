import { attachDesktopPlatformCore } from './assembly-entry.js';

function createMockDesktopTarget() {
  return {
    location: { hostname: '127.0.0.1' },
    electron: {
      invoke() {
        return null;
      },
    },
    GameModules: {},
  };
}

const target = createMockDesktopTarget();
const core = attachDesktopPlatformCore(target);

process.stdout.write(
  JSON.stringify(
    {
      runtimeFamily: 'desktop-platform-core-verify',
      attachments: target.GameModules?.platform?.desktop?.attachments || null,
      hostKind: core?.host?.kind?.() || null,
      filesReady: core?.files?.capabilities?.(target)?.ready === true,
      storageChannel: core?.storage?.desktopBridge?.channel?.(target) || null,
      assetsChannel: core?.assets?.bodyFigure?.channel?.(target) || null,
      keysChannel: core?.keys?.channel?.(target) || null,
    },
    null,
    2,
  ) + '\n',
);
