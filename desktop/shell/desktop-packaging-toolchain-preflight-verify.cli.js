import { verifyDesktopPackagingToolchainPreflight } from './desktop-packaging-toolchain-preflight-verify.js';
const result = verifyDesktopPackagingToolchainPreflight();
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
