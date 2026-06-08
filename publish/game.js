/**
 * Galgame 恋爱游戏 — 主入口
 *
 * 组装各模块到 Alpine store，处理初始化和用户交互
 * 模块依赖：config.js, prompt.js, ai.js, storage.js
 */

// 通知父窗口 iframe 已准备好
if (window.parent !== window) {
  window.parent.postMessage('iframe:content-ready', '*');
}

// 等待 DZMM API 就绪
const dzmmReady = new Promise((resolve) => {
  window.addEventListener('message', function handler(event) {
    if (event.data?.type === 'dzmm:ready') {
      window.removeEventListener('message', handler);
      resolve();
    }
  });
});

document.addEventListener('alpine:init', () => {
  const cfg = window.GameModules.config;

  Alpine.store('game', {
    // 游戏状态
    started: false,
    disabled: false,
    loading: true,

    // 玩家配置
    player_name: '',
    initial_affection: cfg.initial_affection,
    relationship: cfg.relationship,
    input: '',

    // 角色配置
    character_name: cfg.character_name,
    character_image: cfg.character_image,
    modelId: cfg.defaultModelId,
    _userAvatar: null,

    // 游戏变量
    current_affection: cfg.initial_affection,
    current_time: '日',
    current_mood: '普通',
    chat_content: '',

    /**
     * 开始游戏
     */
    async start() {
      this.current_affection = this.initial_affection;
      this.started = true;
      await window.GameModules.storage.saveSettings(this);
      this.next();
    },

    /**
     * 初始化：获取用户信息、模型列表、恢复存档
     */
    async init() {
      this.loading = true;
      await dzmmReady;

      // 获取用户信息自动填充
      try {
        const info = await window.dzmm.user.info();
        if (info?.name && !this.player_name) this.player_name = info.name;
        this._userAvatar = info?.avatarUrl || null;
      } catch (e) { console.warn('[SDK] user.info failed:', e.message); }

      // 获取可用模型
      try {
        const models = await window.dzmm.models.list();
        const first = models?.models?.[0];
        const id = models?.defaultModel || (typeof first === 'string' ? first : first?.internalName);
        if (id) this.modelId = id;
      } catch (e) { console.warn('[SDK] models.list failed:', e.message); }

      // 恢复设置和进度
      await window.GameModules.storage.loadSettings(this);
      await window.GameModules.storage.restoreProgress(this);
      this.loading = false;
    },

    /**
     * 发送消息
     */
    async next() {
      this.disabled = true;
      try {
        const userMessage = this.input;
        this.input = '';
        this.chat_content = '<span class="loading">...</span>';
        await window.GameModules.ai.requestAIResponse(this, userMessage);
      } finally {
        this.disabled = false;
      }
    },
  });

  queueMicrotask(() => Alpine.store('game').init?.());
});
