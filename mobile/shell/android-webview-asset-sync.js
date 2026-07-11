import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createAndroidWebViewAssetSyncPlan } from './android-webview-asset-sync-plan.js';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeRelativePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function listRelativeFiles(rootPath, currentPath = rootPath) {
  if (!fs.existsSync(currentPath)) {
    return [];
  }

  const stat = fs.statSync(currentPath);
  if (stat.isFile()) {
    return [normalizeRelativePath(path.relative(rootPath, currentPath))];
  }

  const files = [];
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listRelativeFiles(rootPath, entryPath));
    } else if (entry.isFile()) {
      files.push(normalizeRelativePath(path.relative(rootPath, entryPath)));
    }
  }

  return files.sort();
}

function hashFile(filePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
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

function removeEmptyParentDirs(startPath, stopPath) {
  let currentPath = path.dirname(startPath);
  const resolvedStop = path.resolve(stopPath);

  while (currentPath.startsWith(resolvedStop)) {
    if (!fs.existsSync(currentPath)) {
      currentPath = path.dirname(currentPath);
      continue;
    }

    const entries = fs.readdirSync(currentPath);
    if (entries.length > 0 || path.resolve(currentPath) === resolvedStop) {
      break;
    }

    fs.rmdirSync(currentPath);
    currentPath = path.dirname(currentPath);
  }
}

function removeStaleTargets(fromPath, toPath) {
  if (!fs.existsSync(toPath)) {
    return [];
  }

  const sourceStat = fs.existsSync(fromPath) ? fs.statSync(fromPath) : null;
  const targetStat = fs.statSync(toPath);
  const removed = [];

  if (sourceStat?.isFile() && targetStat.isFile()) {
    return removed;
  }

  if (sourceStat?.isDirectory() && targetStat.isDirectory()) {
    const sourceFiles = new Set(listRelativeFiles(fromPath));
    for (const relativeFile of listRelativeFiles(toPath)) {
      if (sourceFiles.has(relativeFile)) {
        continue;
      }

      const stalePath = path.join(toPath, relativeFile);
      fs.rmSync(stalePath, { force: true });
      removeEmptyParentDirs(stalePath, toPath);
      removed.push(normalizeRelativePath(relativeFile));
    }
  }

  return removed;
}

export function collectAndroidWebViewAssetParity(plan) {
  const comparisons = [];

  for (const task of plan.copyPlan || []) {
    const fromPath = path.resolve(process.cwd(), task.from);
    const toPath = path.resolve(process.cwd(), task.to);
    const fromExists = fs.existsSync(fromPath);
    const toExists = fs.existsSync(toPath);

    if (!fromExists || !toExists) {
      comparisons.push({
        task,
        fromExists,
        toExists,
        kind: 'missing',
        ok: false,
      });
      continue;
    }

    const fromStat = fs.statSync(fromPath);
    const toStat = fs.statSync(toPath);

    if (fromStat.isFile() && toStat.isFile()) {
      const sourceHash = hashFile(fromPath);
      const targetHash = hashFile(toPath);
      comparisons.push({
        task,
        kind: 'file',
        ok: sourceHash === targetHash,
        sourceHash,
        targetHash,
      });
      continue;
    }

    if (fromStat.isDirectory() && toStat.isDirectory()) {
      const sourceFiles = listRelativeFiles(fromPath);
      const targetFiles = listRelativeFiles(toPath);
      const sourceOnly = sourceFiles.filter((item) => !targetFiles.includes(item));
      const targetOnly = targetFiles.filter((item) => !sourceFiles.includes(item));
      const mismatchedFiles = [];

      for (const relativeFile of sourceFiles) {
        if (!targetFiles.includes(relativeFile)) {
          continue;
        }

        const sourceHash = hashFile(path.join(fromPath, relativeFile));
        const targetHash = hashFile(path.join(toPath, relativeFile));
        if (sourceHash !== targetHash) {
          mismatchedFiles.push(relativeFile);
        }
      }

      comparisons.push({
        task,
        kind: 'directory',
        ok: sourceOnly.length === 0 && targetOnly.length === 0 && mismatchedFiles.length === 0,
        sourceOnly,
        targetOnly,
        mismatchedFiles,
        sourceFileCount: sourceFiles.length,
        targetFileCount: targetFiles.length,
      });
      continue;
    }

    comparisons.push({
      task,
      kind: 'type-mismatch',
      ok: false,
      sourceType: fromStat.isDirectory() ? 'directory' : 'file',
      targetType: toStat.isDirectory() ? 'directory' : 'file',
    });
  }

  return {
    ok: comparisons.every((item) => item.ok),
    comparisons,
  };
}

export function syncAndroidWebViewAssets(options = {}) {
  const plan = createAndroidWebViewAssetSyncPlan(options);
  const copied = [];
  const skipped = [];
  const staleRemoved = [];
  const cleanStale = options.cleanStale === true;

  for (const task of plan.copyPlan || []) {
    const fromPath = path.resolve(process.cwd(), task.from);
    const toPath = path.resolve(process.cwd(), task.to);

    if (!fs.existsSync(fromPath)) {
      skipped.push({ ...task, reason: 'missing-source' });
      continue;
    }

    if (cleanStale) {
      const removed = removeStaleTargets(fromPath, toPath);
      if (removed.length > 0) {
        staleRemoved.push({
          ...task,
          removed,
        });
      }
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

  const parity = collectAndroidWebViewAssetParity(plan);
  const result = {
    runtimeFamily: 'android-webview-asset-sync-result',
    ok: skipped.length === 0 && parity.ok,
    plan,
    copied,
    skipped,
    cleanStale,
    staleRemoved,
    parity,
  };

  const resultPath = path.resolve(process.cwd(), 'mobile', 'android-webview-shell', '.last-asset-sync.json');
  ensureDir(path.dirname(resultPath));
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

  return result;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const cleanStale = process.argv.includes('--clean-stale');
  const result = syncAndroidWebViewAssets({ cleanStale });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
