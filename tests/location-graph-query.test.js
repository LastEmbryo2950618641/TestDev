const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadScript(context, relativePath) {
  vm.runInNewContext(read(relativePath), context, { filename: relativePath });
}

function makeContext() {
  const context = {
    window: {
      GameModules: {
        realWorldAgentContext: {},
        realWorldMap: {
          cleanName(value) {
            return String(value || '').replace(/[\n\r|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
          },
          ensure(state) { return state.realWorldMap; },
          isAbstractName(name) { return !String(name || '').trim(); },
          render() { return '地图'; },
          factTime() { return '现在'; },
        },
      },
    },
    console,
  };
  loadScript(context, 'publish/real-world-location-graph.js');
  loadScript(context, 'publish/real-world-location-graph-skills.js');
  return context;
}

function makeState() {
  return {
    realWorldMap: {
      currentId: 'home_legacy',
      nodes: [
        {
          id: 'home_legacy',
          name: '锦苑小区3栋',
          mapVisible: true,
          interiorLayout: {
            floors: [
              {
                id: 'floor_2',
                name: '第二层',
                rooms: [
                  {
                    id: 'room_202',
                    number: '202',
                    name: '202',
                    layout: {
                      shapes: [
                        {
                          id: 'siqi_bedroom',
                          label: '刘思琪的卧室',
                          objects: [
                            { id: 'desk', name: '书桌', containerContents: ['台灯', '笔记本'] },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
        { id: 'shop_legacy', name: '小区门口便利店', mapVisible: true },
      ],
      edges: [
        { from: 'home_legacy', to: 'shop_legacy', distanceMeters: 85, distanceText: '约85米', basis: '小区主路步行' },
      ],
    },
  };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('imports legacy map into globally incremented location graph ids', () => {
  const context = makeContext();
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = makeState();
  const graph = graphApi.ensureGraphState(state);
  const legacyHomeId = graph.legacyAliases['mapId:home_legacy'];
  const legacyShopId = graph.legacyAliases['mapId:shop_legacy'];
  assert.match(legacyHomeId, /^loc_\d+$/);
  assert.match(legacyShopId, /^loc_\d+$/);
  assert.notStrictEqual(legacyHomeId, 'home_legacy');
  assert.notStrictEqual(legacyShopId, 'shop_legacy');
  const nextId = graphApi.allocateLocationNodeId(state);
  assert.match(nextId, /^loc_\d+$/);
  assert.ok(!graph.nodesById[nextId], 'allocation returns a fresh id for caller to use');
});

test('projecting graph POIs reuses legacy map node by display name and identity', () => {
  const context = makeContext();
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = {
    realWorldMap: {
      currentId: 'legacy_home',
      nodes: [
        { id: 'legacy_home', name: 'Home Building', mapVisible: true },
      ],
      edges: [],
    },
  };
  const graph = graphApi.ensureGraphState(state);
  const newNode = {
    id: 'loc_99',
    type: 'poi',
    name: 'Home Building',
    displayName: 'Home Building',
    identityKey: graphApi.identityKeyFor({ type: 'poi', parentId: '', name: 'Home Building' }),
    mapVisible: true,
  };
  graph.nodesById[newNode.id] = newNode;
  if (!graph.poiGraph.nodes.includes(newNode.id)) graph.poiGraph.nodes.push(newNode.id);
  graphApi.projectLocationGraphToLegacyMap(state);
  const homeNodes = state.realWorldMap.nodes.filter((node) => node.name === 'Home Building');
  assert.strictEqual(homeNodes.length, 1);
  assert.strictEqual(homeNodes[0].id, 'legacy_home');
  assert.strictEqual(homeNodes[0].graphNodeId, 'loc_99');
});

test('projecting graph POIs compacts polluted long-address duplicate display nodes', () => {
  const context = makeContext();
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = {
    realWorldMap: {
      currentId: 'long_home',
      mapAnchorId: 'long_home',
      nodes: [
        {
          id: 'long_home',
          name: 'Sichuan Chengdu Wuhou Yulin Community Home Building',
          mapVisible: true,
          visited: true,
          interiorLayout: { floors: [{ id: 'floor_6', rooms: [{ id: 'room_601', name: '601' }] }] },
        },
        {
          id: 'short_home',
          name: 'Home Building',
          mapVisible: true,
        },
      ],
      edges: [{ from: 'long_home', to: 'short_home' }],
    },
  };
  graphApi.compactProjectedMapDisplayNodes(state, state.realWorldMap);
  assert.strictEqual(state.realWorldMap.nodes.length, 1);
  assert.strictEqual(state.realWorldMap.nodes[0].id, 'short_home');
  assert.strictEqual(state.realWorldMap.nodes[0].name, 'Home Building');
  assert.strictEqual(state.realWorldMap.nodes[0].visited, true);
  assert.strictEqual(state.realWorldMap.nodes[0].interiorLayout.floors.length, 1);
  assert.strictEqual(state.realWorldMap.currentId, 'short_home');
  assert.deepStrictEqual(state.realWorldMap.edges, []);
});

test('audit patch nodes are indexed for strict reuse', () => {
  const context = makeContext();
  const skills = context.window.GameModules.realWorldLocationGraphSkills;
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = { realWorldMap: { currentId: '', nodes: [], edges: [] } };
  const node = skills.mergeAuditNode(state, { tempRef: 'poi_home', type: 'poi', name: 'Audit Home' }, 'poi', '', {});
  assert.ok(node.id);
  assert.strictEqual(graphApi.findStrictNode(state, { name: 'Audit Home', type: 'poi' })?.id, node.id);
  assert.ok(graphApi.searchNode(state, 'Audit Home').some((item) => item.id === node.id));
});

test('searches interior nodes and returns full path', () => {
  const context = makeContext();
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = makeState();
  const [bedroom] = graphApi.searchNode(state, '刘思琪');
  assert.ok(bedroom, 'bedroom zone should be indexed');
  assert.strictEqual(bedroom.type, 'zone');
  const pathText = graphApi.pathText(state, bedroom.id);
  assert.ok(pathText.includes('锦苑小区3栋'));
  assert.ok(pathText.includes('第二层'));
  assert.ok(pathText.includes('202'));
  assert.ok(pathText.includes('刘思琪的卧室'));
});

test('nearby BFS climbs from interior node to owning POI', () => {
  const context = makeContext();
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = makeState();
  const [bedroom] = graphApi.searchNode(state, '刘思琪');
  const nearby = graphApi.nearbyBfs(state, bedroom.id, 1);
  assert.strictEqual(nearby.length, 1);
  assert.strictEqual(nearby[0].node.name, '小区门口便利店');
  assert.strictEqual(nearby[0].edge.distanceMeters, 85);
});

test('node ensure reuses hits and defers unknown creation during phase zero', () => {
  const context = makeContext();
  const skills = context.window.GameModules.realWorldLocationGraphSkills;
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = makeState();
  const bedroom = graphApi.allNodes(state).find((node) => node.type === 'zone');
  const reuse = skills.nodeEnsure(state, { nodeId: bedroom.id });
  assert.strictEqual(reuse.decision, 'reuse-existing');
  assert.ok(reuse.nodeId);
  assert.ok(reuse.queryEvidence[0].hitNodeIds.includes(reuse.nodeId));
  const defer = skills.nodeEnsure(state, { targetKeyword: '不存在的新地点' });
  assert.strictEqual(defer.decision, 'defer-unknown');
  assert.strictEqual(defer.changedNodeIds.length, 0);
});

test('location graph ensure uses strict ids and identity keys instead of fuzzy name matching', () => {
  const context = makeContext();
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const skills = context.window.GameModules.realWorldLocationGraphSkills;
  const state = makeState();

  const first = graphApi.ensurePoiFromPayload(state, { name: 'Strict Building 3', parentName: 'Strict Community' }, { skipProject: true });
  const second = graphApi.ensurePoiFromPayload(state, { name: 'Strict Building 3', parentName: 'Strict Community' }, { skipProject: true });
  assert.strictEqual(second.id, first.id);
  assert.ok(first.identityKey, 'created POI should expose a stable identity key');
  assert.strictEqual(graphApi.getNode(state, first.identityKey).id, first.id);

  const partial = skills.nodeEnsure(state, { targetKeyword: 'Strict Building' });
  assert.strictEqual(partial.decision, 'defer-unknown', 'ensure must not reuse partial fuzzy name hits');

  const exact = skills.nodeEnsure(state, { identityKey: first.identityKey, targetKeyword: 'Strict Building' });
  assert.strictEqual(exact.decision, 'reuse-existing');
  assert.strictEqual(exact.nodeId, first.id);
});

test('node ensure async applies explicit real-agent patch with code allocated ids', async () => {
  const context = makeContext();
  const skills = context.window.GameModules.realWorldLocationGraphSkills;
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = makeState();
  context.window.GameModules.renderPrompt = async () => { throw new Error('node ensure should not render a hidden audit prompt'); };
  context.window.GameModules.jsonUtils = { generateJsonWithRetry: async () => { throw new Error('node ensure should not request hidden AI audit'); } };
  const payload = {
        patchType: 'location-tree-audit-fill',
        audit: {
          decision: 'create-new',
          queriedBeforeDecision: true,
          isComplete: true,
          reason: 'new building is needed',
          queryEvidenceRefs: ['qe_1'],
        },
        patch: {
          poiGraphPatch: {
            nodes: [
              { tempRef: 'poi_new', type: 'poi', name: 'New Building 5', displayName: 'New Building 5', mapVisible: true },
            ],
            edges: [
              { from: 'existing:home_legacy', to: 'poi_new', distanceMeters: 30, distanceText: '30m', basis: 'direct neighbor' },
            ],
          },
          interiorsPatch: [
            {
              targetPoiRef: 'poi_new',
              floors: [
                {
                  tempRef: 'floor_1',
                  name: 'First Floor',
                  rooms: [
                    {
                      tempRef: 'room_101',
                      name: '101',
                      zones: [
                        {
                          tempRef: 'zone_bedroom',
                          name: 'Bedroom',
                          objects: [
                            {
                              tempRef: 'object_bed',
                              name: 'Bed',
                              containerItems: [
                                { tempRef: 'item_sheet', name: 'Sheet' },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

  const result = await skills.nodeEnsureAsync(state, {
    stage: 'stage4',
    targetKeyword: 'New Building 5',
    currentLegacyLocationName: 'home_legacy',
    requiredScope: ['direct-neighbor-poi', 'floor-room-layout'],
    auditFillPayload: payload,
  });

  assert.strictEqual(result.decision, 'create-new');
  assert.match(result.nodeId, /^loc_\d+$/);
  assert.notStrictEqual(result.nodeId, 'poi_new');
  const created = graphApi.getNode(state, result.nodeId);
  assert.strictEqual(created.name, 'New Building 5');
  assert.ok(graphApi.searchNode(state, 'Sheet', 20, { includeTypes: ['container-item'] }).some((node) => node.type === 'container-item'));
  assert.ok(graphApi.nearbyBfs(state, result.nodeId, 1).some((row) => row.node.id === graphApi.getNode(state, 'home_legacy').id));
  const legacyNode = state.realWorldMap.nodes.find((node) => node.id === result.nodeId);
  assert.ok(legacyNode, 'AI-created graph POI should be projected into legacy realWorldMap nodes for the UI');
  assert.strictEqual(legacyNode.name, 'New Building 5');
  assert.ok(state.realWorldMap.edges.some((edge) => edge.from === result.nodeId || edge.to === result.nodeId));
  assert.strictEqual(legacyNode.interiorLayout.floors[0].name, 'First Floor');
  assert.strictEqual(legacyNode.interiorLayout.floors[0].rooms[0].name, '101');
  const bedroomShape = legacyNode.interiorLayout.floors[0].rooms[0].layout.shapes.find((shape) => shape.label === 'Bedroom');
  assert.ok(bedroomShape, 'projected room layout should include AI-created zone shape');
  const bedObject = bedroomShape.objects.find((object) => object.name === 'Bed');
  assert.deepStrictEqual(Array.from(bedObject.containerContents), ['Sheet']);
});

test('node ensure async without explicit patch returns query gap without hidden AI audit', async () => {
  const context = makeContext();
  const skills = context.window.GameModules.realWorldLocationGraphSkills;
  const state = makeState();
  context.window.GameModules.renderPrompt = async () => { throw new Error('node ensure should not render hidden audit prompt'); };
  context.window.GameModules.jsonUtils = { generateJsonWithRetry: async () => { throw new Error('node ensure should not request hidden AI audit'); } };
  const params = {
    stage: 'stage1',
    targetKeyword: 'Unresolved Neighbor',
    currentLegacyLocationName: 'home_legacy',
    requiredScope: ['poi-neighbors', 'direct-neighbor-edges'],
  };
  const first = await skills.nodeEnsureAsync(state, params);
  const second = await skills.nodeEnsureAsync(state, {
    ...params,
    targetKeyword: 'Unresolved Neighbor different wording',
    visibleNeed: 'different wording should still not burn hidden audit tokens',
  });
  assert.strictEqual(first.decision, 'defer-unknown');
  assert.strictEqual(second.decision, 'defer-unknown');
  assert.strictEqual(first.needsExplicitPatch, true);
  assert.strictEqual(second.needsExplicitPatch, true);
  assert.strictEqual(first.hiddenAuditSkipped, true);
  assert.strictEqual(second.hiddenAuditSkipped, true);
});



test('audit interiors support nested rooms and function zones with projected detail layouts', async () => {
  const context = makeContext();
  const skills = context.window.GameModules.realWorldLocationGraphSkills;
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = makeState();
  context.window.GameModules.renderPrompt = async () => { throw new Error('node ensure should not render hidden audit prompt'); };
  context.window.GameModules.jsonUtils = { generateJsonWithRetry: async () => { throw new Error('node ensure should not request hidden AI audit'); } };
  const nestedPayload = {
        patchType: 'location-tree-audit-fill',
        audit: { decision: 'create-new', queriedBeforeDecision: true, isComplete: true, reason: 'nested interior' },
        patch: {
          poiGraphPatch: { nodes: [{ tempRef: 'poi_nested', type: 'poi', name: 'Nested Building' }], edges: [] },
          interiorsPatch: [{
            targetPoiRef: 'poi_nested',
            floors: [{
              tempRef: 'floor_nested',
              name: 'First Floor',
              rooms: [{
                tempRef: 'room_nested',
                name: 'Suite 101',
                zones: [{
                  tempRef: 'zone_living',
                  name: 'Living Area',
                  zones: [{
                    tempRef: 'zone_reading',
                    name: 'Reading Nook',
                    objects: [{ tempRef: 'object_bookshelf', name: 'Bookshelf', containerItems: [{ tempRef: 'item_album', name: 'Photo Album' }] }],
                  }],
                  rooms: [{
                    tempRef: 'room_inner',
                    name: 'Inner Storage Room',
                    objects: [{ tempRef: 'object_box', name: 'Storage Box' }],
                  }],
                }],
              }],
            }],
          }],
        },
      };
  const result = await skills.nodeEnsureAsync(state, { targetKeyword: 'Nested Building', auditFillPayload: nestedPayload });
  assert.match(result.nodeId, /^loc_\d+$/);
  assert.ok(graphApi.searchNode(state, 'Reading Nook').some((node) => node.type === 'zone'));
  assert.ok(graphApi.searchNode(state, 'Inner Storage Room').some((node) => node.type === 'room'));
  assert.ok(graphApi.searchNode(state, 'Photo Album', 20, { includeTypes: ['container-item'] }).some((node) => node.type === 'container-item'));
  const legacyNode = state.realWorldMap.nodes.find((node) => node.name === 'Nested Building');
  const livingShape = legacyNode.interiorLayout.floors[0].rooms[0].layout.shapes.find((shape) => shape.label === 'Living Area');
  assert.ok(livingShape.detailLayout, 'nested area should project to a detail layout for click-through display');
  assert.ok(livingShape.detailLayout.shapes.some((shape) => shape.label === 'Reading Nook'));
  assert.ok(livingShape.detailLayout.shapes.some((shape) => shape.label === 'Inner Storage Room'));
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  const areaRegion = { id: livingShape.id, label: livingShape.label, shape: livingShape };
  const detail = context.window.GameModules.realWorldMapInterior.roomAreaDetailLayout(legacyNode.interiorLayout.floors[0].rooms[0], areaRegion);
  assert.ok(detail.shapes.some((shape) => shape.label === 'Reading Nook'));
});

test('property index and monthly rent settlement update character cards and debt events', () => {
  const context = makeContext();
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = {
    calendarState: { events: [] },
    rpgStates: {
      tenant: { id: 'tenant', profile: { name: 'Tenant', money: 200 } },
      owner: { id: 'owner', profile: { name: 'Owner', money: 10 } },
      broke: { id: 'broke', profile: { name: 'Broke Tenant', money: 50 } },
    },
    locationGraph: graphApi.emptyGraph(),
  };
  const graph = graphApi.ensureGraphState(state);
  graph.nodesById.loc_1 = {
    id: 'loc_1',
    type: 'room',
    name: 'Rental Room 101',
    ownerRefs: [{ type: 'character', id: 'owner', name: 'Owner' }],
    usageContracts: [{
      id: 'rent_ok',
      status: 'active',
      billingCycle: 'monthly',
      monthlyRent: 100,
      debtAmount: 0,
      userRefs: [{ type: 'character', id: 'tenant', name: 'Tenant' }],
      ownerRefs: [{ type: 'character', id: 'owner', name: 'Owner' }],
    }],
  };
  graph.nodesById.loc_2 = {
    id: 'loc_2',
    type: 'room',
    name: 'Rental Room 102',
    ownerRefs: [{ type: 'character', id: 'owner', name: 'Owner' }],
    usageContracts: [{
      id: 'rent_debt',
      status: 'active',
      billingCycle: 'monthly',
      monthlyRent: 100,
      debtAmount: 0,
      userRefs: [{ type: 'character', id: 'broke', name: 'Broke Tenant' }],
      ownerRefs: [{ type: 'character', id: 'owner', name: 'Owner' }],
    }],
  };

  const indexed = graphApi.rebuildCharacterPropertyIndex(state);
  assert.strictEqual(indexed.owner.properties.realWorldProperties.owned.length, 2);
  assert.strictEqual(indexed.tenant.properties.realWorldProperties.using[0].nodeId, 'loc_1');

  const result = graphApi.settleUsageContracts(state, '2026-07-17');
  assert.strictEqual(result.settled.length, 1);
  assert.strictEqual(result.debts.length, 1);
  assert.strictEqual(state.rpgStates.tenant.profile.money, 100);
  assert.strictEqual(state.rpgStates.owner.profile.money, 110);
  assert.strictEqual(graph.nodesById.loc_2.usageContracts[0].debtAmount, 100);
  const debtEvent = state.calendarState.events.find((event) => event.type === 'rent-arrears' && event.nodeId === 'loc_2');
  assert.ok(debtEvent);
  assert.strictEqual(debtEvent.time, '2026-07-18');
});

test('character schedule location update binds known current node id', () => {
  const context = makeContext();
  loadScript(context, 'publish/update/generic-update-applier.js');
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = makeState();
  const node = graphApi.ensurePoiFromPayload(state, { name: 'Known Schedule Place' }, { skipProject: true });
  context.window.GameModules.orgTerritory = { bumpOrgExposureOnScheduleLocation() {} };
  const applied = context.window.GameModules.updateRegistry.applyCharacterScheduleUpdate(state, {
    updateType: 'character-schedule',
    subject: { type: 'character', id: 'siqi', name: 'Siqi' },
    change: { mode: 'merge', value: { currentLocation: 'Known Schedule Place', availability: '在场', reason: 'arrived' } },
  });
  assert.strictEqual(applied, true);
  assert.strictEqual(state.characterSchedules.siqi.currentNodeId, node.id);
  assert.strictEqual(graphApi.getCharacterCurrentNode(state, 'siqi').id, node.id);
});



test('real world result application invokes property contract settlement hook', () => {
  const source = read('publish/real-world-actions.js');
  assert.ok(source.includes('realWorldLocationGraph?.settleUsageContracts?.'), 'real-world result apply should settle rents and debts after phone time advances');
  assert.ok(source.includes('房产合同'), 'settlement summary should mention property contracts when changes occur');
});

test('identity fields include owned and used real-world properties', () => {
  const context = makeContext();
  loadScript(context, 'publish/player-identity-actions.js');
  const store = {
    identityTargetId: 'tenant',
    rpgStates: {
      tenant: {
        id: 'tenant',
        profile: { name: 'Tenant', work: 'Reality', role: 'Resident' },
        properties: {
          realWorldProperties: {
            owned: [{ nodeId: 'loc_1', path: 'City/Building 1', monthlyRentIncome: 2000, users: ['User A'] }],
            using: [{ nodeId: 'loc_2', path: 'City/Building 2/Room 201', monthlyRentCost: 1000, owners: ['Owner A'] }],
          },
        },
      },
    },
    roleCardReasonGetter() { return () => ''; },
  };
  Object.assign(store, context.window.GameModules.playerIdentityActions);
  const fields = store.identityTargetFields();
  const owned = fields.find((field) => field.label === '所有房产');
  const using = fields.find((field) => field.label === '使用房产');
  assert.ok(owned.value.includes('Building 1'));
  assert.ok(owned.value.includes('标识:loc_1'));
  assert.ok(owned.value.includes('+2000租金'));
  assert.ok(using.value.includes('Room 201'));
  assert.ok(using.value.includes('标识:loc_2'));
  assert.ok(using.value.includes('-1000租金'));
});

test('stage1 JSON parser rejects skill-method material request objects', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-agent-loop.js');
  const payload = {
    patchType: 'location-tree-audit-fill',
    audit: { decision: 'create-new', queriedBeforeDecision: true, isComplete: true, reason: 'explicit' },
    patch: { poiGraphPatch: { nodes: [{ tempRef: 'poi_explicit', name: 'Explicit Building' }], edges: [] }, interiorsPatch: [] },
  };
  const raw = JSON.stringify({
    plan: '地点查询后由 real-agent-context 自行补全',
    status: '继续请求资料',
    sceneQueries: { location: [], causality: [], conflict: [] },
    participants: { forced: [], priority: [], drama: [], forbidden: [] },
    factions: [],
    randomEvents: [],
    randomIntrusionCondition: '无明确条件则禁止闯入',
    materialRequests: [{
      skill: 'realworld.property.node.ensure',
      method: 'nodeEnsureAsync',
      params: { stage: 'stage1', targetKeyword: 'Explicit Building', auditFillPayload: payload },
    }],
  });
  assert.throws(() => context.window.GameModules.realWorldAgentLoop.parseGuidedStepJson(raw), /materialRequests 每项必须/);
});

test('material loader dispatches node ensure through async audit entry', async () => {
  const context = makeContext();
  let calledMethod = '';
  context.window.GameModules.realWorldLocationGraphSkills.query = (store, method, params) => {
    calledMethod = method;
    assert.strictEqual(params.targetKeyword, 'New Building 5');
    return Promise.resolve('async ensure text');
  };
  loadScript(context, 'publish/inference/material-loader.js');
  const text = await context.window.GameModules.realWorldAgentContextParts.materialLoader.dispatch(
    makeState(),
    'go to new building',
    'realworld.property.node.ensure',
    'nodeEnsure',
    { targetKeyword: 'New Building 5' },
    { step: 4 },
  );
  assert.strictEqual(calledMethod, 'nodeEnsureAsync');
  assert.strictEqual(text, 'async ensure text');
});

test('material loader delegates realworld location queries to real-agent context location skill', async () => {
  const context = makeContext();
  let delegated = null;
  context.window.GameModules.realWorldAgentContext.location = async (store, method, params, action, options) => {
    delegated = { method, params, action, options };
    return 'delegated location text';
  };
  loadScript(context, 'publish/inference/material-loader.js');
  const text = await context.window.GameModules.realWorldAgentContextParts.materialLoader.dispatch(
    makeState(),
    'go to unknown building',
    'realworld.location.query',
    'searchLocationOne',
    { keyword: 'Unknown Building' },
    { step: 1, label: '现实' },
  );
  assert.strictEqual(text, 'delegated location text');
  assert.strictEqual(delegated.method, 'searchLocationOne');
  assert.strictEqual(delegated.params.keyword, 'Unknown Building');
  assert.strictEqual(delegated.options.phase, 'stage1');
  assert.strictEqual(delegated.options.queryOnly, true);
  assert.strictEqual(delegated.options.noAudit, true);
});

test('material location query miss returns empty json without hidden audit fill', async () => {
  const context = makeContext();
  context.window.GameModules.renderPrompt = async (promptId) => {
    if (promptId === 'location-tree-audit-fill') throw new Error('location query should not trigger hidden audit fill');
    return '';
  };
  context.window.GameModules.jsonUtils = { generateJsonWithRetry: async () => { throw new Error('location query should not request AI JSON'); } };
  loadScript(context, 'publish/prompts/materials/real-world-material-query.js');
  loadScript(context, 'publish/real-world-agent-location-fill.js');
  loadScript(context, 'publish/inference/material-loader.js');
  const text = await context.window.GameModules.realWorldAgentContextParts.materialLoader.dispatch(
    makeState(),
    'go to unknown building',
    'realworld.location.query',
    'searchLocationOne',
    { keyword: 'Unknown Building' },
    { step: 1, label: '现实' },
  );
  const result = JSON.parse(text);
  assert.strictEqual(result.hit, false);
  assert.strictEqual(result.result, null);
  assert.strictEqual(result.nextSkill, undefined);
  assert.ok(result.note.includes('Stage1 不补地图'));
  assert.ok(result.note.includes('Stage4'));
});

test('location skills document query miss then stage4 persistence flow', () => {
  const locationSkill = read('publish/skills/real-world-location-query/SKILL.md');
  const propertySkill = read('publish/skills/real-world-property-query/SKILL.md');
  const materials = read('publish/prompts/materials/real-world-materials.js');
  assert.ok(locationSkill.includes('hit:false'));
  assert.ok(locationSkill.includes('result:null'));
  assert.ok(locationSkill.includes('Stage1'));
  assert.ok(locationSkill.includes('Stage4'));
  assert.ok(propertySkill.includes('Stage1'));
  assert.ok(propertySkill.includes('Stage4'));
  assert.ok(!propertySkill.includes('auditFillPayload'));
  assert.ok(!materials.includes('property-node-ensure'));
});

test('real-agent context does not expose stage1 location ensure requests', () => {
  const loop = read('publish/real-world-agent-loop.js');
  const materials = read('publish/prompts/materials/real-world-materials.js');
  const catalog = read('publish/inference/material-request-catalog.js');
  assert.ok(!loop.includes('ctx.actionLocationForStep?.'), 'stage1 loop should not auto-launch a separate location audit outside material requests');
  assert.ok(!loop.includes('对象式 materialRequests'));
  assert.ok(!materials.includes("id: 'property-node-ensure'"));
  assert.ok(!catalog.includes("skill: 'realworld.property.node.ensure'"));
});

test('location fill reuses graph hit before legacy AI fill', async () => {
  const context = makeContext();
  context.window.GameModules.renderPrompt = async () => {
    throw new Error('legacy AI fill should not run when graph hits');
  };
  context.window.GameModules.jsonUtils = { generateJsonWithRetry: async () => { throw new Error('should not run'); } };
  loadScript(context, 'publish/real-world-agent-location-fill.js');
  const state = makeState();
  const text = await context.window.GameModules.realWorldAgentContext.fillCharacterLocation(state, '刘思琪的卧室', '去找刘思琪');
  assert.ok(text.includes('地点图已命中'));
  assert.ok(text.includes('刘思琪的卧室'));
});


test('location fill defers unknown target without hidden graph audit or legacy add prompt', async () => {
  const context = makeContext();
  context.window.GameModules.renderPrompt = async () => {
    throw new Error('location fill should not start hidden AI prompts when explicit graph patch is missing');
  };
  context.window.GameModules.jsonUtils = {
    parseLoose(text) { return JSON.parse(text); },
    async generateJsonWithRetry() { throw new Error('location fill should not request hidden AI JSON'); },
  };
  loadScript(context, 'publish/real-world-agent-location-fill.js');
  const state = makeState();
  const text = await context.window.GameModules.realWorldAgentContext.fillCharacterLocation(
    state,
    'Unknown Target Building',
    'go to unknown target',
    { phase: 'stage1' },
  );
  assert.ok(text.includes('Unknown Target Building'));
  assert.ok(!state.realWorldMap.nodes.some((node) => node.name === 'Unknown Target Building'));
});



test('location fill defers when graph audit defers instead of legacy add prompt', async () => {
  const context = makeContext();
  context.window.GameModules.renderPrompt = async (promptId) => {
    if (promptId === 'real-world-map-location-add') throw new Error('legacy location add prompt should not run when graph audit defers');
    if (promptId === 'location-tree-audit-fill') return 'audit prompt';
    return '';
  };
  context.window.GameModules.jsonUtils = {
    parseLoose(text) { return JSON.parse(text); },
    async generateJsonWithRetry(options) {
      return options.validate({
        patchType: 'location-tree-audit-fill',
        audit: { decision: 'defer-unknown', queriedBeforeDecision: true, isComplete: false, reason: 'not enough evidence' },
        patch: { poiGraphPatch: { nodes: [], edges: [] }, interiorsPatch: [] },
      });
    },
  };
  loadScript(context, 'publish/real-world-agent-location-fill.js');
  const text = await context.window.GameModules.realWorldAgentContext.fillCharacterLocation(
    makeState(),
    'Deferred Unknown Building',
    'go somewhere vague',
    { phase: 'stage1' },
  );
  assert.ok(text.includes('暂不新增'));
  assert.ok(text.includes('等待 real-agent-context') || text.includes('显式') || text.includes('暂不新增')); 
});

test('stage4 surround unlock creates graph neighbor without location audit polling', async () => {
  const context = makeContext();
  context.window.GameModules.orgTerritory = { ensureMapControls() {} };
  context.window.GameModules.realWorldMap.upsertNode = () => {
    throw new Error('legacy upsertNode should not run for stage4 surround unlock');
  };
  context.window.GameModules.realWorldMap.applyRouteLinks = () => {};
  context.window.GameModules.realWorldMap.isMapDisplayNode = () => true;
  context.window.GameModules.realWorldMap.resolveExteriorAnchorNode = (map, node) => node;
  let auditPromptCalled = false;
  context.window.GameModules.renderPrompt = async (promptId) => {
    if (promptId === 'location-tree-audit-fill') {
      auditPromptCalled = true;
      throw new Error('stage4 surround unlock should not call location-tree-audit-fill');
    }
    return '';
  };
  context.window.GameModules.jsonUtils = {
    parseLoose(text) { return JSON.parse(text); },
    async generateJsonWithRetry(options) {
      return options.validate({
        patchType: 'location-tree-audit-fill',
        audit: { decision: 'create-new', queriedBeforeDecision: true, isComplete: true, reason: 'stage4-neighbor' },
        patch: {
          poiGraphPatch: {
            nodes: [{ tempRef: 'neighbor', type: 'poi', name: 'Stage4 Neighbor Building', displayName: 'Stage4 Neighbor Building' }],
            edges: [{ from: 'existing:home_legacy', to: 'neighbor', distanceMeters: 18, distanceText: '18m', basis: 'direct next door' }],
          },
          interiorsPatch: [],
        },
      });
    },
  };
  loadScript(context, 'publish/real-world-map-fog.js');
  const state = makeState();
  const map = state.realWorldMap;
  const anchor = map.nodes[0];
  const unlocked = await context.window.GameModules.realWorldMapFog.applySurroundUnlock(state, map, anchor, anchor, {
    surroundLocations: [{ name: 'Stage4 Neighbor Building', descriptionFacts: ['next door'], distanceMeters: 18, distanceText: '18m', directNeighbor: true, noIntermediateLocations: true }],
  });
  assert.strictEqual(auditPromptCalled, false);
  assert.ok(unlocked.includes('Stage4 Neighbor Building'));
  const standardGraph = context.window.GameModules.realWorldLocationGraph.standardPoiGraph(state);
  assert.ok(standardGraph.nodes.some((node) => node.name === 'Stage4 Neighbor Building'));
});

test('stage4 surround unlock merges directly into standard graph', async () => {
  const context = makeContext();
  context.window.GameModules.orgTerritory = { ensureMapControls() {} };
  context.window.GameModules.realWorldMap.isMapDisplayNode = () => true;
  context.window.GameModules.realWorldMap.resolveExteriorAnchorNode = (map, node) => node;
  loadScript(context, 'publish/real-world-map-fog.js');
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  graphApi.projectLocationGraphToLegacyMap = () => {
    throw new Error('stage4 surround unlock must not project into legacy map');
  };
  const state = makeState();
  const map = state.realWorldMap;
  const anchor = map.nodes[0];
  const surroundLocations = Array.from({ length: 6 }, (_, index) => ({
    name: `Batch Neighbor Building ${index + 1}`,
    parentName: anchor.name,
    descriptionFacts: [`neighbor ${index + 1}`],
    distanceMeters: 20 + index,
    distanceText: `${20 + index}m`,
    directNeighbor: true,
    noIntermediateLocations: true,
  }));

  const unlocked = await context.window.GameModules.realWorldMapFog.applySurroundUnlock(state, map, anchor, anchor, { surroundLocations });

  assert.strictEqual(unlocked.length, 6);
  const standardGraph = graphApi.standardPoiGraph(state);
  assert.strictEqual(standardGraph.nodes.filter((node) => node.name.startsWith('Batch Neighbor Building')).length, 6);
  assert.strictEqual(standardGraph.edges.filter((edge) => edge.from !== edge.to).length >= 6, true);
});

test('stage4 graph-style unlock payload is ignored by strict interior merge path', () => {
  const context = makeContext();
  context.window.GameModules.realWorldMap.isInteriorLocationName = () => false;
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const payload = fog.validateUnlockPayload({
    patchType: 'location-tree-audit-fill',
    audit: { decision: 'patch-existing', queriedBeforeDecision: true, isComplete: true, reason: 'details unlocked' },
    poiGraphPatch: { nodes: [], edges: [] },
    interiorsPatch: [{ targetPoiRef: 'existing:home_legacy', floors: [{ name: 'First Floor' }] }],
  }, { id: 'home_legacy', name: 'Home Building' }, {}, 'full');
  assert.strictEqual(payload.auditFillPayload, undefined);
  assert.strictEqual(payload.interiorLayout, undefined);
  assert.strictEqual(payload.noChange, true);
});

test('stage4 simple unlock JSON persists neighbor and location info only', async () => {
  const context = makeContext();
  context.window.GameModules.orgTerritory = { ensureMapControls() {} };
  context.window.GameModules.realWorldMap.applyRouteLinks = () => {};
  context.window.GameModules.realWorldMap.isMapDisplayNode = () => true;
  context.window.GameModules.realWorldMap.isInteriorLocationName = () => false;
  context.window.GameModules.realWorldMap.isMapExteriorNode = () => true;
  context.window.GameModules.realWorldMap.resolveExteriorAnchorNode = (map, node) => node;
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const state = {
    realWorldMap: {
      currentId: 'home_legacy',
      current: '锦苑小区3栋',
      nodes: [{ id: 'home_legacy', name: '锦苑小区3栋', mapVisible: true, revealed: true }],
      edges: [],
    },
  };
  const map = state.realWorldMap;
  const anchor = map.nodes[0];
  const payload = context.window.GameModules.realWorldMapFog.validateUnlockPayload({
    当前节点: '刘思琪房间-锦苑小区3栋',
    周围地点: [{ 地点名: '锦苑小区门口便利店', 距离: '80m' }],
    势力: ['锦苑小区物业·社区管理组织·楼栋管理'],
    地点信息: ['1. 当前节点周围有小区步道。'],
  }, anchor, map, 'full');

  await context.window.GameModules.realWorldMapFog.applySurroundUnlock(state, map, anchor, anchor, payload);

  assert.strictEqual(anchor.interiorLayout?.floors, undefined);
  assert.ok(anchor.descriptionFacts.includes('1. 当前节点周围有小区步道。'));
  assert.ok(anchor.descriptionFacts.includes('势力：锦苑小区物业·社区管理组织·楼栋管理'));
  const standardGraph = context.window.GameModules.realWorldLocationGraph.standardPoiGraph(state);
  assert.ok(!standardGraph.nodes.some((node) => node.name === '刘思琪房间-锦苑小区3栋'));
  assert.ok(standardGraph.nodes.some((node) => node.name === '锦苑小区3栋'));
  assert.ok(standardGraph.nodes.some((node) => node.name === '锦苑小区门口便利店'));
  assert.ok(standardGraph.edges.some((edge) => edge.distanceText === '80m'));
});

test('stage4 simple unlock ignores interior patch payloads', async () => {
  const context = makeContext();
  context.window.GameModules.orgTerritory = { ensureMapControls() {} };
  context.window.GameModules.realWorldMap.applyRouteLinks = () => {};
  context.window.GameModules.realWorldMap.isMapDisplayNode = () => true;
  context.window.GameModules.realWorldMap.isInteriorLocationName = () => false;
  context.window.GameModules.realWorldMap.resolveExteriorAnchorNode = (map, node) => node;
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const state = {
    realWorldMap: {
      currentId: 'home_legacy',
      current: '锦苑小区3栋',
      nodes: [{
        id: 'home_legacy',
        name: '锦苑小区3栋',
        mapVisible: true,
        revealed: true,
        exteriorRingUnlocked: true,
        interiorLayout: {
          summary: '已有结构',
          zones: [],
          floors: [{
            id: 'floor_1',
            name: '第一层',
            rooms: [
              {
                id: 'room_101',
                number: '101',
                name: '101号',
                layout: { width: 480, height: 320, shapes: [{ id: 'bedroom_area', label: '卧室', x: 40, y: 40, w: 120, h: 90 }] },
                slotObjects: {
                  bedroom_area: [{ id: 'bed_101', name: '床', containerContents: ['床单', '枕头'] }],
                },
              },
              { id: 'room_102', number: '102', name: '102号', layout: { width: 480, height: 320, shapes: [] } },
            ],
          }],
        },
      }],
      edges: [],
    },
  };
  const map = state.realWorldMap;
  const anchor = map.nodes[0];
  const payload = context.window.GameModules.realWorldMapFog.validateUnlockPayload({
    responseMode: 'patch',
    patch: {
      interiorLayout: {
        floors: [{
          id: 'floor_1',
          rooms: [{
            id: 'room_101',
            number: '101',
            slotObjects: {
              bedroom_area: [
                { id: 'bed_101', name: '床', containerContents: ['床单', '枕头', '刚放下的手机'] },
                { id: 'wardrobe_101', name: '衣柜', containerContents: ['校服', '外套'] },
              ],
            },
          }],
        }],
      },
    },
    周围地点: [],
    势力: ['刘悠一家·家庭势力·居住单元'],
    地点信息: ['1. 只记录当前节点周边事实。'],
  }, anchor, map, 'patch');

  await context.window.GameModules.realWorldMapFog.applySurroundUnlock(state, map, anchor, anchor, payload);

  const floor = anchor.interiorLayout.floors.find((item) => item.id === 'floor_1');
  const room101 = floor.rooms.find((room) => room.id === 'room_101');
  const room102 = floor.rooms.find((room) => room.id === 'room_102');
  const bed = room101.slotObjects.bedroom_area.find((item) => item.id === 'bed_101');
  assert.ok(room102, 'incremental patch must not delete untouched rooms');
  assert.deepStrictEqual(Array.from(bed.containerContents), ['床单', '枕头']);
  assert.strictEqual(room101.slotObjects.bedroom_area.length, 1);
  assert.ok(anchor.descriptionFacts.includes('1. 只记录当前节点周边事实。'));
  assert.ok(anchor.descriptionFacts.includes('势力：刘悠一家·家庭势力·居住单元'));
});




test('interior drawer renders only selected node json without graph hydration', () => {
  const context = makeContext();
  context.document = { addEventListener() {}, removeEventListener() {} };
  context.window.document = context.document;
  context.window.requestAnimationFrame = (callback) => callback();
  context.window.GameModules.orgTerritory = { ensureMapControls() {} };
  context.window.GameModules.realWorldMap.applyRouteLinks = () => {};
  context.window.GameModules.realWorldMap.isMapDisplayNode = () => true;
  context.window.GameModules.realWorldMap.isInteriorLocationName = () => false;
  context.window.GameModules.realWorldMap.isMapExteriorNode = () => true;
  context.window.GameModules.realWorldMap.resolveExteriorAnchorNode = (map, node) => node;
  loadScript(context, 'publish/real-world-map-facts.js');
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  loadScript(context, 'publish/real-world-map.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  loadScript(context, 'publish/real-world-map-geopolitical.js');
  loadScript(context, 'publish/real-world-map-graph.js');
  loadScript(context, 'publish/real-world-map-actions.js');
  const state = makeState();
  context.window.GameModules.realWorldMap.ensure(state, state.playerProfile || {});
  Object.assign(state, context.window.GameModules.realWorldMapActions);
  state.realWorldMapAfterPaint = (callback) => callback();
  state.realWorldMapRuntime = () => (state.__realWorldMapRuntime = state.__realWorldMapRuntime || {});
  const anchor = state.realWorldMap.nodes[0];
  const payload = context.window.GameModules.realWorldMapFog.validateUnlockPayload({
    patchType: 'location-tree-audit-fill',
    audit: { decision: 'patch-existing', queriedBeforeDecision: true, isComplete: true, reason: 'details unlocked' },
    patch: {
      poiGraphPatch: { nodes: [], edges: [] },
      interiorsPatch: [{
        targetPoiRef: `existing:${anchor.id}`,
        floors: [{
          tempRef: 'floor_1',
          name: 'First Floor',
          rooms: [{
            tempRef: 'room_101',
            name: '101',
            number: '101',
            zones: [{ tempRef: 'zone_bedroom', name: 'Bedroom' }],
          }],
        }],
      }],
    },
  }, anchor, state.realWorldMap, 'full');

  context.window.GameModules.realWorldLocationGraphSkills.applyAuditFillPatch(state, payload.auditFillPayload, { currentNode: anchor });
  anchor.interiorLayout = { summary: '', zones: [{ id: 'zone_old', name: '旧区域' }] };

  const floors = state.prepareRealWorldMapInteriorFloors(anchor.id);
  assert.strictEqual(floors.length, 0);
  assert.strictEqual(state.realWorldMap.nodes[0].interiorLayout.floors, undefined);
});

test('realWorldMap route links allocate graph ids for implicit endpoint nodes', () => {
  const context = makeContext();
  loadScript(context, 'publish/real-world-map.js');
  const state = { playerProfile: {}, realWorldMap: { current: '', currentId: '', nodes: [], edges: [], expanded: {} } };
  const map = context.window.GameModules.realWorldMap.ensure(state, state.playerProfile);
  const applied = context.window.GameModules.realWorldMap.applyRouteLinks(state, map, [{
    from: 'Route Link A',
    to: 'Route Link B',
    distanceMeters: 12,
  }], 'now');
  assert.strictEqual(applied.length, 1);
  const a = map.nodes.find((node) => node.name === 'Route Link A');
  const b = map.nodes.find((node) => node.name === 'Route Link B');
  assert.match(a.id, /^loc_\d+$/);
  assert.match(b.id, /^loc_\d+$/);
  assert.strictEqual(applied[0].from, a.id);
  assert.strictEqual(applied[0].to, b.id);
});

test('realWorldMap addLocation and update allocate graph ids for new POIs', () => {
  const context = makeContext();
  loadScript(context, 'publish/real-world-map.js');
  const state = { playerProfile: {}, realWorldMap: { current: '', currentId: '', nodes: [], edges: [], expanded: {} } };
  const added = context.window.GameModules.realWorldMap.addLocation(state, {
    name: 'Direct Facade Building',
    descriptionFacts: ['direct facade add'],
  }, 'now');
  assert.match(added.id, /^loc_\d+$/);
  assert.notStrictEqual(added.id, context.window.GameModules.realWorldMap.nodeId('Direct Facade Building'));

  const map = context.window.GameModules.realWorldMap.update(state, 'Updated Facade Building', {
    locationDescription: 'updated facade description',
  });
  const updated = map.nodes.find((node) => node.name === 'Updated Facade Building');
  assert.match(updated.id, /^loc_\d+$/);
  assert.notStrictEqual(updated.id, context.window.GameModules.realWorldMap.nodeId('Updated Facade Building'));
});

test('realWorldMap normalizeNodes keeps richer interior layout on duplicate names', () => {
  const context = makeContext();
  loadScript(context, 'publish/real-world-map.js');
  const state = {
    playerProfile: {},
    realWorldMap: {
      current: '锦苑小区3栋',
      currentId: 'legacy_empty',
      nodes: [
        { id: 'legacy_empty', name: '锦苑小区3栋', interiorLayout: { summary: '', zones: [] }, visited: true },
        {
          id: 'graph_rich',
          name: '锦苑小区3栋',
          graphNodeId: 'loc_1',
          interiorLayout: {
            floors: [{
              id: 'floor_2',
              name: '第二层',
              rooms: [{
                id: 'room_202',
                name: '202号房',
                slotObjects: { bedroom: [{ name: '书桌', containerContents: ['钥匙'] }] },
              }],
            }],
          },
          exteriorRingUnlocked: true,
        },
      ],
      edges: [],
      expanded: {},
    },
  };
  const map = context.window.GameModules.realWorldMap.ensure(state, state.playerProfile);
  const node = map.nodes.find((item) => item.name === '锦苑小区3栋');
  assert.strictEqual(map.nodes.filter((item) => item.name === '锦苑小区3栋').length, 1);
  assert.strictEqual(node.interiorLayout.floors.length, 1);
  assert.strictEqual(node.interiorLayout.floors[0].rooms[0].slotObjects.bedroom[0].containerContents[0], '钥匙');
  assert.strictEqual(node.exteriorRingUnlocked, true);
  assert.strictEqual(node.graphNodeId, 'loc_1');
});

test('map facts location adds use graph allocated ids before legacy addLocation', () => {
  const context = makeContext();
  loadScript(context, 'publish/real-world-map-facts.js');
  const state = makeState();
  context.window.GameModules.realWorldMap.addLocation = () => {
    throw new Error('legacy addLocation should not run for map facts location adds');
  };
  context.window.GameModules.realWorldMap.upsertNode = () => {
    throw new Error('legacy upsertNode should not run for map facts location updates');
  };
  context.window.GameModules.realWorldMap.render = (map) => (map.nodes || []).map((node) => node.name).join('\n');
  context.window.GameModules.realWorldMapFacts.applyLocationUpdates(state, {
    newLocations: [{ name: 'Facts Building', descriptionFacts: ['facts-created'] }],
    locationDescriptionUpdates: [{ locationName: 'Facts Updated Building', action: 'add', text: 'updated fact' }],
  });
  const factsNode = state.realWorldMap.nodes.find((node) => node.name === 'Facts Building');
  const updatedNode = state.realWorldMap.nodes.find((node) => node.name === 'Facts Updated Building');
  assert.match(factsNode.id, /^loc_\d+$/);
  assert.match(updatedNode.id, /^loc_\d+$/);
});

test('geopolitical map chain uses graph allocated ids before legacy upsert', () => {
  const context = makeContext();
  loadScript(context, 'publish/real-world-map-geopolitical.js');
  const state = makeState();
  const map = state.realWorldMap;
  context.window.GameModules.realWorldMap.upsertNode = () => {
    throw new Error('legacy upsertNode should not run for geopolitical chain');
  };
  context.window.GameModules.realWorldMap.inferHomeName = () => '';
  context.window.GameModules.orgTerritory = { ensureMapControls() {}, findMapNode() { return null; } };
  context.window.GameModules.app = { orgTerritory: { familyActions: { ensureAdminOrgStub() { return null; }, linkFamilyToCommunity() {} } } };
  context.window.GameModules.realWorldMapGeopolitical.parseAdminChain = () => [
    { level: 'city', name: 'Geo City', kind: 'admin' },
    { level: 'community', name: 'Geo Community', kind: 'community' },
  ];
  context.window.GameModules.realWorldMapGeopolitical.ensure(state, map, {});
  const city = map.nodes.find((node) => node.name === 'Geo City');
  const community = map.nodes.find((node) => node.name === 'Geo Community');
  assert.match(city.id, /^loc_\d+$/);
  assert.match(community.id, /^loc_\d+$/);
  assert.strictEqual(community.parentId, city.id);
});



test('player current location fallback uses graph allocated ids before legacy addLocation', () => {
  const context = makeContext();
  loadScript(context, 'publish/real-world-agent-location-fill.js');
  const state = makeState();
  state.realWorldMap.current = '';
  state.realWorldMap.currentId = '';
  state.playerProfile = { homeLocation: '星河小区3栋' };
  context.window.GameModules.realWorldMap.addLocation = () => {
    throw new Error('legacy addLocation should not run for player current fallback');
  };
  const node = context.window.GameModules.realWorldAgentContext.ensurePlayerCurrentLocation(state, '在家里醒来');
  assert.match(node.id, /^loc_\d+$/);
  assert.strictEqual(node.name, '星河小区3栋');
  assert.ok(state.realWorldMap.nodes.some((item) => item.id === node.id && item.name === '星河小区3栋'));
});

test('unknown route nodes use graph allocated ids before legacy addLocation', () => {
  const context = makeContext();
  loadScript(context, 'publish/real-world-agent-location-fill.js');
  const state = makeState();
  context.window.GameModules.realWorldMap.addLocation = () => {
    throw new Error('legacy addLocation should not run for unknown route nodes');
  };
  const rows = context.window.GameModules.realWorldAgentContext.applyRouteNodes(state, [{
    name: '未知路线走廊',
    descriptionFacts: ['从当前房间出门，经过走廊前往目标。'],
  }], 'now');
  assert.strictEqual(rows.length, 1);
  assert.match(rows[0].id, /^loc_\d+$/);
  assert.strictEqual(rows[0].name, '未知路线走廊');
  assert.ok(state.realWorldMap.nodes.some((node) => node.id === rows[0].id && node.name === '未知路线走廊'));
});

test('route nodes reuse graph hit before legacy addLocation', () => {
  const context = makeContext();
  loadScript(context, 'publish/real-world-agent-location-fill.js');
  const state = makeState();
  context.window.GameModules.realWorldMap.addLocation = () => {
    throw new Error('legacy addLocation should not run when graph hits');
  };
  const rows = context.window.GameModules.realWorldAgentContext.applyRouteNodes(state, [{
    name: '刘思琪的卧室',
    descriptionFacts: ['从客厅上楼，穿过走廊后到刘思琪的卧室门口。'],
  }], '现在');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].reusedFromLocationGraph, true);
  assert.ok(rows[0].graphNodeId);
});

test('stage1 route graph binds player current node and links route path by ids', () => {
  const context = makeContext();
  loadScript(context, 'publish/real-world-agent-location-fill.js');
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const ctx = context.window.GameModules.realWorldAgentContext;
  const state = makeState();
  const current = ctx.ensurePlayerCurrentLocation(state, 'go through hallway to target room');
  const routeNodes = ctx.applyRouteNodes(state, [
    { name: 'Route Hallway A', descriptionFacts: ['从当前房间门口出来后经过走廊。'] },
    { name: 'Route Stairs B', descriptionFacts: ['沿走廊右侧上楼梯到目标楼层。'] },
  ], 'now');
  const target = graphApi.ensurePoiFromPayload(state, { name: 'Route Target Room', descriptionFacts: ['穿过楼梯后到达右手第二间房间。'] }, { source: 'test-route-target', skipProject: true });
  const edges = graphApi.linkRoutePath(state, [current, ...routeNodes, target], { source: 'test-route-path', basis: 'known route' });
  assert.strictEqual(graphApi.getCharacterCurrentNode(state, 'player-self').id, current.graphNodeId || current.id);
  assert.strictEqual(edges.length, 3);
  assert.ok(edges.every((edge) => /^loc_\d+$/.test(edge.fromPoiId) && /^loc_\d+$/.test(edge.toPoiId)));
  assert.ok(graphApi.nearbyBfs(state, current.graphNodeId || current.id, 3).some((row) => row.node.id === target.id));
});

test('default fuzzy node search only traverses location index', () => {
  const context = makeContext();
  const graphApi = context.window.GameModules.realWorldLocationGraph;
  const state = makeState();
  assert.ok(graphApi.searchNode(state, 'desk').every((node) => node.type !== 'object'));
  assert.ok(graphApi.searchNode(state, 'desk', 20, { includeTypes: ['object'] }).some((node) => node.type === 'object'));
});

test('location tree audit prompt documents recursive interiors and property contracts', () => {
  const markdown = read('publish/prompts/location-tree-audit-fill.md');
  [
    'ownerRefs',
    'effectiveAuthorityRef',
    'ownershipBasis',
    'usageContracts',
    'monthlyRent',
    'debtAmount',
    'floors',
    'rooms',
    'zones',
    'functionZones',
    'innerRooms',
    'objects',
    'containerItems',
    'tempRef',
    'direct-neighbor',
  ].forEach((token) => assert.ok(markdown.includes(token), `prompt should mention ${token}`));

  const context = { window: { GameModules: {} } };
  loadScript(context, 'publish/prompts/location-tree-audit-fill.js');
  const inline = context.window.GameModules.promptTemplates.inline['location-tree-audit-fill'];
  assert.ok(inline.includes('现实地点图审计与补全'), 'inline prompt should preserve Chinese text');
  assert.ok(inline.includes('ownerRefs'), 'inline prompt should include ownership schema');
  assert.ok(inline.includes('containerItems'), 'inline prompt should include container item schema');
});

test('location tree audit prompt requires one-pass completion for visited place closure', () => {
  const markdown = read('publish/prompts/location-tree-audit-fill.md');
  assert.ok(markdown.includes('当前访问地点最低完整闭包'));
  assert.ok(markdown.includes('不能把当前访问地点核心结构写入 `audit.defer`'));
  assert.ok(markdown.includes('一回合内完成'));
  assert.ok(!markdown.includes('只补本轮需要知道的范围；未知结构写入 `audit.defer`。'));
});

test('location tree audit prompt forbids repeated audit polling in same round', () => {
  const markdown = read('publish/prompts/location-tree-audit-fill.md');
  assert.ok(markdown.includes('只进行一次语义审计'));
  assert.ok(markdown.includes('不得要求再次审计'));
  assert.ok(markdown.includes('不做轮询补齐'));
  assert.ok(markdown.includes('基础结算阶段'));
});

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      console.error(`FAIL ${name}`);
      throw error;
    }
  }
})();
