/**
 * 顺序注入脚本，供 boot 与 asset-loader 复用。
 */
window.GameBoot = window.GameBoot || {
  loaded: new Set(),
  bootComplete: false,

  versionedSrc(src) {
    const url = String(src || '').trim();
    if (!url) return '';
    if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url) || /^blob:/i.test(url)) return url;
    const version = String(window.GameScriptManifest?.version || '').trim();
    if (!version) return url;
    return url.includes('?') ? `${url}&v=${encodeURIComponent(version)}` : `${url}?v=${encodeURIComponent(version)}`;
  },

  loadScript(src, options = {}) {
    const url = this.versionedSrc(src);
    if (!url) return Promise.resolve();
    if (this.loaded.has(url)) return Promise.resolve();
    const existing = Array.from(document.querySelectorAll('script[data-boot-src]')).find((node) => node.dataset.bootSrc === url);
    if (existing) {
      if (existing.dataset.bootLoaded === '1') {
        this.loaded.add(url);
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`加载失败: ${url}`)), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.dataset.bootSrc = url;
      if (options.defer) script.defer = true;
      if (options.async !== false) script.async = false;
      script.onload = () => {
        script.dataset.bootLoaded = '1';
        this.loaded.add(url);
        resolve();
      };
      script.onerror = () => reject(new Error(`加载失败: ${url}`));
      document.head.appendChild(script);
    });
  },

  preloadScripts(urls = []) {
    const list = (Array.isArray(urls) ? urls : []).map((src) => this.versionedSrc(src)).filter(Boolean);
    list.forEach((url) => {
      if (this.loaded.has(url)) return;
      const existing = Array.from(document.querySelectorAll('link[data-boot-preload]')).find((node) => node.dataset.bootPreload === url);
      if (existing) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = url;
      link.dataset.bootPreload = url;
      if (/^(https?:)?\/\//i.test(url)) link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  },

  async loadScripts(urls = [], onProgress) {
    const list = (Array.isArray(urls) ? urls : []).filter(Boolean);
    this.preloadScripts(list);
    for (let i = 0; i < list.length; i += 1) {
      onProgress?.({ index: i, total: list.length, url: list[i] });
      await this.loadScript(list[i]);
    }
    onProgress?.({ index: list.length, total: list.length, done: true });
  },
};
