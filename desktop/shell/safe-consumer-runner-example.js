// Desktop safe-consumer handshake runner example
import { createDesktopHandshakePlan, runDesktopHandshake } from './handshake-example.js';
import { createDesktopSettingsLocalReadPlan } from './settings-local-read-example.js';
import { createDesktopRoleCardJsonExportPlan } from './role-card-json-export-example.js';
import { createDesktopRoleCardJsonImportPreviewPlan } from './role-card-json-import-preview-example.js';

export function createDesktopSafeConsumerRunnerPlan() {
  return {
    handshake: createDesktopHandshakePlan(),
    consumers: [
      createDesktopSettingsLocalReadPlan(),
      createDesktopRoleCardJsonExportPlan(),
      createDesktopRoleCardJsonImportPreviewPlan(),
    ],
  };
}

export function runDesktopSafeConsumerHandshake(target = globalThis) {
  const handshake = runDesktopHandshake(target);
  const plan = createDesktopSafeConsumerRunnerPlan();
  return {
    handshake,
    consumers: plan.consumers,
    ready: handshake.bridgeReady === true,
    fallback: handshake.plan?.fallback || 'browser-dev-path',
  };
}
