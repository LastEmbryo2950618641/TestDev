// Desktop role-card-json export handshake example

export function createDesktopRoleCardJsonExportPlan() {
  return {
    consumer: 'role-card-json-export',
    requires: ['host', 'files'],
    fallback: 'platform.core.files.saveFile',
  };
}

export async function exportRoleCardJsonThroughDesktopHandshake(target = globalThis, options = {}) {
  const files = target?.window?.GameModules?.platform?.core?.files;
  const desktopFiles = target?.window?.GameModules?.platform?.core?.files;
  const host = target?.window?.GameModules?.platform?.core?.host;
  const bridgeReady = host?.capabilities?.(target)?.bridgeReady === true;
  const desktopChannelReady = desktopFiles?.capabilities?.(target)?.ready === true;
  if (bridgeReady && desktopChannelReady && typeof desktopFiles?.saveFile === 'function') {
    return desktopFiles.saveFile(options, target);
  }
  return files?.saveFile?.(options);
}
