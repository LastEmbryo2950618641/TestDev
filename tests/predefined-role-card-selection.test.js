const assert = require('assert');
const fs = require('fs');
const test = require('node:test');
const vm = require('vm');

function loadPredefinedRoleCardsModule(data) {
  const code = fs.readFileSync('publish/predefined-role-cards.js', 'utf8');
  const context = {
    console,
    window: {
      GameModules: {
        predefinedRoleCardData: data,
        predefinedRoleCardActions: {
          cloneRoleCardForEditing: (card) => JSON.parse(JSON.stringify(card)),
        },
        playerAspirationConfig: {},
        appearanceProfileTags: null,
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window.GameModules;
}

test('predefined role card selection dedupes by role card id, not file key or name', async () => {
  const modules = loadPredefinedRoleCardsModule({
    first_file_name: { id: 'same-role-id', name: '甲', role: 'A' },
    second_file_name: { id: 'same-role-id', name: '甲复制', role: 'B' },
    third_file_name: { id: 'other-role-id', name: '乙', role: 'C' },
  });
  const tool = modules.predefinedRoleCards;
  const cards = await tool.loadAll();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(cards.map((card) => `${card.id}:${card.name}`))), [
    'same-role-id:甲',
    'other-role-id:乙',
  ]);

  const store = {
    phoneSetupDone: false,
    roleCardSetup: {
      cards,
      selectedPlayerId: 'same-role-id',
      selectedPlayerName: '甲',
      selectedCardIds: cards.map((card) => tool.roleCardId(card)),
      selectedCardId: '',
    },
  };
  Object.assign(store, modules.predefinedRoleCardActions);
  store.syncInitialCardPicker();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(store.selectedInitialRoleCards().map((card) => card.id))), ['other-role-id']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(store.availableInitialRoleCards().map((card) => card.id))), []);
});
