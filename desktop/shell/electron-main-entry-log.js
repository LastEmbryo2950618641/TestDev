import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveLogPath() {
  const shellDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(shellDir, '.artifacts', 'electron-main-entry.log');
}

async function appendMainEntry(message) {
  const logPath = resolveLogPath();
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, `${new Date().toISOString()} ${message}\n`, 'utf8');
}

await appendMainEntry(`main-start argv=${JSON.stringify(process.argv)}`);
