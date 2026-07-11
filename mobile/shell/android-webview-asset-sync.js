import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAndroidWebViewAssetSyncPlan } from './android-webview-asset-sync-plan.js';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileTask(fromPath, toPath) {
  ensureDir(path.dirname(toPath));
  fs.copyFileSync(fromPath, toPath);
}

function copyDirectoryTask(fromPath, toPath) {
  ensureDir(toPath);
  for (const entry of fs.readdirSync(fromPath, { withFileTypes: true })) {
    const source = path.join(fromPath, entry.name);
    const target = path.join(toPath, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryTask(source, target);
    } else if (entry.isFile()) {
      copyFileTask(source, target);
    }
  }
}

export function syncAndroidWebViewAssets(options = {}) {
  const plan = createAndroidWebViewAssetSyncPlan(options);
  const copied = [];
  const skipped = [];

  for (const task of plan.copyPlan || []) {
    const fromPath = path.resolve(process.cwd(), task.from);
    const toPath = path.resolve(process.cwd(), task.to);

    if (!fs.existsSync(fromPath)) {
      skipped.push({ ...task, reason: 'missing-source' });
      continue;
    }

    const stat = fs.statSync(fromPath);
    if (stat.isDirectory()) {
      copyDirectoryTask(fromPath, toPath);
      copied.push({ ...task, kind: 'directory' });
      continue;
    }

    if (stat.isFile()) {
      copyFileTask(fromPath, toPath);
      copied.push({ ...task, kind: 'file' });
      continue;
    }

    skipped.push({ ...task, reason: 'unsupported-source-type' });
  }

  const result = {
    runtimeFamily: 'android-webview-asset-sync-result',
    ok: skipped.length === 0,
    plan,
    copied,
    skipped,
  };

  const resultPath = path.resolve(process.cwd(), 'mobile', 'android-webview-shell', '.last-asset-sync.json');
  ensureDir(path.dirname(resultPath));
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

  return result;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = syncAndroidWebViewAssets();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

