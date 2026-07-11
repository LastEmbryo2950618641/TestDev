import { verifyDesktopPackagingConfig } from './desktop-packaging-config-verify.js';
const result = verifyDesktopPackagingConfig();
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
