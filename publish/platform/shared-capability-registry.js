// Shared platform capability registry draft
// Aggregates shared contracts into one registry without collapsing their independent evolution.

export function createSharedPlatformCapabilityRegistry(input = {}) {
  const runtime = input.runtime || null;
  const storage = input.storage || null;
  const host = input.host || null;
  const files = input.files || null;

  return {
    runtimeFamily: 'platform-capability-registry',
    stage: 'shared-platform-capability-registry',
    hostKind: String(input.hostKind || runtime?.hostKind || storage?.hostKind || host?.hostKind || files?.hostKind || ''),
    shellLocalOnly: [runtime, storage, host, files].every((item) => item?.shellLocalOnly === true),
    publishTouched: [runtime, storage, host, files].some((item) => item?.publishTouched === true),
    contracts: {
      runtime,
      storage,
      host,
      files,
    },
    summary: {
      runtimeReady: runtime?.ready === true,
      storageReady: storage?.ready === true,
      hostReady: host?.ready === true,
      filesReady: files?.ready === true,
      rendererEntry: runtime?.renderer?.entry || '',
      storageChannel: storage?.channel || '',
      preferredBridge: host?.bridge?.preferred || '',
      filesChannel: files?.channel || '',
    },
    checkpoints: {
      runtimePresent: Boolean(runtime),
      storagePresent: Boolean(storage),
      hostPresent: Boolean(host),
      filesPresent: Boolean(files),
      hostKindAligned: Boolean(
        runtime?.hostKind &&
        storage?.hostKind &&
        host?.hostKind &&
        files?.hostKind &&
        runtime.hostKind === storage.hostKind &&
        storage.hostKind === host.hostKind &&
        host.hostKind === files.hostKind
      ),
    },
  };
}

export function createSharedPlatformCapabilityRegistryWithAssets(input = {}) {
  const registry = createSharedPlatformCapabilityRegistry(input);
  const assets = input.assets || null;
  return {
    ...registry,
    contracts: {
      ...registry.contracts,
      assets,
    },
    summary: {
      ...registry.summary,
      assetsReady: assets?.ready === true,
      assetsChannel: assets?.channel || '',
      assetBasePath: assets?.assetBasePath || '',
    },
    checkpoints: {
      ...registry.checkpoints,
      assetsPresent: Boolean(assets),
      hostKindAlignedWithAssets: Boolean(
        registry.hostKind &&
        assets?.hostKind &&
        registry.hostKind === assets.hostKind
      ),
    },
  };
}

export function createSharedPlatformCapabilityRegistryWithAssetsAndKeys(input = {}) {
  const registry = createSharedPlatformCapabilityRegistryWithAssets(input);
  const keys = input.keys || null;
  return {
    ...registry,
    contracts: {
      ...registry.contracts,
      keys,
    },
    summary: {
      ...registry.summary,
      keysReady: keys?.ready === true,
      keysChannel: keys?.channel || '',
    },
    checkpoints: {
      ...registry.checkpoints,
      keysPresent: Boolean(keys),
      hostKindAlignedWithKeys: Boolean(
        registry.hostKind &&
        keys?.hostKind &&
        registry.hostKind === keys.hostKind
      ),
    },
  };
}
