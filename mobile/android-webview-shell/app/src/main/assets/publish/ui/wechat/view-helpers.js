window.GameModules = window.GameModules || {};

window.GameModules.wechatViewHelpers = {
  wechatContacts() {
    const group = this.defaultWechatGroup?.() || { id: 'group-main', name: '操控者交流群', mark: '群', group: true };
    const users = (this.wechatUsers || []).map((contact) => this.displayWechatContact?.(contact) || contact);
    return [group, ...users];
  },

  wechatThreads() {
    return this.wechatContacts().map((contact) => {
      const key = this.wechatMessageKey?.(contact) || contact.id;
      const latest = this.wechatMessagesByContact?.[key]?.slice(-1)?.[0]?.text || contact.latest || '';
      return { ...contact, latest: String(latest).slice(0, 80) };
    });
  },

  wechatSelected() {
    const contacts = this.wechatContacts();
    const selectedId = this.wechatSelectedContact || 'group-main';
    return contacts.find((contact) => contact.id === selectedId) || contacts[0] || { id: 'group-main', name: '微信', mark: '微', group: true };
  },
};
window.GameModules = window.GameModules || {};

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatHasChangeReasons(msg) {
    return this.wechatChangeGroups(msg).some((group) => group.items.length);
  },

  wechatChangeGroups(msg = {}) {
    const metrics = msg.metricUpdates || {};
    return [
      { title: '情绪变化', items: this.wechatMetricReasonItems(metrics.emotions, 'emotions', msg) },
      { title: '感觉变化', items: this.wechatMetricReasonItems(metrics.playerFeelings, 'playerFeelings', msg) },
      { title: '穿着变化', items: this.wechatWearingReasonItems(msg.lexiconUpdates) },
      { title: '身体状态', items: this.wechatBodyStatusReasonItems(msg.bodyStatusUpdates) },
    ].filter((group) => group.items.length);
  },

  usefulMetricText(text = '', key = '') {
    return window.GameModules.wechatDomainHelpers.usefulMetricText.call(this, text, key);
  },

  metricProfileItem(state, group, key) {
    return window.GameModules.wechatDomainHelpers.metricProfileItem.call(this, state, group, key);
  },

  wechatMetricReasonItems(list = [], group = 'emotions', msg = {}) {
    const state = this.wechatMetricState(msg);
    const valueMap = group === 'emotions' ? state?.metrics?.emotions : state?.metrics?.playerFeelings;
    const notePrefix = group === 'emotions' ? 'emotion' : 'player';
    return (Array.isArray(list) ? list : []).map((item) => {
      const key = item?.key || '未命名';
      const delta = Number(item?.delta) || 0;
      const nextValue = Number.isFinite(Number(valueMap?.[key])) ? window.GameModules.metrics.clamp(valueMap[key]) : null;
      const prevValue = nextValue === null ? null : window.GameModules.metrics.clamp(nextValue - delta);
      const note = state?.metrics?.notes?.[`${notePrefix}:${key}`] || {};
      const profile = this.metricProfileItem(state, group, key) || {};
      const status = [item?.status, note.status, profile.status].find((text) => this.usefulMetricText(text, key)) || '';
      const reason = [item?.reason, note.reason, profile.reason].find((text) => this.usefulMetricText(text, key)) || '';
      const sign = delta > 0 ? `+${delta}` : String(delta);
      const formula = nextValue === null ? (delta ? sign : '') : `${prevValue}${sign}=${nextValue}`;
      return { name: key, summary: [formula, status].filter(Boolean).join('｜'), reason };
    }).filter((item) => item.reason || item.summary);
  },

  wechatWearingReasonItems(list = []) {
    return (Array.isArray(list) ? list : []).filter((item) => item?.kind === '穿着').map((item) => {
      const value = item?.value && typeof item.value === 'object' ? item.value : {};
      return {
        name: item?.name || value.name || value.slot || '穿着',
        summary: [item?.slot || value.slot, item?.summary || item?.description || value.description].filter(Boolean).join('｜'),
        reason: item?.reason || value.reason || '',
      };
    }).filter((item) => item.reason || item.summary);
  },

  wechatBodyStatusReasonItems(list = []) {
    return (Array.isArray(list) ? list : []).map((item) => ({
      name: item?.part || item?.partKey || '身体',
      summary: [item?.status, item?.description].filter(Boolean).join('｜'),
      reason: item?.reason || '',
    })).filter((item) => item.reason || item.summary);
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatContactRows() {
    return this.wechatContacts().filter((contact) => !contact.group).map((contact) => ({
      key: contact.id,
      id: contact.id,
      name: contact.name || '未命名联系人',
      avatarStyle: this.wechatAvatarStyle(contact),
      avatarText: this.wechatAvatarText(contact),
    }));
  },

  wechatContactEmptyText() {
    return this.wechatContactRows().length ? '' : '暂无联系人';
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatThreadRows() {
    return this.wechatThreads().map((thread) => ({
      key: thread.id,
      id: thread.id,
      name: thread.name || '未命名联系人',
      latest: String(thread.latest || '').slice(0, 80),
      unread: Number(thread.unread) || 0,
      avatarStyle: this.wechatAvatarStyle(thread),
      avatarText: this.wechatAvatarText(thread),
    }));
  },
});
window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatChatsPanelView() {
    return {
      rows: this.wechatThreadRows(),
      emptyText: this.wechatThreadRows().length ? '' : '暂无聊天',
    };
  },

  wechatContactsPanelView() {
    return {
      rows: this.wechatContactRows(),
      emptyText: this.wechatContactEmptyText(),
    };
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatProfileCard() {
    const contact = this.wechatProfileContact?.() || {};
    return {
      id: contact.id || '',
      name: contact.name || '未命名联系人',
      subtitle: contact.relation || contact.subtitle || '微信联系人',
      avatarStyle: this.wechatAvatarStyle(contact),
      avatarText: this.wechatAvatarText(contact),
    };
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatProfileHeaderTitle() {
    if (this.wechatAlbumMode === 'album') {
      return '相册';
    }
    return this.wechatProfileCard().name;
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatMeCard() {
    const player = this.playerDisplayCharacter?.() || {};
    const name = player.name || '未命名角色';
    return {
      name,
      avatarText: String(name).slice(0, 1) || '我',
      subtitle: '微信号：' + (this.ensureWechatId?.() || ''),
    };
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatMeEntryRows() {
    const balance = Number(this.playerProfile?.wealthAmount || 0);
    return [
      {
        key: 'wallet',
        label: '钱包',
        value: `￥ ${balance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    ];
  },

  wechatProfileEntryRows() {
    return [
      {
        key: 'identity',
        label: '身份证',
        value: '>',
      },
      {
        key: 'album',
        label: '相册',
        value: '>',
      },
    ];
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatAlbumPhotoRows() {
    return (this.wechatAlbumPhotoList?.() || []).map((photo, index) => ({
      key: String(photo?.createdAt || index) + '-' + String(photo?.url || index),
      index,
      url: photo?.url || '',
      previewTitle: '相册照片',
      alt: '联系人照片',
      cropTitle: '截取头像',
      zoomTitle: '放大全屏',
      deleteLabel: '删除',
    }));
  },

  wechatAlbumEmptyState() {
    if (this.wechatAlbumGenerating) {
      return {
        show: true,
        loading: true,
        text: '生成中，约 30 秒',
      };
    }
    return {
      show: !this.wechatAlbumPhotoRows().length,
      loading: false,
      text: '暂无照片',
    };
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatAlbumToolbarState() {
    return {
      refreshLabel: '刷新',
      addPhotoLabel: this.wechatAlbumGenerating ? '生成中...' : '新增图片',
      disabled: !!this.wechatAlbumGenerating,
    };
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatAlbumDeleteConfirmView() {
    return {
      title: '是否删除',
      description: '仅从当前存档相册中移除这张图片；若它是形象图，不会删除本地 body-figures 文件夹中的图片和元数据。',
      cancelLabel: '取消',
      confirmLabel: '删除',
    };
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatAvatarCropView() {
    return {
      title: '截取微信头像',
      previewAlt: '头像裁剪预览',
      xLabel: '左右移动',
      yLabel: '上下移动',
      scaleLabel: '缩放',
      cancelLabel: '取消',
      confirmLabel: '保存头像',
    };
  },

  wechatAlbumDeleteConfirmDetailView() {
    return this.wechatAlbumDeleteConfirmView();
  },

  wechatAvatarCropDetailView() {
    return this.wechatAvatarCropView();
  },
});



window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatAlbumPromptChoiceView() {
    return {
      title: '选择生成状态',
      buttons: [
        { key: 'natural', kind: 'natural', label: '自然状态', disabled: !!this.wechatAlbumGenerating },
        { key: 'dressed', kind: 'dressed', label: '盛装状态', disabled: !!this.wechatAlbumGenerating },
        { key: 'custom', kind: 'custom', label: '自定义状态', disabled: !!this.wechatAlbumGenerating },
      ],
      cancelLabel: '取消',
      cancelDisabled: !!this.wechatAlbumGenerating,
    };
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatAlbumPromptListView() {
    const rows = (this.wechatAlbumPromptList?.() || []).map((item = {}) => ({
      key: item.id || ((item.kind || 'prompt') + '-' + (item.createdAt || '')),
      id: item.id,
      kindLabel: this.wechatAlbumKindLabel?.(item.kind) || '提示词',
      previewText: this.wechatAlbumPromptListPreview?.(item) || '',
    }));

    return {
      title: '选择绘图提示词',
      addLabel: '添加提示词',
      addDisabled: !!this.wechatAlbumGenerating,
      countText: '已保存 ' + rows.length + ' 条提示词',
      emptyTitle: '暂无提示词',
      emptyDescription: '请先返回素材页生成绘图提示词。',
      rows,
      backLabel: '返回素材',
      closeLabel: '关闭',
      actionDisabled: !!this.wechatAlbumGenerating,
    };
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  wechatAlbumPromptDetailView() {
    const selected = !!this.wechatAlbumSelectedPrompt?.();
    return {
      title: selected ? '编辑绘图提示词' : '添加绘图提示词',
      countText: this.wechatAlbumGenerating
        ? '正在生成图片，约 30 秒'
        : (selected ? '确认后将使用下面文本生成图片' : '填写后保存到提示词列表'),
      positiveLabel: '正向提示词',
      negativeLabel: '负面提示词',
      backLabel: '返回列表',
      submitLabel: selected ? '生成图片' : '保存提示词',
      actionDisabled: !!this.wechatAlbumGenerating,
    };
  },
});

window.GameModules.wechatViewHelpers = Object.assign(window.GameModules.wechatViewHelpers || {}, {
  setWechatTab(tab) {
    this.wechatTab = tab || 'chats';
    this.wechatView = 'home';
  },
});
