import { createDesktopElectronControlledLaunchExecutor } from './electron-controlled-launch-executor.js';

export async function verifyElectronControlledLaunchExecutor() {
  const executor = await createDesktopElectronControlledLaunchExecutor();
  return {
    executor,
    checks: {
      plannedCallsPresent: Array.isArray(executor.plannedCalls),
      resultShapeReady: typeof executor.result?.checks?.windowCreated === 'boolean',
      executeModeKnown: typeof executor.executeMode === 'string',
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const output = await verifyElectronControlledLaunchExecutor();
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
