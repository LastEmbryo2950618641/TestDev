import assert from 'node:assert/strict';
import { shouldLaunchDesktopWindow } from './electron-main.js';

assert.equal(shouldLaunchDesktopWindow({ versions: { electron: '36.9.5' } }), true);
assert.equal(shouldLaunchDesktopWindow({ versions: {} }), false);
assert.equal(shouldLaunchDesktopWindow({}), false);

console.log('PASS packaged Electron startup is enabled only inside Electron');
