window.GameModules = window.GameModules || {};

window.GameModules.systemTestActions = {
  initSystemTestApp() {
    const neutralThinkingPrompt = '请用简洁中文回答：为什么晴天适合散步？列出三点理由即可。';
    const contaminatedThinkingPrompt = '请用三步推理回答：为什么晴天适合散步？如果接口支持思考字段，请先返回 thinking/think，再返回正文。';
    const previousState = this.systemTestState || {};
    this.systemTestState = {
      open: false,
      loading: false,
      thinkingLoading: false,
      platformChatLoading: false,
      result: '',
      error: '',
      thinkingError: '',
      thinkingResults: [],
      platformChatPayload: '',
      platformChatRaw: '',
      platformChatError: '',
      systemText: '你是一个测试助手。无论用户输入什么，只回答：SYSTEM_OK。',
      userText: '请测试 system role 是否生效。',
      ...previousState,
      thinkingPrompt: previousState.thinkingPrompt && previousState.thinkingPrompt !== contaminatedThinkingPrompt ? previousState.thinkingPrompt : neutralThinkingPrompt,
    };
  },

  openSystemTestApp() {
    this.initSystemTestApp();
    this.closeDesktopApps?.();
    this.systemTestState.open = true;
    this.desktopUnlocked = true;
  },

  closeSystemTestApp() {
    if (this.systemTestState) this.systemTestState.open = false;
    this.closeAppToDesktop?.();
  },

  selectedSystemTestModel() {
    return this.modelId || this.settingsState?.textModelId || window.GameModules.config?.defaultModelId || 'nalang-turbo-0826';
  },

  selectTextBlock(event) {
    const node = event?.currentTarget;
    if (!node || !window.getSelection || !document.createRange) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  },

  async runSystemRoleTest() {
    this.initSystemTestApp();
    const state = this.systemTestState;
    if (state.loading) return;
    state.loading = true;
    state.result = '';
    state.error = '';
    let fullText = '';
    try {
      await window.dzmm.completions({
        model: this.selectedSystemTestModel(),
        messages: [
          { role: 'system', content: state.systemText || '' },
          { role: 'user', content: state.userText || '' },
        ],
        maxTokens: 200,
      }, (content, done) => {
        fullText += content || '';
        state.result = fullText;
        if (done && !state.result.trim()) state.result = '请求成功，但返回为空。';
      });
      if (!state.result.trim()) state.result = fullText || '请求成功，但返回为空。';
    } catch (err) {
      state.error = [err?.code, err?.message].filter(Boolean).join('｜') || '请求失败';
      console.error('[system role 测试] 失败:', err?.code, err?.message, err?.stack);
    } finally {
      state.loading = false;
    }
  },

  async runThinkingParamTests() {
    this.initSystemTestApp();
    const state = this.systemTestState;
    if (state.thinkingLoading) return;
    state.thinkingLoading = true;
    state.thinkingError = '';
    state.thinkingResults = [
      this.createThinkingTestResult('deepThinking', '参数 deepThinking: true'),
    ];
    for (const target of state.thinkingResults) {
      await this.runSingleThinkingParamTest(target).catch((err) => {
        target.status = '失败';
        target.error = [err?.code, err?.message].filter(Boolean).join('｜') || '请求失败';
        console.error('[深度思考测试] 失败:', target.paramKey, err?.code, err?.message, err?.stack);
      });
      state.thinkingResults = [...state.thinkingResults];
    }
    state.thinkingLoading = false;
  },

  createThinkingTestResult(paramKey, label) {
    return { paramKey, label, status: '等待中', thinking: '', content: '', raw: '', error: '', payload: '', tokenSeen: false };
  },

  async runPlatformChatDeepThinkingTest() {
    this.initSystemTestApp();
    const state = this.systemTestState;
    if (state.platformChatLoading) return;
    const payload = {
      operation: 'generate',
      chatId: 'd4d1e6c2-113c-4645-9efc-048c32f77b0c',
      cardId: '3011985',
      chatSettings: {
        model: 'x-apex-flux-0217-16k',
        style: 'standard',
        maxTokens: 3500,
        randomIndex: 0,
        deepThinking: true,
        enableMemoryEnhance: false,
        voiceSettings: {
          ignore_parentheses: false,
          only_quotes: false,
          ignore_english: false,
          read_asterisks: false,
        },
      },
      presetConfig: { presetIds: [] },
      prompts: [
        { role: 'user', content: state.thinkingPrompt || '请用简洁中文回答：为什么晴天适合散步？列出三点理由即可。' },
      ],
    };
    state.platformChatLoading = true;
    state.platformChatError = '';
    state.platformChatPayload = JSON.stringify(payload, null, 2);
    state.platformChatRaw = `[raw request]\n${state.platformChatPayload}\n`;
    console.log('[平台 /api/chat 测试][RAW request object]', payload);
    console.log('[平台 /api/chat 测试][RAW request JSON]', state.platformChatPayload);
    try {
      await this.fetchPlatformChatRaw(state, payload, 'application/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const firstError = { mode: 'application/json', name: err?.name, message: err?.message, stack: err?.stack };
      console.error('[平台 /api/chat 测试] application/json 失败:', err?.message, err?.stack);
      state.platformChatRaw += `\n[application/json fetch error]\n${JSON.stringify(firstError, null, 2)}\n`;
      try {
        await this.fetchPlatformChatRaw(state, payload, 'simple text/plain', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (fallbackErr) {
        const secondError = { mode: 'simple text/plain', name: fallbackErr?.name, message: fallbackErr?.message, stack: fallbackErr?.stack };
        state.platformChatError = fallbackErr?.message || err?.message || '请求失败';
        console.error('[平台 /api/chat 测试] simple request 失败:', fallbackErr?.message, fallbackErr?.stack);
        state.platformChatRaw += `\n[simple request fetch error]\n${JSON.stringify(secondError, null, 2)}\n`;
      }
    } finally {
      state.platformChatLoading = false;
    }
  },

  async fetchPlatformChatRaw(state, payload, mode, options) {
    state.platformChatRaw += `\n[fetch mode]\n${mode}\n`;
    const response = await fetch('https://www.dzmm.ai/api/chat', options);
    const responseMeta = {
      mode,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      type: response.type,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
    };
    console.log('[平台 /api/chat 测试][RAW response meta]', responseMeta);
    state.platformChatRaw += `\n[raw response meta]\n${JSON.stringify(responseMeta, null, 2)}\n`;
    const text = await response.text();
    console.log('[平台 /api/chat 测试][RAW response text]', text);
    state.platformChatRaw += `\n[raw response text]\n${text}\n`;
    if (!response.ok) state.platformChatError = `${response.status} ${response.statusText}`;
  },

  async runSingleThinkingParamTest(target) {
    const state = this.systemTestState;
    const payload = {
      model: this.selectedSystemTestModel(),
      messages: [{ role: 'user', content: state.thinkingPrompt || '' }],
      maxTokens: 500,
      deepThinking: true,
    };
    const requestPacket = { label: target.label, paramKey: target.paramKey, payload };
    target.payload = JSON.stringify(requestPacket, null, 2);
    target.raw = `[raw request payload]\n${target.payload}\n`;
    target.thinking = '';
    target.content = '本测试不再解析字段，只看下方原始请求 / 回调 / 返回。';
    target.status = '请求中';
    this.systemTestState.thinkingResults = [...this.systemTestState.thinkingResults];
    console.log('[深度思考测试][RAW request payload object]', requestPacket);
    console.log('[深度思考测试][RAW request payload JSON]', target.payload);
    const response = await window.dzmm.completions(payload, (...args) => {
      const callbackPacket = {
        label: target.label,
        paramKey: target.paramKey,
        callbackArgs: args.map((arg, index) => this.describeThinkingCallbackArg(arg, index)),
      };
      const callbackJson = JSON.stringify(callbackPacket, null, 2);
      console.log('[深度思考测试][RAW callback args object]', callbackPacket);
      console.log('[深度思考测试][RAW callback args JSON]', callbackJson);
      target.raw += `\n[raw callback args]\n${callbackJson}\n`;
      target.status = Boolean(args[1]) ? '完成' : '接收中';
      this.systemTestState.thinkingResults = [...this.systemTestState.thinkingResults];
    });
    const returnPacket = {
      label: target.label,
      paramKey: target.paramKey,
      promiseReturn: this.describeThinkingCallbackArg(response, 0),
    };
    const returnJson = JSON.stringify(returnPacket, null, 2);
    console.log('[深度思考测试][RAW promise return object]', returnPacket);
    console.log('[深度思考测试][RAW promise return JSON]', returnJson);
    target.raw += `\n[raw promise return]\n${returnJson}\n`;
    this.systemTestState.thinkingResults = [...this.systemTestState.thinkingResults];
  },

  stringifyThinkingDebugValue(value) {
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); }
    catch (_) { return String(value); }
  },

  describeThinkingCallbackArg(value, index) {
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const item = { index, type, value };
    if (typeof value === 'string') item.valueJson = JSON.stringify(value);
    return item;
  },

  parseThinkingCallbackArgs(args = []) {
    const out = { thinking: '', thinkingCumulative: false, content: '', contentCumulative: false, raw: '' };
    args.forEach((arg, index) => {
      if (typeof arg === 'boolean' || arg == null) return;
      if (typeof arg === 'string') {
        const labeled = this.parseThinkingLabeledText(arg);
        const parsed = labeled.matched ? labeled : this.parseThinkingSseText(arg);
        if (parsed.matched) {
          if (parsed.thinking) {
            out.thinking = parsed.thinking;
            out.thinkingCumulative = parsed.thinkingCumulative;
          }
          if (parsed.content) {
            out.content = parsed.contentCumulative ? parsed.content : out.content + parsed.content;
            out.contentCumulative = Boolean(parsed.contentCumulative);
          }
        } else if (index === 0) out.content += arg;
        out.raw += arg;
        return;
      }
      if (typeof arg === 'object') {
        const data = arg.data;
        const objectData = data && typeof data === 'object' ? data : arg;
        if (arg.type === 'step' || objectData.step === '思考中') {
          out.thinking = String(objectData.content || '');
          out.thinkingCumulative = true;
        } else if (arg.type === 'token') out.content += String(typeof data === 'string' ? data : objectData.content || '');
        else if (arg.type === 'complete') out.content += String(objectData.content || '');
        else {
          out.thinking += String(objectData.thinking || objectData.think || objectData.reasoning || '');
          out.content += String(objectData.content || objectData.delta || objectData.text || '');
        }
        try { out.raw += `${JSON.stringify(arg)}\n`; }
        catch (_) { out.raw += '[无法序列化对象]\n'; }
      }
    });
    return out;
  },

  parseThinkingLabeledText(text = '') {
    const normalized = String(text || '').replace(/\r\n/g, '\n');
    const out = { matched: false, thinking: '', thinkingCumulative: true, content: '', contentCumulative: true };
    if (normalized.startsWith('thinking\n')) {
      out.matched = true;
      const body = normalized.slice('thinking\n'.length);
      const splitIndex = body.indexOf('\nthink\n');
      if (splitIndex >= 0) {
        out.thinking = body.slice(0, splitIndex);
        out.content = body.slice(splitIndex + '\nthink\n'.length);
      } else {
        out.thinking = body;
      }
      return out;
    }
    if (normalized.startsWith('think\n')) {
      out.matched = true;
      out.content = normalized.slice('think\n'.length);
    }
    return out;
  },

  parseThinkingSseText(text = '') {
    const out = { matched: false, thinking: '', thinkingCumulative: false, content: '', contentCumulative: false };
    String(text).split(/\n+/).forEach((line) => {
      const value = line.trim().startsWith('data:') ? line.trim().slice(5).trim() : line.trim();
      if (!value || !value.startsWith('{')) return;
      try {
        const event = JSON.parse(value);
        const data = event.data && typeof event.data === 'object' ? event.data : event.data;
        out.matched = true;
        if (event.type === 'step') {
          out.thinking = String(data?.content || '');
          out.thinkingCumulative = true;
        } else if (event.type === 'token') out.content += String(data || '');
        else if (event.type === 'complete') out.content += String(data?.content || '');
      } catch (_) {
        // 非 SSE JSON 片段按普通文本处理。
      }
    });
    return out;
  },

  extractThinkingFromFinalText(target) {
    const raw = String(target.raw || target.content || '').trim();
    if (!raw || target.thinking.trim()) return;
    try {
      const data = JSON.parse(raw);
      target.thinking = String(data.thinking || data.think || data.reasoning || target.thinking || '');
      target.content = String(data.content || data.text || data.answer || target.content || '');
    } catch (_) {
      // 普通文本不是 JSON 时保留原样，方便观察平台真实返回。
    }
  },
};
