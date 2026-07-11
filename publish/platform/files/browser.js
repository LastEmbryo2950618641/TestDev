window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.files = window.GameModules.platform.files || {};

window.GameModules.platform.files.browser = {
  async readText(file) {
    if (!file) return '';
    if (typeof file.text === 'function') return file.text();
    throw new Error('当前文件对象不支持 text() 读取');
  },

  async readJson(file) {
    const textValue = await this.readText(file);
    return textValue ? JSON.parse(textValue) : null;
  },

  async writeText(pathValue, value) {
    return this.saveFile({ path: pathValue, content: value, mimeType: 'text/plain;charset=utf-8' });
  },

  async writeJson(pathValue, value) {
    return this.saveFile({ path: pathValue, content: JSON.stringify(value, null, 2), mimeType: 'application/json;charset=utf-8' });
  },

  async pickFile(options = {}) {
    const accepts = Array.isArray(options.accept) ? options.accept : [];
    const multiple = options.multiple === true;
    return new Promise((resolve, reject) => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = multiple;
        if (accepts.length) input.accept = accepts.join(',');
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        input.style.top = '-9999px';
        const cleanup = () => {
          input.remove();
        };
        input.addEventListener('change', () => {
          const files = Array.from(input.files || []);
          cleanup();
          if (!multiple) resolve(files[0] || null);
          else resolve(files);
        }, { once: true });
        input.addEventListener('cancel', () => {
          cleanup();
          resolve(multiple ? [] : null);
        }, { once: true });
        document.body.appendChild(input);
        input.click();
      } catch (err) {
        reject(err);
      }
    });
  },

  async saveFile(options = {}) {
    const content = options.content ?? '';
    const fileName = String(options.fileName || options.path || 'download.txt').trim() || 'download.txt';
    const mimeType = String(options.mimeType || 'application/octet-stream').trim() || 'application/octet-stream';
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return { ok: true, fileName, mimeType, size: blob.size };
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  },
};

window.GameModules.platform.core.files = window.GameModules.platform.files.browser;
