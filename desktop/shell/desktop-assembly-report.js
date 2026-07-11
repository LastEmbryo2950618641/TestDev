import { execFileSync } from 'node:child_process';
import path from 'node:path';

function runJson(command, args) {
  const output = execFileSync(command, args, { encoding: 'utf8' });
  const cleaned = String(output || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new Error(`${command} ${args.join(' ')} returned empty output`);
  return JSON.parse(cleaned);
}

function resolveProjectRoot() {
  return process.cwd();
}

export function createDesktopAssemblyReport() {
  const projectRoot = resolveProjectRoot();
  const overview = runJson('node', ['desktop/shell/desktop-packaging-overview-report.js', '--no-artifact-write']);
  const config = runJson('node', ['desktop/shell/desktop-packaging-config.cli.js']);
  const unified = runJson('node', ['publish/platform/unified-platform-readiness-report.js', '--no-artifact-write']);

  const includedPaths = Array.isArray(config.files)
    ? config.files.map((entry) => {
        if (typeof entry === 'string') {
          return entry;
        }
        if (entry && typeof entry === 'object') {
          return {
            from: entry.from || '',
            to: entry.to || '',
            filter: entry.filter || [],
          };
        }
        return entry;
      })
    : [];

  const sourceRoot = 'publish';
  const targetRuntimeRoot = 'publish';
  const runtimeEntry = 'publish/index.html';
  const blockers = Array.isArray(overview.blockers) ? overview.blockers : [];

  return {
    runtimeFamily: 'desktop-assembly-report',
    hostKind: 'desktop',
    shell: 'desktop-electron-shell',
    sourceRoot,
    assemblyMode: 'packaging-inclusion',
    targetRuntimeRoot,
    runtimeEntry,
    includedPaths,
    freshness: {
      mode: 'build-package-input-selection',
      ok: overview.readiness?.preflightReady === true
        && overview.readiness?.toolchainReady === true
        && overview.readiness?.dryRunReady === true,
      details: {
        preflightReady: overview.readiness?.preflightReady === true,
        toolchainReady: overview.readiness?.toolchainReady === true,
        dryRunReady: overview.readiness?.dryRunReady === true,
        electronDistReady: overview.readiness?.electronDistReady === true,
        unifiedDesktopReady: unified.overall?.desktopReadyForPackagingPrep === true,
      },
      staleRisk: 'low-if-packaged-from-current-source-tree',
    },
    checks: {
      desktopReadyForPackagingPrep: overview.readiness?.desktopReadyForPackagingPrep === true,
      preflightReady: overview.readiness?.preflightReady === true,
      toolchainReady: overview.readiness?.toolchainReady === true,
      dryRunReady: overview.readiness?.dryRunReady === true,
      electronDistReady: overview.readiness?.electronDistReady === true,
      unifiedDesktopReady: unified.overall?.desktopReadyForPackagingPrep === true,
    },
    blockers,
    evidence: {
      projectRoot,
      overviewReport: 'desktop/shell/desktop-packaging-overview-report.js --no-artifact-write',
      configReport: 'desktop/shell/desktop-packaging-config.cli.js',
      unifiedReadinessReport: 'publish/platform/unified-platform-readiness-report.js --no-artifact-write',
      packagedPublishSource: path.join(projectRoot, sourceRoot),
      reports: overview.reports || {},
    },
    nextActions: Array.isArray(overview.recommendedCommands) ? overview.recommendedCommands : [],
  };
}

const report = createDesktopAssemblyReport();
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
