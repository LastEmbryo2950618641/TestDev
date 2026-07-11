import { createSharedPlatformCapabilityRegistryWithAssetsAndKeys } from '../../publish/platform/shared-capability-registry.js';
import { createDesktopSharedHostRuntimeContract } from './shared-runtime-contract-entry.js';
import { createDesktopSharedStorageRuntimeContract } from './shared-storage-contract-entry.js';
import { createDesktopSharedHostCapabilityContract } from './shared-host-capability-contract-entry.js';
import { createDesktopSharedFilesCapabilityContract } from './shared-files-capability-contract-entry.js';
import { createDesktopSharedAssetsCapabilityContract } from './shared-assets-capability-contract-entry.js';
import { createDesktopSharedKeysCapabilityContract } from './shared-keys-capability-contract-entry.js';

export function createDesktopPlatformCapabilityRegistry(target = globalThis) {
  const runtime = createDesktopSharedHostRuntimeContract(target);
  const storage = createDesktopSharedStorageRuntimeContract(target);
  const host = createDesktopSharedHostCapabilityContract(target);
  const files = createDesktopSharedFilesCapabilityContract(target);
  const assets = createDesktopSharedAssetsCapabilityContract(target);
  const keys = createDesktopSharedKeysCapabilityContract(target);

  return createSharedPlatformCapabilityRegistryWithAssetsAndKeys({
    hostKind: 'desktop',
    runtime,
    storage,
    host,
    files,
    assets,
    keys,
  });
}
