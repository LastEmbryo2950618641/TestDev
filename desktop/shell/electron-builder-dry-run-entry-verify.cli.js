import { verifyElectronBuilderDryRunEntry } from './electron-builder-dry-run-entry-verify.js';
const result = verifyElectronBuilderDryRunEntry();
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
