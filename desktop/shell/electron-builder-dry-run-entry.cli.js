import { createElectronBuilderDryRunEntry } from './electron-builder-dry-run-entry.js';
const result = createElectronBuilderDryRunEntry();
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
