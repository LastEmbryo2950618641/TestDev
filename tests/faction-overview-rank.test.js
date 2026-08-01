const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadFactionOrgActions() {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        orgTerritory: {},
      },
    },
  });
  context.window.window = context.window;
  const otCode = fs.readFileSync(path.join(__dirname, '..', 'publish/org-territory-system.js'), 'utf8');
  vm.runInContext(otCode, context, { filename: 'publish/org-territory-system.js' });
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish/faction-org-actions.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/faction-org-actions.js' });
  return context.window.GameModules.factionOrgActions;
}

function loadOrgTerritory() {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {},
    },
  });
  context.window.window = context.window;
  const otCode = fs.readFileSync(path.join(__dirname, '..', 'publish/org-territory-system.js'), 'utf8');
  vm.runInContext(otCode, context, { filename: 'publish/org-territory-system.js' });
  return context.window.GameModules.orgTerritory;
}

test('faction overview scores use scale-dependent ceilings and ratio stability', () => {
  const ot = loadOrgTerritory();
  const familyOverview = ot.normalizeFactionOverview({
    livelihood: { value: 70, max: 100, level: '较强', comment: '家庭稳定' },
    economy: { value: 70, max: 100, level: '一般', comment: '收入稳定' },
    military: { value: 70, max: 100, level: '弱', comment: '家庭安保' },
    reputation: { value: 70, max: 100, level: '友善', comment: '邻里平稳' },
  }, { name: '刘悠家庭', type: '家庭', scale: '成员4人', classification: 'community' });
  assert.strictEqual(familyOverview.livelihood.max, 80);
  assert.strictEqual(familyOverview.economy.max, 92);
  assert.strictEqual(familyOverview.military.max, 84);
  assert.strictEqual(familyOverview.reputation.max, 68);
  assert.strictEqual(familyOverview.reputation.value, 68);
  assert.strictEqual(familyOverview.composite.max, 83);
  assert.strictEqual(familyOverview.stability.value, 84);

  const countryOverview = ot.normalizeFactionOverview({
    livelihood: { value: 70, max: 100, level: '弱', comment: '民生承压' },
    economy: { value: 70, max: 100, level: '弱', comment: '经济承压' },
    military: { value: 70, max: 100, level: '弱', comment: '军事有限' },
    reputation: { value: 70, max: 100, level: '一般', comment: '声誉普通' },
  }, { name: '测试共和国', type: '国家', level: '国家级', classification: 'country' });
  assert.strictEqual(countryOverview.livelihood.max, 10000);
  assert.strictEqual(countryOverview.composite.max, 10425);
  assert.strictEqual(countryOverview.stability.value, 1);
});

test('country ideology panel always reserves five fields and stays fogged when only legitimacy placeholder exists', () => {
  const actions = loadFactionOrgActions();
  const faction = {
    id: 'country-china',
    name: '中华人民共和国',
    classification: 'country',
    solid: {
      overviewPanels: {
        ideology: {
          legitimacy: { value: 0, unit: '/100' },
        },
        economy: { entries: {} },
        politics: { entries: {} },
        military: { entries: {} },
        diplomacy: { entries: {} },
      },
    },
  };
  const store = {
    ...actions,
    selectedFaction: () => faction,
  };
  const ideologyCard = store.buildFactionCapabilityCards(faction).find((card) => card.dim === 'ideology');
  assert.ok(ideologyCard);
  assert.strictEqual(ideologyCard.entries.length, 5);
  assert.strictEqual(ideologyCard.entries.map((entry) => entry.name).join(','), 'core,reason,description,base,legitimacy');
  assert.strictEqual(ideologyCard.statusLabel, '1/5项');
  assert.strictEqual(ideologyCard.rankLabel, '迷雾未展开');
  assert.strictEqual(ideologyCard.entries.find((entry) => entry.name === 'core').display, '待推演补全');
  assert.strictEqual(ideologyCard.entries.find((entry) => entry.name === 'legitimacy').display, '0/100');
});

test('country economy panel always reserves the fixed checklist fields', () => {
  const actions = loadFactionOrgActions();
  const faction = {
    id: 'country-china',
    name: '中华人民共和国',
    classification: 'country',
    solid: {
      overviewPanels: {
        ideology: { legitimacy: { value: 0, unit: '/100' } },
        economy: {
          entries: {
            gdp: { value: '18万亿美元 USD（约120万亿元 人民币）（消费+投资+净出口）' },
            institutions: {
              value: [
                { name: '中国人民银行', description: '中央银行' },
              ],
            },
          },
        },
        politics: { entries: {} },
        military: { entries: {} },
        diplomacy: { entries: {} },
      },
    },
  };
  const store = {
    ...actions,
    selectedFaction: () => faction,
  };
  const economyCard = store.buildFactionCapabilityCards(faction).find((card) => card.dim === 'economy');
  assert.ok(economyCard);
  assert.strictEqual(economyCard.entries.length, 10);
  assert.strictEqual(
    economyCard.entries.map((entry) => entry.name).join(','),
    'gdp,income,expenditure,assets,resources,production,system,institutions,laws,works',
  );
  assert.strictEqual(economyCard.statusLabel, '2/10项');
  assert.ok(String(economyCard.entries.find((entry) => entry.name === 'gdp').display).includes('USD'));
  assert.ok(String(economyCard.entries.find((entry) => entry.name === 'institutions').display).includes('中国人民银行'));
  assert.strictEqual(economyCard.entries.find((entry) => entry.name === 'income').display, '待推演补全');
});

test('country politics panel always reserves the fixed checklist fields', () => {
  const actions = loadFactionOrgActions();
  const faction = {
    id: 'country-china',
    name: '中华人民共和国',
    classification: 'country',
    solid: {
      overviewPanels: {
        ideology: { legitimacy: { value: 0, unit: '/100' } },
        economy: { entries: {} },
        politics: {
          entries: {
            regime: { value: '人民代表大会制度' },
            institutions: {
              value: [
                { name: '全国人民代表大会', description: '最高国家权力机关' },
              ],
            },
          },
        },
        military: { entries: {} },
        diplomacy: { entries: {} },
      },
    },
  };
  const store = {
    ...actions,
    selectedFaction: () => faction,
  };
  const politicsCard = store.buildFactionCapabilityCards(faction).find((card) => card.dim === 'politics');
  assert.ok(politicsCard);
  assert.strictEqual(politicsCard.entries.length, 10);
  assert.strictEqual(
    politicsCard.entries.map((entry) => entry.name).join(','),
    'regime,powerStructure,rulemaking,adjudication,execution,participation,leadership,institutions,laws,works',
  );
  assert.strictEqual(politicsCard.statusLabel, '2/10项');
  assert.strictEqual(politicsCard.entries.find((entry) => entry.name === 'regime').display, '人民代表大会制度');
  assert.ok(String(politicsCard.entries.find((entry) => entry.name === 'institutions').display).includes('全国人民代表大会'));
  assert.strictEqual(politicsCard.entries.find((entry) => entry.name === 'leadership').display, '待推演补全');
});

test('country military panel always reserves checklist and formats top formation forces json', () => {
  const actions = loadFactionOrgActions();
  const faction = {
    id: 'country-china',
    name: '中华人民共和国',
    classification: 'country',
    solid: {
      overviewPanels: {
        ideology: { legitimacy: { value: 0, unit: '/100' } },
        economy: { entries: {} },
        politics: { entries: {} },
        military: {
          entries: {
            posture: { value: '常备军国家，以防卫与区域威慑为主，当前战备偏防御维稳。' },
            forces: {
              value: [
                {
                  name: '第一集团军',
                  commander: '张伟(司令员)',
                  deputy: '李强(政委)',
                  staff: '王勇(参谋长)',
                  size: '约10万人',
                  arms: '陆军70%、火箭军20%、后勤10%',
                  task: '拱卫首都并承担北部防线',
                },
              ],
            },
          },
        },
        diplomacy: { entries: {} },
      },
    },
  };
  const store = {
    ...actions,
    selectedFaction: () => faction,
  };
  const militaryCard = store.buildFactionCapabilityCards(faction).find((card) => card.dim === 'military');
  assert.ok(militaryCard);
  assert.strictEqual(militaryCard.entries.length, 10);
  assert.strictEqual(
    militaryCard.entries.map((entry) => entry.name).join(','),
    'posture,forces,personnel,quality,sustainment,projection,equipment,institutions,laws,works',
  );
  assert.strictEqual(militaryCard.statusLabel, '2/10项');
  const forcesDisplay = String(militaryCard.entries.find((entry) => entry.name === 'forces').display);
  assert.ok(forcesDisplay.includes('- 第一集团军'));
  assert.ok(forcesDisplay.includes('张伟(司令员)'));
  assert.ok(forcesDisplay.includes('兵种构成：陆军70%、火箭军20%、后勤10%'));
  assert.ok(forcesDisplay.includes('当前任务：拱卫首都并承担北部防线'));
  assert.strictEqual(militaryCard.entries.find((entry) => entry.name === 'personnel').display, '待推演补全');
});

test('country diplomacy panel always reserves fixed checklist and formats ally list', () => {
  const actions = loadFactionOrgActions();
  const faction = {
    id: 'country-china',
    name: '中华人民共和国',
    classification: 'country',
    solid: {
      overviewPanels: {
        ideology: { legitimacy: { value: 0, unit: '/100' } },
        economy: { entries: {} },
        politics: { entries: {} },
        military: { entries: {} },
        diplomacy: {
          entries: {
            posture: { value: '以周边与大国关系为重点，强调多边参与与发展导向，当前基调稳健进取。' },
            allies: {
              value: [
                {
                  name: '俄罗斯',
                  description: '全面战略协作伙伴；高层互访与军技合作',
                  viewOfSelf: '视我为可靠战略协作方',
                },
              ],
            },
            presence: { value: '大使馆约170余；总领馆约90余；联合国等国际组织常驻代表齐全' },
          },
        },
      },
    },
  };
  const store = {
    ...actions,
    selectedFaction: () => faction,
  };
  const diplomacyCard = store.buildFactionCapabilityCards(faction).find((card) => card.dim === 'diplomacy');
  assert.ok(diplomacyCard);
  assert.strictEqual(diplomacyCard.entries.length, 10);
  assert.strictEqual(
    diplomacyCard.entries.map((entry) => entry.name).join(','),
    'posture,orientation,allies,rivals,memberships,treaties,presence,institutions,laws,works',
  );
  assert.strictEqual(diplomacyCard.statusLabel, '3/10项');
  const alliesDisplay = String(diplomacyCard.entries.find((entry) => entry.name === 'allies').display);
  assert.ok(alliesDisplay.includes('俄罗斯'));
  assert.ok(alliesDisplay.includes('全面战略协作伙伴'));
  assert.ok(alliesDisplay.includes('对自己的看法'));
  assert.ok(alliesDisplay.includes('可靠战略协作方'));
  assert.strictEqual(diplomacyCard.entries.find((entry) => entry.name === 'orientation').display, '待推演补全');
});

test('country territory panel replaces structure section with ruling region checklist', () => {
  const actions = loadFactionOrgActions();
  const faction = {
    id: 'country-china',
    name: '中华人民共和国',
    classification: 'country',
    solid: {
      overviewPanels: {
        ideology: { legitimacy: { value: 0, unit: '/100' } },
        economy: { entries: {} },
        politics: { entries: {} },
        military: { entries: {} },
        diplomacy: { entries: {} },
        territory: {
          entries: {
            capital: { value: '北京' },
            area: { value: '约960万平方千米' },
            population: { value: '约14亿人' },
            adminDivision: { value: '省-市-县/区-乡/镇' },
            regions: {
              value: [
                {
                  name: '四川省',
                  capital: '成都',
                  area: '约48.6万平方千米',
                  controlRate: '96%',
                  controlReason: '省级行政体系稳定',
                  population: '约8300万人',
                  description: '经济中心与粮食基地',
                  garrison: '第一集团军驻军',
                },
              ],
            },
          },
        },
      },
    },
  };
  const store = {
    ...actions,
    selectedFaction: () => faction,
  };
  const entries = store.factionTerritoryEntries();
  assert.strictEqual(entries.length, 5);
  assert.strictEqual(entries.map((entry) => entry.name).join(','), 'capital,area,population,adminDivision,regions');
  assert.strictEqual(entries.find((entry) => entry.name === 'capital').display, '北京');
  const regionsDisplay = String(entries.find((entry) => entry.name === 'regions').display);
  assert.ok(regionsDisplay.includes('四川省'));
  assert.ok(regionsDisplay.includes('省会成都'));
  assert.ok(regionsDisplay.includes('控制率96%(省级行政体系稳定)'));
  assert.ok(regionsDisplay.includes('经济中心与粮食基地'));
  assert.ok(regionsDisplay.includes('第一集团军驻军'));
});

(async () => {
  for (const item of tests) {
    await item.fn();
    console.log(`PASS ${item.name}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
