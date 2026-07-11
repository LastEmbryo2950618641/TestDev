// Desktop role-card-json import-preview handshake example

export function createDesktopRoleCardJsonImportPreviewPlan() {
  return {
    consumer: 'role-card-json-import-preview',
    requires: ['host', 'files'],
    fallback: 'platform.core.files.pickFile/readJson',
  };
}

export async function importRoleCardJsonPreviewThroughDesktopHandshake(target = globalThis, options = {}) {
  const files = target?.window?.GameModules?.platform?.core?.files;
  const host = target?.window?.GameModules?.platform?.core?.host;
  const bridgeReady = host?.capabilities?.(target)?.bridgeReady === true;
  const desktopChannelReady = files?.capabilities?.(target)?.ready === true;
  if (bridgeReady && desktopChannelReady && typeof files?.pickFile === 'function' && typeof files?.readJson === 'function') {
    const file = await files.pickFile(options, target);
    if (!file) return null;
    return files.readJson(file, target);
  }
  const file = await files?.pickFile?.(options);
  if (!file) return null;
  return files?.readJson?.(file);
}
