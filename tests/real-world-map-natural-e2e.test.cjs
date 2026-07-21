const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const publishRoot = path.join(root, 'publish');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = path.normalize(path.join(publishRoot, pathname));
    if (!filePath.startsWith(publishRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType(filePath) });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}/index.html` });
    });
  });
}

async function waitReady(page) {
  await page.waitForFunction(() => !document.body.innerText.includes('正在加载核心模块'), null, { timeout: 90000 });
  await page.waitForFunction(() => Boolean(window.Alpine?.store?.('game')), null, { timeout: 90000 });
  await page.evaluate(async () => {
    await window.GameModules?.assetLoader?.ensureChunks?.(['gameplay'], window.Alpine.store('game'));
  });
  await page.waitForFunction(() => Boolean(
    window.GameModules?.realWorldMap
    && window.GameModules?.realWorldMapFog
    && window.GameModules?.jsonUtils
    && window.GameModules?.realWorldAi,
  ), null, { timeout: 90000 });
}

async function bootstrapScenario(page) {
  await page.evaluate(() => {
    const s = window.Alpine.store('game');
    const homeName = '锦苑小区3栋';
    Object.assign(s.playerProfile, {
      name: '刘悠',
      gender: '男',
      refinedCity: '四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋2单元601号',
      refinedLivingStatus: '与15岁三胞胎妹妹刘思瑶、刘思琪、刘思怡同住在锦苑小区3栋2单元601号',
      wealthTier: '中产',
      wealthAmount: 500000,
      relationships: '三胞胎妹妹：刘思瑶、刘思琪、刘思怡',
    });
    s.playerName = '刘悠';
    s.started = true;
    s.phoneSetupDone = true;
    s.homeScreenView = 'playing';
    s.realWorldOpen = true;
    s.realWorldBusy = false;
    s.loading = false;
    s.realWorldSceneTitle = '现实世界';
    s.realWorldLocationName = homeName;
    s.realWorldFunctionView = 'map';
    s.realWorldMapDebugMode = true;
    s.config = { ...(s.config || {}), realWorldMapDebug: true };
    s.selectedCharacterId = 'player-self';
    s.selectedWork = s.realWorldTag?.() || '2026 现代都市现实世界';
    s.validateRealWorldFreedom = () => true;
    s.realWorldWordCountValid = () => true;
    s.save = async () => {};
    s.realWorldLogStoreReady = true;
    window.GameModules.realWorldLogStore = {
      count: () => 0,
      append: async () => {},
      get: () => null,
      remove: async () => {},
    };
    s.realWorldMap = {
      current: homeName,
      currentId: 'home_legacy',
      mapAnchorId: 'home_legacy',
      nodes: [{
        id: 'home_legacy',
        name: homeName,
        mapVisible: true,
        revealed: true,
        visited: false,
        exteriorRingUnlocked: false,
        interiorLayout: { summary: '', zones: [] },
      }],
      edges: [],
      expanded: { home_legacy: true },
      infoNodeId: '',
      interiorNodeId: '',
      lastText: homeName,
    };
    window.GameModules.realWorldMap.ensure(s, s.playerProfile);
    const map = s.realWorldMap;
    const home = map.nodes.find((node) => node.id === 'home_legacy');
    home.visited = true;
    home.exteriorRingUnlocked = false;
    home.interiorLayout = { summary: '', zones: [] };
    map.current = homeName;
    map.currentId = home.id;
    map.mapAnchorId = home.id;
    map.nodes = [home];
    map.edges = [];
    window.__mapNaturalE2E = { unlockCalls: [], aiActions: [] };

    window.GameModules.realWorldAi.generate = async (store, _pack, actionText) => {
      const patchLike = /挪|打开|衣柜|床上/.test(String(actionText || ''));
      window.__mapNaturalE2E.aiActions.push(actionText);
      return {
        narration: patchLike
          ? '刘悠把书桌上的数学书和英语练习册挪到床上，又打开衣柜查看里面挂着的衣服。'
          : '刘悠站在家门口观察当前居住环境，确认楼层、601 户型、卧室、客厅、厨房和大件摆设的位置。',
        thinking: patchLike ? '识别为已知地点的物品容器变化。' : '识别为首次查看当前建筑内部。',
        settlementThinking: patchLike ? '需要提交局部 patch，不重写整套房。' : '需要提交 full JSON 首次持久化。',
        elapsedSeconds: 60,
        locationName: homeName,
        sceneTitle: '锦苑小区3栋',
        actionText,
        choices: [],
        status: patchLike ? '已调整房间物品' : '已观察居住环境',
      };
    };

    const originalGenerateJsonWithRetry = window.GameModules.jsonUtils.generateJsonWithRetry;
    window.GameModules.jsonUtils.generateJsonWithRetry = async (options = {}) => {
      if (options.source !== 'real-world-map-surround-unlock') {
        return originalGenerateJsonWithRetry(options);
      }
      const mode = String(options.prompt || '').includes('返回模式：patch') ? 'patch' : 'full';
      const raw = mode === 'patch'
        ? {
          responseMode: 'patch',
          reason: '正文确认书桌物品被挪到床上，且衣柜被打开查看。',
          patch: {
            interiorLayout: {
              floors: [{
                id: 'floor_6',
                rooms: [{
                  id: 'room_601',
                  number: '601',
                  slotObjects: {
                    liuyou_bedroom: [
                      { name: '靠窗单人床', containerContents: ['床单', '被子', '枕头', '数学书', '英语练习册'] },
                      { name: '白色衣柜', containerContents: ['校服外套', '连衣裙', '收纳盒', '刚查看过的备用被套'] },
                    ],
                  },
                }],
              }],
            },
          },
          surroundLocations: [],
        }
        : {
          responseMode: 'full',
          interiorLayout: {
            summary: '锦苑小区3栋已知为普通住宅楼，当前可确认第六层 601 的户内格局。',
            floors: [{
              id: 'floor_6',
              name: '第六层',
              rooms: [{
                id: 'room_601',
                number: '601',
                name: '601号',
                residents: ['刘悠', '刘思瑶', '刘思琪', '刘思怡'],
                ownerRefs: [{ type: 'character', id: 'player-self', name: '刘悠', role: '所属者' }],
                usageContracts: [{
                  id: 'contract_room_601_self_use',
                  type: 'self-use',
                  status: 'active',
                  billingCycle: 'monthly',
                  monthlyRent: 0,
                  currency: 'CNY',
                  debtAmount: 0,
                  basis: '自住房，使用权与所属权同属刘悠家庭。',
                  ownerRefs: [{ type: 'character', id: 'player-self', name: '刘悠', role: '所属者' }],
                  userRefs: [
                    { type: 'character', id: 'player-self', name: '刘悠', role: '使用者' },
                    { type: 'character', id: 'liu-siyao', name: '刘思瑶', role: '居住者' },
                    { type: 'character', id: 'liu-siqi', name: '刘思琪', role: '居住者' },
                    { type: 'character', id: 'liu-siyi', name: '刘思怡', role: '居住者' },
                  ],
                }],
                layout: {
                  width: 480,
                  height: 320,
                  shapes: [
                    { type: 'rect', id: 'liuyou_bedroom', x: 28, y: 36, w: 156, h: 108, label: '刘悠的卧室' },
                    { type: 'rect', id: 'sisters_bedroom', x: 206, y: 36, w: 230, h: 108, label: '三胞胎卧室' },
                    { type: 'rect', id: 'living', x: 42, y: 174, w: 210, h: 96, label: '客厅' },
                    { type: 'rect', id: 'kitchen', x: 282, y: 172, w: 78, h: 80, label: '厨房' },
                    { type: 'rect', id: 'bathroom', x: 374, y: 172, w: 72, h: 80, label: '卫生间' },
                  ],
                },
                slotObjects: {
                  liuyou_bedroom: [
                    { name: '靠窗单人床', x: 48, y: 58, w: 132, h: 76, containerContents: ['床单', '被子', '枕头'] },
                    { name: '白色衣柜', x: 48, y: 202, w: 112, h: 54, containerContents: ['校服外套', '连衣裙', '收纳盒'] },
                    { name: '书桌', x: 264, y: 62, w: 126, h: 54, containerContents: ['数学书', '英语练习册', '台灯'] },
                  ],
                  living: [
                    { name: '布艺沙发', x: 70, y: 196, w: 168, h: 58, containerContents: ['抱枕', '遥控器'] },
                  ],
                },
              }],
            }],
            zones: [],
          },
          surroundLocations: [{
            name: '锦苑小区4栋',
            parentName: '锦苑小区',
            granularity: 'building',
            descriptionFacts: ['位于3栋西侧，隔小区步道相邻。'],
            directNeighbor: true,
            noIntermediateLocations: true,
            intermediateLocations: [],
            distanceMeters: 45,
            distanceText: '约45米',
            basis: '同小区相邻楼栋步行距离。',
          }],
        };
      const payload = options.validate ? options.validate(raw) : raw;
      window.__mapNaturalE2E.unlockCalls.push({
        mode,
        raw,
        responseMode: payload.responseMode,
        interiorFloors: payload.interiorLayout?.floors?.length || 0,
        surroundLocationCount: payload.surroundLocations?.length || 0,
      });
      return payload;
    };
  });
}

async function submitNaturalAction(page, text) {
  const input = page.locator('input[x-model="$store.game.realWorldInput"]:visible').last();
  await input.fill(text);
  await input.press('Enter');
  await page.waitForFunction(() => window.Alpine?.store?.('game')?.realWorldBusy === true, null, { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => window.Alpine?.store?.('game')?.realWorldBusy === false, null, { timeout: 90000 });
}

async function readSummary(page) {
  return page.evaluate(() => {
    const s = window.Alpine.store('game');
    const map = s.realWorldMap || {};
    const anchor = (map.nodes || []).find((node) => node.id === map.mapAnchorId) || (map.nodes || [])[0] || {};
    const floors = anchor.interiorLayout?.floors || [];
    const room = floors.flatMap((floor) => floor.rooms || []).find((item) => item.id === 'room_601' || item.number === '601') || {};
    const normalizeObject = (item) => {
      if (!item) return null;
      if (typeof item === 'string') return { name: item, containerContents: [] };
      if (typeof item !== 'object') return null;
      const name = String(item.name || item.label || item.id || '').trim();
      if (!name) return null;
      return {
        ...item,
        name,
        containerContents: Array.isArray(item.containerContents) ? item.containerContents : [],
      };
    };
    const objectByName = new Map();
    Object.values(room.slotObjects || {}).forEach((items) => {
      (Array.isArray(items) ? items : []).forEach((item) => {
        const normalized = normalizeObject(item);
        if (normalized) objectByName.set(normalized.name, normalized);
      });
    });
    (room.layout?.shapes || []).forEach((shape) => {
      (Array.isArray(shape.objects) ? shape.objects : []).forEach((item) => {
        const normalized = normalizeObject(item);
        if (!normalized) return;
        const contents = shape.containerContentsByObject?.[normalized.id]
          || shape.containerContentsByObject?.[normalized.name]
          || normalized.containerContents;
        objectByName.set(normalized.name, { ...normalized, containerContents: Array.isArray(contents) ? contents : [] });
      });
    });
    const bedroomObjects = Array.from(objectByName.values());
    return {
      unlockCalls: window.__mapNaturalE2E?.unlockCalls || [],
      aiActions: window.__mapNaturalE2E?.aiActions || [],
      anchor: {
        id: anchor.id,
        name: anchor.name,
        exteriorRingUnlocked: Boolean(anchor.exteriorRingUnlocked),
        floors: floors.length,
        rooms: floors.reduce((sum, floor) => sum + (floor.rooms || []).length, 0),
        zones: anchor.interiorLayout?.zones?.length || 0,
      },
      room: {
        number: room.number,
        residents: room.residents || [],
        ownerRefs: room.ownerRefs || [],
        usageContracts: room.usageContracts || [],
        shapeCount: room.layout?.shapes?.length || 0,
        bedroomObjects,
      },
      debugTail: (s.realWorldMapSurroundUnlockDebugLog || []).slice(-40),
      bodyHasFog: document.body.innerText.includes('该建筑内部仍处于迷雾'),
      bodyHasFloor: /第六层|601号|刘悠的卧室|三胞胎卧室/.test(document.body.innerText),
      logTail: (s.realWorldLog || []).slice(-6).map((entry) => ({
        type: entry.type,
        text: entry.text || entry.playerText || '',
        narration: String(entry.narration || '').slice(0, 80),
        streaming: Boolean(entry.streaming),
      })),
    };
  });
}

(async () => {
  const { server, url } = await startStaticServer();
  const launchOptions = fs.existsSync(chromePath)
    ? { headless: true, executablePath: chromePath }
    : { headless: true };
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage({ viewport: { width: 430, height: 1200 } });
    const consoleRows = [];
    page.on('console', (message) => {
      const text = message.text();
      if (/电子地图周围解锁Debug|real-world-map-interior|pageerror|错误|失败/.test(text)) {
        consoleRows.push({ type: message.type(), text: text.slice(0, 2000) });
      }
    });
    page.on('pageerror', (error) => consoleRows.push({ type: 'pageerror', text: String(error && error.stack || error).slice(0, 2000) }));
    await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    await waitReady(page);
    await bootstrapScenario(page);

    await submitNaturalAction(page, '我先观察当前居住环境，看看这栋楼的楼层、601户型和卧室、客厅、厨房、床、书桌、衣柜分别在哪。');
    const afterFull = await readSummary(page);
    if (afterFull.anchor.exteriorRingUnlocked !== true || afterFull.anchor.floors < 1 || !afterFull.room.bedroomObjects.some((item) => item.name === '书桌')) {
      console.log(JSON.stringify({ phase: 'afterFull-debug', afterFull, consoleRows: consoleRows.slice(-20) }, null, 2));
    }
    assert.strictEqual(afterFull.unlockCalls.length, 1);
    assert.strictEqual(afterFull.unlockCalls[0].mode, 'full');
    assert.strictEqual(afterFull.anchor.exteriorRingUnlocked, true);
    assert.ok(afterFull.anchor.floors >= 1);
    assert.ok(afterFull.room.shapeCount >= 3);
    assert.ok(afterFull.room.bedroomObjects.some((item) => item.name === '书桌'));
    assert.ok(afterFull.room.ownerRefs.length >= 1);
    assert.ok(afterFull.room.usageContracts.length >= 1);
    assert.strictEqual(afterFull.anchor.zones, 0);

    await submitNaturalAction(page, '我把书桌上的数学书和英语练习册挪到床上，然后打开衣柜看看里面挂着什么衣服。');
    const afterPatch = await readSummary(page);
    if (afterPatch.unlockCalls.length !== 2 || afterPatch.unlockCalls[1]?.mode !== 'patch') {
      console.log(JSON.stringify({ phase: 'afterPatch-debug', afterPatch, consoleRows: consoleRows.slice(-30) }, null, 2));
    }
    assert.strictEqual(afterPatch.unlockCalls.length, 2);
    assert.strictEqual(afterPatch.unlockCalls[1].mode, 'patch');
    assert.ok(afterPatch.anchor.floors >= 1);
    assert.ok(afterPatch.room.shapeCount >= 3);
    const bed = afterPatch.room.bedroomObjects.find((item) => item.name === '靠窗单人床');
    const wardrobe = afterPatch.room.bedroomObjects.find((item) => item.name === '白色衣柜');
    if (!bed?.containerContents?.includes('数学书') || !wardrobe?.containerContents?.includes('刚查看过的备用被套')) {
      console.log(JSON.stringify({ phase: 'afterPatch-contents-debug', afterPatch, bed, wardrobe, consoleRows: consoleRows.slice(-30) }, null, 2));
    }
    assert.ok(bed?.containerContents?.includes('数学书'));
    assert.ok(bed?.containerContents?.includes('英语练习册'));
    assert.ok(wardrobe?.containerContents?.includes('刚查看过的备用被套'));
    assert.strictEqual(afterPatch.bodyHasFog, false);

    console.log(JSON.stringify({
      pass: true,
      url,
      afterFull: {
        unlockCalls: afterFull.unlockCalls,
        anchor: afterFull.anchor,
        room: {
          residents: afterFull.room.residents,
          ownerRefs: afterFull.room.ownerRefs.length,
          usageContracts: afterFull.room.usageContracts.length,
          shapeCount: afterFull.room.shapeCount,
          bedroomObjects: afterFull.room.bedroomObjects.map((item) => item.name),
        },
      },
      afterPatch: {
        unlockCalls: afterPatch.unlockCalls,
        anchor: afterPatch.anchor,
        bedContents: bed.containerContents,
        wardrobeContents: wardrobe.containerContents,
        bodyHasFog: afterPatch.bodyHasFog,
        bodyHasFloor: afterPatch.bodyHasFloor,
      },
      consoleRows: consoleRows.slice(-20),
    }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
