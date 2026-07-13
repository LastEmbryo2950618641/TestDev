import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..', '..');
const args = new Set(process.argv.slice(2));
const mode = args.has('--file') ? 'file' : 'http';
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const targetUrl = mode === 'file'
  ? `${pathToFileURL(path.resolve(projectRoot, 'publish/index.html')).href}?validation=${Date.now()}`
  : `http://127.0.0.1:8000/index.html?validation=${Date.now()}`;

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const page = await browser.newPage();
const badResponses = [];
const pageErrors = [];
const consoleIssues = [];

page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) {
    const text = msg.text();
    consoleIssues.push({ type: msg.type(), text });
    console.log(`[console-${msg.type()}]`, text);
  }
});
page.on('pageerror', (err) => {
  const message = err?.message || String(err);
  pageErrors.push(message);
  console.log('[pageerror]', message);
});
page.on('response', (res) => {
  if (res.status() >= 400) {
    const req = res.request();
    badResponses.push({ url: res.url(), status: res.status(), type: req.resourceType(), method: req.method() });
  }
});

await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2500);
await page.locator('button.primary-btn').first().click();
await page.waitForTimeout(1200);
const createBtn = page.locator('section.phone-setup-screen:visible .activation-home button.activation-choice').filter({ hasText: 'Create New Identity' }).first();
if (await createBtn.count()) await createBtn.click();
await page.waitForTimeout(1200);

const result = await page.evaluate(async () => {
  const game = window.Alpine.store('game');
  const cfg = window.GameModules.playerAspirationConfig;
  await game.completePlayerSetup();
  game.aspirationDraft = { ...game.aspirationDraft, alignment: cfg.alignments?.[0]?.id || 'lawful_good' };
  const categories = cfg.psychPreferenceCategories || [];
  let psych = cfg.migratePsychPreferences(game.aspirationDraft.psychPreferences || cfg.defaultPsychPreferences());
  const selected = { ...(psych.selected || {}) };
  for (let i = 0; i < categories.length; i += 1) {
    const category = categories[i];
    game.aspirationStep = 5;
    game.aspirationPsychStep = i + 1;
    await game.ensureAspirationPsychTags(category.id);
    psych = cfg.migratePsychPreferences(game.aspirationDraft.psychPreferences || cfg.defaultPsychPreferences());
    const entries = cfg.psychCategoryGroupKeys(category);
    const bySelectKey = new Map();
    for (const entry of entries) {
      if (!bySelectKey.has(entry.selectKey)) bySelectKey.set(entry.selectKey, []);
      bySelectKey.get(entry.selectKey).push(entry.key);
    }
    for (const [selectKey, optionKeys] of bySelectKey.entries()) {
      const merged = [];
      for (const optionKey of optionKeys) {
        const options = Array.isArray(psych.options?.[optionKey]) ? psych.options[optionKey] : [];
        for (const tag of options) {
          if (!merged.includes(tag)) merged.push(tag);
          if (merged.length >= 3) break;
        }
        if (merged.length >= 3) break;
      }
      selected[selectKey] = merged.slice(0, 3);
    }
    game.aspirationDraft = { ...game.aspirationDraft, psychPreferences: { ...psych, selected: { ...selected }, options: { ...(psych.options || {}) }, custom: { ...(psych.custom || {}) } } };
  }
  game.aspirationGoalDraft = {
    short: 'Keep daily life stable and observe changes.',
    medium: 'Build clear boundaries and durable routines.',
    long: 'Create a sustainable direction for the real-world timeline.',
    summary: 'Prioritize stability, clarity, and continuity.',
  };
  game.aspirationSummaryDraft = { portrait: 'The player pursues long-term order with a stable and practical style.' };
  game.aspirationStep = 7;
  await game.confirmPlayerAspiration();
  await game.confirmControl();
  const startedAt = Date.now();
  while (game.busy && Date.now() - startedAt < 45000) await new Promise((resolve) => setTimeout(resolve, 250));
  const shared = game.sharedControlState?.();
  const saveSlotApiNames = ['openSlot', 'loadSlot', 'overwriteSlot', 'newSlot'];
  const settingsSummaryApiNames = [
    'stage1MaterialIterationModeText',
    'textProviderSummaryLabel',
    'textModelSummaryLabel',
    'drawProviderSummaryLabel',
    'drawModelSummaryLabel',
    'stage3OutputSummaryLabel',
    'currentSettingsSummaryParts',
    'currentSettingsSummaryText',
  ];
  const companyViewApiNames = [
    'companyFields',
    'currentWorkAttendance',
    'companyPayPanelView',
    'companyHeaderView',
    'companyAttendanceView',
    'companyPayPreviewView',
  ];
  const wechatChatApiNames = [
    'selectWechatContact',
    'wechatMessageKey',
    'wechatMessages',
    'updateWechatLatest',
    'appendWechatMessage',
    'wechatMessageTime',
    'wechatMemoryTime',
    'wechatDialogueTimeLabel',
    'formatWechatDialogueLog',
    'wechatTimeValue',
    'wechatTimeDisplay',
    'wechatContactProfileText',
    'validateWechatReply',
    'fallbackWechatReply',
  ];
  return {
    started: game.started,
    online: game.online,
    busy: game.busy,
    entrySetupOpen: game.entrySetupOpen,
    logLength: game.log?.length || 0,
    sceneTitle: game.sceneTitle,
    character: { id: game.character?.id || '', name: game.character?.name || '', work: game.character?.work || '' },
    sharedControl: shared ? { id: shared.id, name: shared.name || shared.profile?.name || '' } : null,
    activeControlTarget: game.activeControlTargetState?.() ? { id: game.activeControlTargetState().id, name: game.activeControlTargetName?.() || '' } : null,
    hasActiveControlTarget: game.hasActiveControlTarget?.() || false,
    desktopTaskTitle: game.desktopTaskTitle?.() || '',
    desktopTaskSubtitle: game.desktopTaskSubtitle?.() || '',
    hasLoop: typeof window.GameModules.realWorldAgentLoop?.runStory === 'function',
    hasMemoryFlow: typeof window.GameModules.characterMemory?.recordTurn === 'function',
    hasSaveSlotApi: saveSlotApiNames.every((name) => typeof game[name] === 'function'),
    hasSettingsSummaryApi: settingsSummaryApiNames.every((name) => typeof game[name] === 'function'),
    hasCompanyViewApi: companyViewApiNames.every((name) => typeof game[name] === 'function'),
    hasWechatChatApi: wechatChatApiNames.every((name) => typeof game[name] === 'function'),
    hasWechatChatReplyHelpers: typeof window.GameModules.app?.wechat?.chatReplyHelpers?.validateWechatReply === 'function',
    hasWechatChatOrchestration: typeof window.GameModules.app?.wechat?.chatOrchestration?.sendWechatMessage === 'function',
    hasWechatChatPromptHelpers: typeof window.GameModules.app?.wechat?.chatPromptHelpers?.wechatReplyPrompt === 'function',
    hasWechatHistoryContextHelpers: typeof window.GameModules.app?.wechat?.historyContextHelpers?.wechatHistoryContextForReply === 'function',
    hasWechatMentionReferenceHelpers: typeof window.GameModules.app?.wechat?.mentionReferenceHelpers?.wechatMentionedImages === 'function',
    hasWechatImageRecordHelpers: typeof window.GameModules.app?.wechat?.imageRecordHelpers?.wechatImageRecordText === 'function',
    hasWechatImageUiHelpers: typeof window.GameModules.app?.wechat?.imageUiHelpers?.openWechatImageConfirm === 'function',
    hasWechatImageAlbumHelpers: typeof window.GameModules.app?.wechat?.imageAlbumHelpers?.wechatRealPhotoForContact === 'function',
    hasWechatImagePromptHelpers: typeof window.GameModules.app?.wechat?.imagePromptHelpers?.buildWechatImageTags === 'function',
    choices: (game.choices || []).map((item) => item.text || item).slice(0, 4),
    feedbackSource: game.feedbackSource || '',
  };
});

const expectedAuthErrors = consoleIssues.filter((item) => /AUTH_REQUIRED|DeepSeek API Key/.test(item.text));
const unexpectedIssues = consoleIssues.filter((item) => !/AUTH_REQUIRED|DeepSeek API Key|AI 推演失败|人物设定生成失败|AI补全失败|role card generation unavailable|请求未完成/.test(item.text));
const ok = result.started === true && result.online === true && result.busy === false && result.hasActiveControlTarget === true && result.hasLoop === true && result.hasMemoryFlow === true && result.hasSaveSlotApi === true && result.hasSettingsSummaryApi === true && result.hasCompanyViewApi === true && result.hasWechatChatApi === true && result.hasWechatChatReplyHelpers === true && result.hasWechatChatOrchestration === true && result.hasWechatChatPromptHelpers === true && result.hasWechatHistoryContextHelpers === true && result.hasWechatMentionReferenceHelpers === true && result.hasWechatImageRecordHelpers === true && result.hasWechatImageUiHelpers === true && result.hasWechatImageAlbumHelpers === true && result.hasWechatImagePromptHelpers === true && badResponses.length === 0 && pageErrors.length === 0 && unexpectedIssues.length === 0;

console.log(JSON.stringify({ mode, targetUrl, ok, result, badResponses, pageErrors, expectedAuthErrors: expectedAuthErrors.length, unexpectedIssues }, null, 2));
await browser.close();
if (!ok) process.exit(1);
