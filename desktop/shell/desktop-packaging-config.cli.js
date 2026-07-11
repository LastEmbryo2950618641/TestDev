import { createDesktopPackagingConfig } from './desktop-packaging-config.js';
const result = createDesktopPackagingConfig();
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
