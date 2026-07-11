// Desktop settings local-read handshake example

export function createDesktopSettingsLocalReadPlan() {
  return {
    consumer: 'settings-local-read',
    requires: ['host', 'storage'],
    fallback: 'platform.core.storage.localSettingsSource',
  };
}

export function readDesktopLocalSettings(target = globalThis, key = 'gamefy-local-settings-v1') {
  const source = target?.window?.GameModules?.platform?.core?.storage?.desktopBridge;
  const bridgeReady = target?.window?.GameModules?.platform?.core?.host?.capabilities?.(target)?.bridgeReady === true;
  if (bridgeReady && source?.readSettings) {
    return source.readSettings(key, target);
  }
  return target?.window?.GameModules?.platform?.core?.storage?.localSettingsSource?.read?.(key) || {};
}
