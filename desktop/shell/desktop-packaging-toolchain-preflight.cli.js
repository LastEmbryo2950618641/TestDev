import { createDesktopPackagingToolchainPreflight } from './desktop-packaging-toolchain-preflight.js';
const result = createDesktopPackagingToolchainPreflight();
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
