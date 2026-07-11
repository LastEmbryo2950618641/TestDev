import { createSharedPlatformCapabilityRegistryWithAssetsAndKeys } from '../../publish/platform/shared-capability-registry.js';
import { createMobileSharedHostRuntimeContract } from './shared-runtime-contract-entry.js';
import { createMobileSharedStorageRuntimeContract } from './shared-storage-contract-entry.js';
import { createMobileSharedHostCapabilityContract } from './shared-host-capability-contract-entry.js';
import { createMobileSharedFilesCapabilityContract } from './shared-files-capability-contract-entry.js';
import { createMobileSharedAssetsCapabilityContract } from './shared-assets-capability-contract-entry.js';
import { createMobileSharedKeysCapabilityContract } from './shared-keys-capability-contract-entry.js';

export function createMobilePlatformCapabilityRegistry() {
  const runtime = createMobileSharedHostRuntimeContract();
  const storage = createMobileSharedStorageRuntimeContract();
  const host = createMobileSharedHostCapabilityContract();
  const files = createMobileSharedFilesCapabilityContract();
  const assets = createMobileSharedAssetsCapabilityContract();
  const keys = createMobileSharedKeysCapabilityContract();

  return createSharedPlatformCapabilityRegistryWithAssetsAndKeys({
    hostKind: 'mobile',
    runtime,
    storage,
    host,
    files,
    assets,
    keys,
  });
}
