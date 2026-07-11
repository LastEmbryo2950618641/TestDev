import { createDesktopPackagingDryRunPlan } from './desktop-packaging-dry-run-plan.js';
const result = createDesktopPackagingDryRunPlan();
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
