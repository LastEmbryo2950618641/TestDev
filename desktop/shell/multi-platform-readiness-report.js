import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDesktopPlatformCapabilityRegistry } from './platform-capability-registry-entry.js';
import { createDesktopPlatformPreflightReport } from './platform-preflight-report-entry.js';
import { createDesktopPlatformPackagingGapReport } from './platform-packaging-gap-report-entry.js';
import { createMobilePlatformCapabilityRegistry } from '../../mobile/shell/platform-capability-registry-entry.js';
import { createMobilePlatformPreflightReport } from '../../mobile/shell/platform-preflight-report-entry.js';
import { createMobilePlatformPackagingGapReport } from '../../mobile/shell/platform-packaging-gap-report-entry.js';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function summarizeRegistry(registry = {}) {
  const summary = registry.summary || {};
  const checkpoints = registry.checkpoints || {};
  return {
    hostKind: registry.hostKind || '',
    shellLocalOnly: registry.shellLocalOnly === true,
    publishTouched: registry.publishTouched === true,
    summary,
    checkpoints,
  };
}

function summarizePlatform(name, registry, preflight, gapReport) {
  return {
    name,
    hostKind: preflight.hostKind || registry.hostKind || name,
    registry: summarizeRegistry(registry),
    preflight,
    gapReport,
    ready: {
      registryAligned: Object.values(registry.checkpoints || {}).every(Boolean),
      preflightReady: preflight.readyForHostPackaging === true,
      missing: Array.isArray(preflight.missing) ? preflight.missing : [],
      nextActions: Array.isArray(preflight.nextActions) ? preflight.nextActions : [],
      hostSpecificTasks: Array.isArray(gapReport.hostSpecificTasks) ? gapReport.hostSpecificTasks : [],
    },
  };
}

export function createMultiPlatformReadinessReport() {
  const shellDir = resolveShellDir();
  const desktopSmokeArtifact = readJson(path.resolve(shellDir, '.artifacts', 'attempt-launch-result.json'));
  const desktopPackagingPreflight = readJson(path.resolve(shellDir, '.artifacts', 'desktop-packaging-preflight.json'));

  const desktopRegistry = createDesktopPlatformCapabilityRegistry(globalThis);
  const desktopPreflight = createDesktopPlatformPreflightReport(globalThis);
  const desktopGapReport = createDesktopPlatformPackagingGapReport(globalThis);

  const mobileRegistry = createMobilePlatformCapabilityRegistry();
  const mobilePreflight = createMobilePlatformPreflightReport();
  const mobileGapReport = createMobilePlatformPackagingGapReport();

  const desktop = summarizePlatform('desktop', desktopRegistry, desktopPreflight, desktopGapReport);
  const mobile = summarizePlatform('mobile', mobileRegistry, mobilePreflight, mobileGapReport);

  const report = {
    runtimeFamily: 'multi-platform-readiness-report',
    stage: 'shared-desktop-mobile-readiness-rollup',
    generatedAt: new Date().toISOString(),
    readiness: {
      desktop: desktop.ready.preflightReady,
      mobile: mobile.ready.preflightReady,
    },
    evidence: {
      desktopSmokeArtifact,
      desktopPackagingPreflight,
    },
    platforms: {
      desktop,
      mobile,
    },
    overall: {
      desktopReadyForPackagingPrep: desktop.ready.preflightReady === true,
      mobileReadyForPackagingPrep: mobile.ready.preflightReady === true,
      recommendedFocus: desktop.ready.preflightReady === false
        ? 'desktop'
        : mobile.ready.preflightReady === false
          ? 'mobile'
          : 'shared-validation',
    },
  };

  const artifactPath = path.resolve(shellDir, '.artifacts', 'multi-platform-readiness.json');
  try {
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, JSON.stringify(report, null, 2));
  } catch {}

  return report;
}

const report = createMultiPlatformReadinessReport();
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
