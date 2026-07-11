import path from 'node:path';
import { fileURLToPath } from 'node:url';
import baseConfig from './electron-builder.minimal.config.js';

const shellDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  ...baseConfig,
  electronDist: path.resolve(shellDir, 'node_modules', 'electron', 'dist'),
};
