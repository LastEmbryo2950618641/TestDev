// Desktop executor shim draft
import { createDesktopRuntimeHostActionContract } from './runtime-adapter.js';
import { createDesktopHostRunnerDraft } from './host-runner.js';

function createExecutorShimDraft() {
  return {
    readyApi: 'app.whenReady',
    windowFactory: 'new BrowserWindow',
    loadFileApi: 'browserWindow.loadFile',
    loadUrlApi: 'browserWindow.loadURL',
    wrapper: 'desktop-executor-wrapper',
    payloadSource: 'createDesktopExecutorPayload',
  };
}

export function createDesktopExecutorPayload(target = globalThis) {
  const runner = createDesktopHostRunnerDraft(target);
  return {
    runtime: runner.runtime,
    pipeline: runner.pipeline,
    steps: runner.steps,
    contract: runner.contract,
    handshake: runner.handshake,
  };
}

export function createDesktopExecutorWrapperDraft(target = globalThis) {
  const payload = createDesktopExecutorPayload(target);
  return {
    shim: createExecutorShimDraft(),
    payload,
    ready: Boolean(payload.runtime && payload.pipeline?.app?.readyHook && payload.pipeline?.window?.factory),
  };
}

export function createDesktopExecutorSkeleton(target = globalThis) {
  const wrapper = createDesktopExecutorWrapperDraft(target);
  return {
    invokeReady: {
      api: wrapper.shim?.readyApi || '',
      args: [],
    },
    createWindow: {
      factory: wrapper.shim?.windowFactory || '',
      args: ['options-ref:pipeline.window.options'],
    },
    loadRenderer: {
      preferredApi: wrapper.payload?.pipeline?.renderer?.loadContract?.loadFile ? wrapper.shim?.loadFileApi || '' : wrapper.shim?.loadUrlApi || '',
      args: [wrapper.payload?.pipeline?.renderer?.entry || ''],
    },
    payload: wrapper.payload,
    ready: wrapper.ready === true,
  };
}

export function createDesktopExecutorRealCallReadyShim(target = globalThis) {
  const skeleton = createDesktopExecutorSkeleton(target);
  return {
    prepare: {
      readyApi: skeleton.invokeReady?.api || '',
      windowFactory: skeleton.createWindow?.factory || '',
      preferredLoadApi: skeleton.loadRenderer?.preferredApi || '',
      payloadFactory: 'createDesktopExecutorPayload',
    },
    bind: {
      mode: 'deferred-real-call',
      executeWith: 'electron-main-like-runtime',
    },
    ready: skeleton.ready === true,
  };
}

export function createDesktopExecutorContract(target = globalThis) {
  return {
    shim: createExecutorShimDraft(),
    host: createDesktopRuntimeHostActionContract(target),
    wrapper: createDesktopExecutorWrapperDraft(target),
    skeleton: createDesktopExecutorSkeleton(target),
    realCallReadyShim: createDesktopExecutorRealCallReadyShim(target),
  };
}
