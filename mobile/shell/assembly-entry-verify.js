import { attachMobilePlatformCore } from './assembly-entry.js';

function createMockMobileTarget() {
  const target = {
    navigator: { userAgent: 'Android Test WebView' },
    GameModules: {},
  };
  target.window = target;
  return target;
}

const target = createMockMobileTarget();
const core = attachMobilePlatformCore(target);

process.stdout.write(
  JSON.stringify(
    {
      runtimeFamily: 'mobile-platform-core-verify',
      attachments: target.GameModules?.platform?.mobile?.attachments || null,
      hostKind: core?.host?.kind?.() || null,
      isMobile: core?.host?.isMobile?.() === true,
      hasStorageBridge: Boolean(core?.storage?.mobileBridge),
      hasBodyFigureBridge: Boolean(core?.assets?.bodyFigure),
      hasKeysBridge: Boolean(core?.keys),
    },
    null,
    2,
  ) + '\n',
);
