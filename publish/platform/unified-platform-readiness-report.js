import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDesktopPlatformCapabilityRegistry } from '../../desktop/shell/platform-capability-registry-entry.js';
import { createDesktopPlatformPreflightReport } from '../../desktop/shell/platform-preflight-report-entry.js';
import { createDesktopPlatformPackagingGapReport } from '../../desktop/shell/platform-packaging-gap-report-entry.js';
import { createMobilePlatformCapabilityRegistry } from '../../mobile/shell/platform-capability-registry-entry.js';
import { createMobilePlatformPreflightReport } from '../../mobile/shell/platform-preflight-report-entry.js';
import { createMobilePlatformPackagingGapReport } from '../../mobile/shell/platform-packaging-gap-report-entry.js';
import { createBrowserPlatformCapabilityRegistry, createBrowserPlatformPreflightReport } from './browser-platform-registry.js';

function resolvePlatformDir() {
  return path.dirname(fileURLToPath(import.meta.url));
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

function summarizePlatform(name, registry, preflight, gapReport = null) {
  const isBrowser = (preflight.hostKind || registry.hostKind || name) === 'browser';
  return {
    name,
    hostKind: preflight.hostKind || registry.hostKind || name,
    registry: summarizeRegistry(registry),
    preflight,
    gapReport,
    ready: {
      registryAligned: Object.values(registry.checkpoints || {}).every(Boolean),
      preflightReady: isBrowser ? preflight.readyForDirectUse === true : preflight.readyForHostPackaging === true,
      missing: Array.isArray(preflight.missing) ? preflight.missing : [],
      nextActions: Array.isArray(preflight.nextActions) ? preflight.nextActions : [],
      hostSpecificTasks: Array.isArray(gapReport?.hostSpecificTasks) ? gapReport.hostSpecificTasks : [],
    },
  };
}

export function createUnifiedPlatformReadinessReport(options = {}) {
  const desktopRegistry = createDesktopPlatformCapabilityRegistry(globalThis);
  const desktopPreflight = createDesktopPlatformPreflightReport(globalThis);
  const desktopGapReport = createDesktopPlatformPackagingGapReport(globalThis);

  const mobileRegistry = createMobilePlatformCapabilityRegistry();
  const mobilePreflight = createMobilePlatformPreflightReport();
  const mobileGapReport = createMobilePlatformPackagingGapReport();

  const browserRegistry = createBrowserPlatformCapabilityRegistry();
  const browserPreflight = createBrowserPlatformPreflightReport();

  const desktop = summarizePlatform('desktop', desktopRegistry, desktopPreflight, desktopGapReport);
  const mobile = summarizePlatform('mobile', mobileRegistry, mobilePreflight, mobileGapReport);
  const browser = summarizePlatform('browser', browserRegistry, browserPreflight, null);

  const report = {
    runtimeFamily: 'unified-platform-readiness-report',
    stage: 'shared-desktop-mobile-browser-readiness-rollup',
    generatedAt: new Date().toISOString(),
    readiness: {
      desktop: desktop.ready.preflightReady,
      mobile: mobile.ready.preflightReady,
      browser: browser.ready.preflightReady,
    },
    platforms: {
      desktop,
      mobile,
      browser,
    },
    overall: {
      desktopReadyForPackagingPrep: desktop.ready.preflightReady === true,
      mobileReadyForPackagingPrep: mobile.ready.preflightReady === true,
      browserReadyForDirectUse: browser.ready.preflightReady === true,
      recommendedFocus: desktop.ready.preflightReady === false
        ? 'desktop'
        : mobile.ready.preflightReady === false
          ? 'mobile'
          : browser.ready.preflightReady === false
            ? 'browser'
            : 'shared-validation',
    },
  };

  const persistArtifact = options.persistArtifact !== false;
  if (persistArtifact) {
    const platformDir = resolvePlatformDir();
    const artifactPath = path.resolve(platformDir, '.artifacts', 'unified-platform-readiness.json');
    try {
      fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
      fs.writeFileSync(artifactPath, JSON.stringify(report, null, 2));
    } catch {}
  }

  return report;
}

const persistArtifact = !process.argv.includes('--no-artifact-write');
const report = createUnifiedPlatformReadinessReport({ persistArtifact });
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
