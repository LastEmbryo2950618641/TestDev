/**
 * 分块脚本加载与首页后台预加载进度。
 * boot 模式：按 GameScriptManifest 动态注入单文件脚本。
 * modular 模式：index.html 已引入全部脚本时为轻量进度模拟。
 */
window.GameModules = window.GameModules || {};

(function initAssetLoader() {
  const manifest = () => window.GameModules.bootManifest || { chunks: {}, prefetchAfterHome: [] };
  const loaded = new Set();
  const pending = new Map();

  const yieldMain = () => new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });

  const chunkUrl = (name) => {
    const file = manifest().chunks?.[name];
    return file ? new URL(file, document.baseURI || window.location.href).href : '';
  };

  const scriptManifest = () => window.GameScriptManifest?.chunks || null;

  const isBootLoaderMode = () => Boolean(scriptManifest()?.core?.length);

  const isModularMode = () => {
    if (isBootLoaderMode()) return false;
    return Boolean(document.querySelector('script[src*="home-actions.js"]:not([data-boot-src])'));
  };

  const bootBucketForChunk = (name) => {
    const key = String(name || '').trim();
    if (key === 'onboarding') return null;
    return ['gameplay', 'wechat', 'apps', 'prompts'].includes(key) ? key : null;
  };

  const markModularLoaded = () => {
    Object.keys(manifest().chunks || {}).forEach((name) => loaded.add(name));
  };

  const injectScript = (url) => new Promise((resolve, reject) => {
    if (!url) return resolve();
    const loader = window.GameBoot?.loadScript;
    if (loader) return loader(url).then(resolve).catch(reject);
    const existing = document.querySelector(`script[data-chunk-src="${url}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`加载失败: ${url}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.chunkSrc = url;
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => reject(new Error(`加载失败: ${url}`));
    document.head.appendChild(script);
  });

  async function loadBootChunk(name, store = null) {
    const key = String(name || '').trim();
    if (!key) return;
    if (loaded.has(key)) return;
    const bucket = bootBucketForChunk(key);
    if (key === 'onboarding') {
      loaded.add(key);
      return;
    }
    const urls = bucket ? (scriptManifest()?.[bucket] || []) : [];
    if (!urls.length) {
      loaded.add(key);
      return;
    }
    await window.GameBootActions.loadChunkUrls(urls, key);
    loaded.add(key);
    if (store?.backgroundLoadPercent != null) {
      const names = manifest().prefetchAfterHome || [];
      const idx = names.indexOf(key);
      if (idx >= 0 && names.length) {
        store.backgroundLoadPercent = Math.round(((idx + 1) / names.length) * 100);
      }
    }
  }

  async function loadChunk(name, store = null) {
    const key = String(name || '').trim();
    if (!key) return;
    if (loaded.has(key)) return;
    if (pending.has(key)) return pending.get(key);
    const url = chunkUrl(key);
    const modular = isModularMode() || (!url && !isBootLoaderMode());
    const task = (async () => {
      if (isBootLoaderMode()) {
        await loadBootChunk(key, store);
        window.GameModules.remergeGameStore?.();
        return;
      }
      if (modular) {
        loaded.add(key);
        await yieldMain();
        return;
      }
      await injectScript(url);
      loaded.add(key);
      window.GameModules.remergeGameStore?.();
      if (store?.backgroundLoadPercent != null) {
        const names = manifest().prefetchAfterHome || [];
        const idx = names.indexOf(key);
        if (idx >= 0 && names.length) {
          store.backgroundLoadPercent = Math.round(((idx + 1) / names.length) * 100);
        }
      }
    })().finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  }

  async function loadChunks(names = [], options = {}) {
    const list = (Array.isArray(names) ? names : []).filter(Boolean);
    if (!list.length) {
      options.onProgress?.({ percent: 100, label: '玩法模块已就绪' });
      return;
    }
    const labels = manifest().labels || {};
    for (let i = 0; i < list.length; i += 1) {
      const name = list[i];
      options.onProgress?.({
        percent: Math.round((i / list.length) * 100),
        label: `加载${labels[name] || name}…`,
        name,
      });
      await loadChunk(name);
      await yieldMain();
      options.onProgress?.({
        percent: Math.round(((i + 1) / list.length) * 100),
        label: `加载${labels[name] || name}…`,
        name,
      });
    }
  }

  async function ensureChunks(names = [], store = null) {
    await loadChunks(names, {
      onProgress: (p) => {
        if (store && p.percent != null) store.backgroundLoadPercent = p.percent;
      },
    });
    window.GameModules.remergeGameStore?.();
  }

  async function prefetchAfterHome(store) {
    if (!store) return;
    if (store._prefetchPromise) return store._prefetchPromise;
    const names = manifest().prefetchAfterHome || [];
    store._prefetchPromise = (async () => {
      store.backgroundLoadPercent = 0;
      if (!names.length || isModularMode()) {
        markModularLoaded();
        for (let i = 0; i < 4; i += 1) {
          store.backgroundLoadPercent = Math.min(100, (i + 1) * 25);
          await yieldMain();
        }
        store.backgroundLoadPercent = 100;
        return;
      }
      await loadChunks(names, {
        onProgress: (p) => {
          store.backgroundLoadPercent = p.percent ?? store.backgroundLoadPercent ?? 0;
        },
      });
      store.backgroundLoadPercent = 100;
      window.GameModules.remergeGameStore?.();
    })();
    return store._prefetchPromise;
  }

  async function ensureGameplayReady(store) {
    await ensureChunks(manifest().gameplayReady || [], store);
  }

  async function ensureNewGameReady(store) {
    await ensureChunks(manifest().newGameReady || [], store);
  }

  window.GameModules.assetLoader = {
    yieldMain,
    loadChunk,
    loadChunks,
    ensureChunks,
    prefetchAfterHome,
    ensureGameplayReady,
    ensureNewGameReady,
    isLoaded: (name) => loaded.has(name),
    isBootLoaderMode,
  };

  if (!isBootLoaderMode()) markModularLoaded();
})();
