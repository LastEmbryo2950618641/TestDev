// Desktop handshake example
import { attachDesktopPlatformCore } from './assembly-example.js';

export function createDesktopHandshakePlan() {
  return {
    stage: 'desktop-handshake',
    mode: 'example',
    attachOrder: ['host', 'files', 'storage', 'assets', 'keys'],
    safeConsumers: ['role-card-json-export', 'role-card-json-import-preview', 'settings-local-read'],
    fallback: 'browser-dev-path',
  };
}

export function runDesktopHandshake(target = globalThis) {
  const plan = createDesktopHandshakePlan();
  const core = attachDesktopPlatformCore(target);
  return {
    plan,
    attached: true,
    hostKind: core.host?.kind?.() || '',
    bridgeReady: core.host?.capabilities?.(target)?.bridgeReady ?? false,
  };
}
