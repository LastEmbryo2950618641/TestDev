import { verifyDesktopPackagingDryRunPlan } from './desktop-packaging-dry-run-plan-verify.js';
const result = verifyDesktopPackagingDryRunPlan();
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
