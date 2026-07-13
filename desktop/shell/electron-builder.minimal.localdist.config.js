import path from 'node:path';
import { fileURLToPath } from 'node:url';
import baseConfig from './electron-builder.minimal.config.js';
import { resolveLocalElectronDist } from './desktop-packaging-paths.js';

const shellDir = path.dirname(fileURLToPath(import.meta.url));
const electronDist = resolveLocalElectronDist(shellDir);

export default {
  ...baseConfig,
  electronDist: electronDist || path.resolve(shellDir, 'node_modules', 'electron', 'dist'),
};
