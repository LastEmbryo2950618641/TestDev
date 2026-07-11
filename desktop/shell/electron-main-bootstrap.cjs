const fs = require('node:fs');
const path = require('node:path');

const shellDir = __dirname;
const artifactsDir = path.resolve(shellDir, '.artifacts');
const logPath = path.resolve(artifactsDir, 'electron-bootstrap-entry.log');

fs.mkdirSync(artifactsDir, { recursive: true });
fs.appendFileSync(logPath, `${new Date().toISOString()} bootstrap-start argv=${JSON.stringify(process.argv)}\n`, 'utf8');

(async () => {
  try {
    await import('./electron-main.js');
    fs.appendFileSync(logPath, `${new Date().toISOString()} bootstrap-import-success\n`, 'utf8');
  } catch (error) {
    fs.appendFileSync(logPath, `${new Date().toISOString()} bootstrap-import-error ${String(error && error.stack ? error.stack : error)}\n`, 'utf8');
    throw error;
  }
})();
