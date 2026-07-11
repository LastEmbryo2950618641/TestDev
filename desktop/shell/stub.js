// Desktop shell stub
// This file is a placeholder for a future desktop host entry.
// Shared gameplay runtime remains in publish/.

export const desktopShellStub = {
  target: 'windows-exe',
  sharedEntry: 'publish/index.html',
  runtime: 'web-core',
  status: 'stub',
  notes: [
    'Implement host-specific platform.core adapters here.',
    'Do not move gameplay logic into desktop shell.',
  ],
};
