window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.materialDedup = {
  materialHash(text = '') {
    let hash = 0;
    String(text || '').split('').forEach((char) => { hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0; });
    return `material-${Math.abs(hash).toString(36)}`;
  },


  materialStableId(item = {}, fallback = '') {
    const text = `${item.id || item.eventId || ''}\n${item.title || ''}\n${item.text || ''}\n${fallback || ''}`;
    const explicit = String(item.eventId || item.id || '').trim()
      || (text.match(/记录编号[:：]\s*([^\n\s]+)/u) || [])[1]
      || (text.match(/"eventId"\s*:\s*"([^"]+)"/u) || [])[1]
      || (text.match(/"id"\s*:\s*"([^"]+)"/u) || [])[1];
    return String(explicit || this.materialHash(text)).trim();
  },


  materialSimilarityText(text = '') {
    return String(text || '')
      .replace(/记录编号[:：][^\n]+/gu, '')
      .replace(/[\s"'“”‘’`.,，。！？!?:：；;、()[\]{}<>《》|｜\-—_+=~～\\/]+/gu, '')
      .slice(0, 1000);
  },


  materialSimilarity(a = '', b = '') {
    const left = this.materialSimilarityText(a);
    const right = this.materialSimilarityText(b);
    if (!left || !right) return 0;
    const leftHead = left.slice(0, Math.min(90, left.length));
    const rightHead = right.slice(0, Math.min(90, right.length));
    if ((leftHead.length > 40 && right.includes(leftHead)) || (rightHead.length > 40 && left.includes(rightHead))) return 1;
    const grams = (text) => {
      const out = new Set();
      for (let i = 0; i < text.length - 1; i += 1) out.add(text.slice(i, i + 2));
      return out;
    };
    const aSet = grams(left), bSet = grams(right);
    if (!aSet.size || !bSet.size) return 0;
    let hit = 0;
    aSet.forEach((gram) => { if (bSet.has(gram)) hit += 1; });
    return hit / Math.min(aSet.size, bSet.size);
  },


  recentWorldlineReferenceEvents(store = null) {
    const line = store?.realWorldline?.() || {};
    const picked = [];
    let total = 0;
    for (const event of (line.events || []).slice().reverse()) {
      const text = `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
      const nextTotal = total + text.length;
      if (nextTotal > 6000) break;
      picked.push(event);
      total = nextTotal;
      if (total >= 5000) break;
    }
    return picked;
  },


  materialReferenceCandidates(store = null, loaded = [], current = []) {
    const worldline = this.recentWorldlineReferenceEvents(store).map((event) => ({
      id: this.materialStableId(event),
      label: `${event.name || '世界线记录'}｜${event.time || '未知时间'}`,
      text: `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`,
    }));
    const dynamic = [...loaded, ...current].map((item, index) => ({
      id: this.materialStableId(item, `loaded-${index}`),
      label: item.title || `已载入资料${index + 1}`,
      text: item.text || '',
    }));
    return [...worldline, ...dynamic].filter((item) => item.id && this.materialSimilarityText(item.text).length > 40);
  },


  materialReferenceFor(text = '', refs = []) {
    const id = this.materialStableId({ text });
    return refs.find((ref) => ref.id === id || this.materialSimilarity(text, ref.text) >= 0.82) || null;
  },


  materialReferenceText(ref = null) {
    return ref ? `文本内容参照${ref.id}(唯一id)\n参照对象：${ref.label}` : '';
  },


  normalizeMaterialToken(value = '') {
    return String(value || '').trim().replace(/\s+/g, '');
  },


  normalizeMaterialWorld(value = '') {
    const token = this.normalizeMaterialToken(value || window.GameModules.realWorld2026?.label || '现实世界');
    if (!token || token === '现实世界') return this.normalizeMaterialToken(window.GameModules.realWorld2026?.label || '现实世界');
    return token;
  },


  materialRequestKey(skill = '', method = '', params = {}, materials = window.GameModules.realWorldMaterials) {
    const cleanSkill = String(skill || '').trim();
    const cleanMethod = String(method || '').trim();
    const p = params && typeof params === 'object' ? params : {};
    const world = this.normalizeMaterialWorld(p.world || p.worldTag);
    if (cleanSkill === 'character.query') {
      const name = this.normalizeMaterialToken(p.name || p.characterName || p.characterId || p.target || '');
      if (name && (/searchCharacterProfile|CurrentCharacterStatus/u.test(cleanMethod))) return `${cleanSkill}:characterProfile:${world}:${name}`;
    }
    if (cleanSkill === 'realworld.location.query') {
      const location = this.normalizeMaterialToken(p.locationName || p.name || p.keyword || '');
      if (location && /getLocationDetail|searchLocation/u.test(cleanMethod)) return `${cleanSkill}:location:${world}:${location}`;
      if (cleanMethod === 'getCurrentLocationContext') return `${cleanSkill}:currentLocation:${world || 'default'}`;
    }
    const req = { skill: cleanSkill, method: cleanMethod, params: p };
    return materials?.keyOf?.(req) || `${cleanSkill}:${cleanMethod}:${JSON.stringify(p)}`;
  },

};
