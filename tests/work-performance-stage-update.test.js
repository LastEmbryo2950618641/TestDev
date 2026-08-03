const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(rel, context) {
  const file = path.join(__dirname, '..', rel);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: rel });
}

function createContext() {
  const context = {
    console,
    setTimeout,
    window: {
      GameModules: {
        ui: { company: {} },
        renderPrompt: async (id, vars) => `${id}\n${Object.entries(vars || {}).map(([key, value]) => `${key}: ${value}`).join('\n')}`,
        aiRequest: { complete: async () => '' },
      },
    },
  };
  context.window.window = context.window;
  vm.createContext(context);
  return context;
}

test('Stage13 parsePayload only parses career and work payload', () => {
  const context = createContext();
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const parsed = stage.parsePayload(JSON.stringify({
    careerProfile: {
      active: true,
      organizationName: '测试单位',
      positionTitle: '测试岗位',
      directLeader: { name: '张伟', title: '技术总监' },
      currentProjects: [{ role: '开发者', description: '参与关键模块迭代并负责接口设计、缺陷修复与上线支撑，保障业务流程稳定运行。' }],
    },
    workPerformanceUpdate: { reviewTriggered: true },
    characterCardLines: ['职业生涯Stage13：测试同步'],
  }));
  assert.equal(parsed.profile.organizationName, '测试单位');
  assert.equal(parsed.update.reviewTriggered, true);
  assert.equal(parsed.lines[0], '职业生涯Stage13：测试同步');
});

test('Stage13 parsePayload supports separate work unit and freelance profiles', () => {
  const context = createContext();
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const parsed = stage.parsePayload(JSON.stringify({
    workUnitProfile: {
      active: true,
      organizationName: '测试公司',
      workMode: { type: '员工制' },
    },
    freelanceProfiles: [{
      id: 'freelance-a',
      active: true,
      organizationName: '个人接单',
      workMode: { type: '自由职业' },
    }],
    workPerformanceUpdate: { attendanceUpdate: { status: '上班' } },
    freelancePerformanceUpdates: [{ freelanceId: 'freelance-a', attendanceUpdate: { status: '接单中' } }],
  }));
  assert.equal(parsed.workUnitProfile.organizationName, '测试公司');
  assert.equal(parsed.freelanceProfiles[0].organizationName, '个人接单');
  assert.equal(parsed.update.attendanceUpdate.status, '上班');
  assert.equal(parsed.freelanceUpdates[0].attendanceUpdate.status, '接单中');
});

test('Stage13 buildPrompt forces review when next review date is due', async () => {
  const context = createContext();
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const prompt = await stage.buildPrompt({
    playerIdentityState() { return { profile: { name: '测试玩家' } }; },
    factionState: { factions: [] },
    phoneDateText() { return '2026-07-29 10:00'; },
    companyState: { careerProfile: {} },
  }, {
    companyContext: '单位上下文',
    narration: '今天推进了项目。',
    action: '继续工作',
    nextPerformanceReviewAt: '2026-07-29T08:00:00.000Z',
    reviewDue: true,
  });
  assert.match(prompt, /2026-07-29T08:00:00.000Z/);
  assert.match(prompt, /是否到达评绩效日期: 是/);
  assert.match(prompt, /允许上班状态: 上班、迟到、旷班/);
  assert.match(prompt, /inference-stage13-career-update/);
});

test('Stage13 skips an existing career when the turn has no career change', async () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/company-actions.js', context);
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const store = {
    ...context.window.GameModules.companyActions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    initFactionSystem() {},
    syncCompanyLexicon() {},
    phoneDate() { return new Date('2026-08-03T12:00:00.000Z'); },
  };
  store.initCompanySystem();
  store.companyState.workUnitProfile = store.normalizeCareerProfile({
    active: true,
    organizationName: '成都市高新区科创有限公司',
    positionTitle: '软件工程师',
    workMode: { type: '员工制' },
  });
  store.companyState.workStats.nextPerformanceReviewAt = '2026-09-01T00:00:00.000Z';
  let requested = false;
  const result = await stage.runAfterSettlement({
    store, action: '回家休息', narration: '刘悠回到住处整理个人物品。', updates: {}, logId: 'test-log', config: { mode: 'real' },
    loop: { completeCachedJsonPrompt() { requested = true; throw new Error('不应请求 AI'); } },
  });
  assert.equal(requested, false);
  assert.equal(result.skipped, true);
  assert.match(result.lines[0], /无职业相关事实/);
});

test('Stage13 updates an existing career when the turn contains career facts', () => {
  const context = createContext();
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const store = { companyState: { workUnitProfile: { organizationName: '成都市高新区科创有限公司', positionTitle: '软件工程师' }, freelanceProfiles: [] } };
  assert.equal(stage.shouldRequestCareerSync(store, '去公司处理项目', '刘悠开始处理项目迭代。', false).shouldRequest, true);
  assert.equal(stage.shouldRequestCareerSync(store, '回家休息', '刘悠在房间内看书。', false).shouldRequest, false);
  assert.equal(stage.shouldRequestCareerSync(store, '回家休息', '刘悠在房间内看书。', true).reason, 'no-career-change');
});

test('Stage13 keeps a due review dormant until a career fact occurs', () => {
  const context = createContext();
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const store = { companyState: { workUnitProfile: { organizationName: '成都市高新区科创有限公司', positionTitle: '软件工程师' }, freelanceProfiles: [] } };
  assert.equal(stage.shouldRequestCareerSync(store, '回家休息', '刘悠在房间内看书。', true).shouldRequest, false);
  assert.equal(stage.shouldRequestCareerSync(store, '去公司处理项目', '刘悠完成项目阶段交付。', true).shouldRequest, true);
});

test('Stage13 lets AI replace explicit freelance career fields', () => {
  const context = createContext();
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const result = stage.mergeFreelanceProfile({
    id: 'freelance-1', createdAt: '2026-08-01T00:00:00.000Z', organizationName: '旧身份', orders: [{ title: '旧订单' }], works: [{ title: '旧成果' }],
  }, {
    id: 'freelance-1', organizationName: '合并后的自由职业', orders: [], works: [], currentTasks: ['更新档案'],
  });
  assert.equal(result.id, 'freelance-1');
  assert.equal(result.createdAt, '2026-08-01T00:00:00.000Z');
  assert.equal(result.organizationName, '合并后的自由职业');
  assert.deepEqual(result.orders, []);
  assert.deepEqual(result.works, []);
});

test('Stage13 applyUpdate writes work stats and pay panel reads unit fields', () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/company-actions.js', context);
  load('publish/ui/company/company-contract-view-helpers.js', context);
  load('publish/inference/work-performance-stage-update.js', context);

  const actions = context.window.GameModules.companyActions;
  const contractHelpers = context.window.GameModules.ui.company.contractViewHelpers;
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const store = {
    ...actions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    playerProfile: { name: '测试玩家' },
    factionState: {
      factions: [{
        id: 'company-acme',
        name: '测试单位',
        type: '公司',
        domain: '互联网软件',
        scale: '50-150人',
        location: '成都',
        structure: [],
        orgDomain: 'corp',
      }],
    },
    initFactionSystem() {},
    playerIdentityState() {
      return { profile: { memberships: [{ orgId: 'company-acme', orgName: '测试单位', title: '前端开发' }] } };
    },
    companyFields() { return []; },
    companyOrganization() { return []; },
    companyPayPreviewView() { return { title: '薪酬绩效预览', summaryLine: '底薪：9000元', performanceLine: '每月收入：9000元' }; },
    companyContractSectionView() { return { contractRows: [], submissionRows: [], showEmpty: false, emptyText: '' }; },
    currentWorkAttendance() { return { status: '上班', detail: '已到岗。', canCheckIn: false }; },
    companyDateKey(date = new Date('2026-07-29T10:00:00.000Z')) { return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; },
    phoneDate() { return new Date('2026-07-29T10:00:00.000Z'); },
    save() {},
    syncCompanyLexicon() {},
  };
  store.initCompanySystem();
  store.companyState.activeCareerApp = 'work';
  store.companyState.workUnitProfile = store.normalizeCareerProfile({
    active: true,
    factionId: 'company-acme',
    organizationName: '测试单位',
    organizationType: '公司',
    positionTitle: '前端开发',
    currentRoute: '技术路线',
    industry: '互联网软件',
    location: '成都',
    workMode: { type: '员工', schedule: '标准工作制', workDays: '周一至周五', startTime: '09:00', endTime: '18:00', lateGraceMinutes: 10 },
    salary: { monthlyBase: 9000, performanceMonths: 2, performanceRate: 0.15, currency: 'CNY' },
    rules: ['遵守考勤与保密要求'],
    openings: [],
    promotionRoutes: [],
    notes: '测试资料',
    updatedAt: '2026-07-29T10:00:00.000Z',
    source: 'ai-career',
  });
  store.companyState.employment = { ...store.companyState.employment, active: true, activeCompanyId: 'company-acme' };

  const applied = stage.applyUpdate(store, {
    reviewTriggered: true,
    reviewSummary: '本轮完成重点项目推进。',
    nextPerformanceReviewAt: '2026-08-31T10:00:00.000Z',
    attendanceUpdate: { status: '上班', detail: '今日按时到岗并推进项目。', reason: '正文明确写到正常工作推进。', canCheckIn: false },
    leaderReview: { summary: '推进稳定。', detail: '独立完成关键任务并推动项目执行。', score: 91 },
    employeeReview: { summary: '完成本轮工作目标。', detail: '对项目节点负责并及时交付。' },
    contributionItems: [{ type: 'project-promotion', title: '推动《测试项目》执行', detail: '协调并推进阶段任务落地。', projectName: '测试项目', valueText: '推动项目进入验收阶段', impactScore: 87 }],
    characterCardLines: ['工作绩效Stage13：已完成测试写回'],
  }, new Date('2026-07-29T10:00:00.000Z'));

  assert.equal(applied.skipped, false);
  assert.equal(store.companyState.workStats.nextPerformanceReviewAt, '2026-08-31T10:00:00.000Z');
  assert.equal(store.companyState.workStats.leaderReview.summary, '推进稳定。');
  assert.equal(store.companyState.workStats.employeeReview.summary, '完成本轮工作目标。');
  assert.equal(store.companyState.workStats.contributionItems.length, 1);

  const panel = contractHelpers.companyPayPanelView.call(store);
  assert.equal(panel.performance.nextReviewAt, '2026-08-31T10:00:00.000Z');
  assert.equal(panel.performance.leaderSummary, '推进稳定。');
  assert.equal(panel.performance.employeeSummary, '完成本轮工作目标。');
  assert.equal(panel.performance.contributionItems[0].title, '推动《测试项目》执行');
});

test('employee annual performance is annual package times current performance score', () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/ui/company/company-pay-view-helpers.js', context);
  load('publish/ui/company/company-summary-view-helpers.js', context);
  load('publish/ui/company/company-field-view-helpers.js', context);
  load('publish/ui/company/view-helpers.js', context);
  load('publish/company-actions.js', context);
  const store = {
    ...context.window.GameModules.companyActions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    phoneDate() { return new Date('2026-08-03T10:00:00.000+08:00'); },
    companyFieldReason(key, label, value) { return `${label}:${value || ''}`; },
    syncCompanyLexicon() {},
  };
  store.initCompanySystem();
  store.companyState.activeCareerApp = 'work';
  store.companyState.workUnitProfile = store.normalizeCareerProfile({
    active: true,
    organizationName: '测试科技公司',
    organizationType: '公司',
    positionTitle: '软件工程师',
    workMode: { type: '员工制', schedule: '标准工作制', workDays: '周一至周五' },
    salary: { monthlyBase: 9000, annualPackage: 126000, performanceMonths: 2, currency: 'CNY' },
    promotionRoutes: [{ id: 'tech', name: '技术路线', nextPosition: '高级工程师', currentPerformance: 40, requiredPerformance: 95, requirements: [], vacancies: 1 }],
  });
  store.companyState.workStats.performance = 80;

  const pay = store.monthlyPayPreview();
  assert.equal(pay.annualPackage, 126000);
  assert.equal(pay.performance, 80);
  assert.equal(pay.rate, 0.8);
  assert.equal(pay.annualPerformance, 100800);
  assert.match(store.companyPayPreviewView().performanceLine, /年收入总包：126000元/);
  assert.match(store.companyPayPreviewView().performanceLine, /当前绩效：80\/100/);
  assert.match(store.companyPayPreviewView().performanceLine, /年底绩效：100800元/);
  assert.equal(store.careerPromotionRoutes()[0].currentPerformance, 80);
  assert.equal(store.canPromoteCareerRoute(store.careerPromotionRoutes()[0]).performanceOk, false);
});

test('Stage13 routine work keeps contributionItems empty and preserves history', () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/company-actions.js', context);
  load('publish/inference/work-performance-stage-update.js', context);

  const actions = context.window.GameModules.companyActions;
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const store = {
    ...actions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    initFactionSystem() {},
    companyDateKey(date = new Date('2026-07-29T10:00:00.000Z')) { return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; },
    save() {},
    syncCompanyLexicon() {},
  };
  store.initCompanySystem();
  store.companyState.employment = { ...store.companyState.employment, active: true };
  store.companyState.workStats.contributionItems = [{
    id: 'old-contribution',
    type: 'project-delivery',
    title: '历史贡献',
    detail: '历史记录',
    projectName: '旧项目',
    valueText: '已沉淀',
    impactScore: 70,
  }];

  const applied = stage.applyUpdate(store, {
    reviewTriggered: false,
    reviewSummary: '本轮正常按部就班工作。',
    nextPerformanceReviewAt: '2026-08-31T10:00:00.000Z',
    attendanceUpdate: { status: '上班', detail: '今日正常到岗。', reason: '正文只写到正常上班。', canCheckIn: false },
    leaderReview: { summary: '正常履职。', detail: '按流程完成日常安排。', score: 88 },
    employeeReview: { summary: '完成日常工作。', detail: '无额外成果。' },
    contributionItems: [],
    characterCardLines: [],
  }, new Date('2026-07-29T10:00:00.000Z'));

  assert.equal(applied.skipped, false);
  assert.equal(store.companyState.workStats.contributionItems.length, 1);
  assert.equal(store.companyState.workStats.contributionItems[0].title, '历史贡献');
  assert.equal(applied.applied.contributionItems[0].title, '历史贡献');
});

test('freelance career displays order income instead of employee schedule and salary fields', () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/ui/company/company-pay-view-helpers.js', context);
  load('publish/ui/company/company-field-view-helpers.js', context);
  load('publish/ui/company/company-attendance-view-helpers.js', context);
  load('publish/ui/company/company-summary-view-helpers.js', context);
  load('publish/ui/company/view-helpers.js', context);
  load('publish/company-actions.js', context);

  const actions = context.window.GameModules.companyActions;
  const store = {
    ...actions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    companyHolidayName() { return ''; },
    phoneDate() { return new Date('2026-07-29T10:00:00.000Z'); },
    companyFieldReason(key, label, value) { return `${label}:${value || ''}`; },
    syncCompanyLexicon() {},
  };
  store.initCompanySystem();
  store.companyState.activeCareerApp = 'freelance';
  store.companyState.freelanceProfiles = [store.normalizeCareerProfile({
    active: true,
    id: 'art-orders',
    organizationName: '自由职业接单',
    organizationType: '自由职业',
    positionTitle: '二次元绘画与程序外包',
    workMode: {
      type: '自由职业',
      orderMode: '按项目接单，按阶段验收结算',
      availability: '每日弹性安排，优先处理已签订单',
    },
    salary: {
      monthlyBase: 0,
      monthlyExpectedIncome: 8000,
      orderIncomeText: '角色设定稿 500-1200 元/单，程序模块 1000-3000 元/单',
      currency: 'CNY',
    },
  }), store.normalizeCareerProfile({
    active: true,
    id: 'consulting-orders',
    organizationName: '技术顾问接单',
    organizationType: '自由职业',
    positionTitle: '技术顾问',
    workMode: { type: '自由职业', orderMode: '按小时顾问', availability: '周末晚间' },
    salary: { monthlyBase: 0, monthlyExpectedIncome: 12000, orderIncomeText: '技术咨询 500 元/小时', currency: 'CNY' },
  })];
  store.companyState.selectedFreelanceId = 'art-orders';

  const fields = store.companyFields();
  const labels = fields.map((item) => item.label);
  assert.ok(labels.includes('接单模式'));
  assert.ok(labels.includes('接单收入'));
  assert.ok(!labels.includes('上班时间'));
  assert.ok(!labels.includes('底薪'));
  assert.equal(store.careerAppName(), '自由职业');
  assert.equal(store.currentWorkAttendance().status, '接单中');
  assert.equal(store.monthlyPayPreview().total, 8000);
  store.selectFreelanceProfile('consulting-orders');
  assert.equal(store.currentCompany().positionTitle, '技术顾问');
  assert.equal(store.monthlyPayPreview().total, 12000);
});

test('freelance career level and orders follow selected card', () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/ui/company/company-organization-view-helpers.js', context);
  load('publish/ui/company/view-helpers.js', context);
  load('publish/company-actions.js', context);

  const actions = context.window.GameModules.companyActions;
  const store = {
    ...actions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    syncCompanyLexicon() {},
  };
  store.initCompanySystem();
  store.companyState.activeCareerApp = 'freelance';
  store.companyState.freelanceProfiles = [store.normalizeCareerProfile({
    id: 'art-orders',
    active: true,
    organizationName: '绘画接单',
    organizationType: '自由职业',
    positionTitle: '二次元绘画接单者',
    workMode: { type: '自由职业' },
    reputationTitle: { title: '同城小有名气', current: 46, max: 120, nextTitle: '稳定接单者', review: '成稿稳定但客户面较窄' },
    abilities: [{ type: '技能', name: '角色立绘绘制', level: 2 }],
    specialty: '二次元角色立绘',
    orders: [{ title: '头像绘制', publisher: '社群客户', publisherStatus: '本地社群', publishedAt: '2026-08-02 19:30', deadlineAt: '2026-08-05 22:00', requiredQuality: '良', requiredStyle: '校园风', priceText: '300元', reputationReward: '业内名声 +2' }],
    works: [{ title: '头像试稿', intro: '清爽校园头像', recognition: 42, review: '线条干净但经验不足' }],
  }), store.normalizeCareerProfile({
    id: 'code-orders',
    active: true,
    organizationName: '程序接单',
    organizationType: '自由职业',
    positionTitle: '程序开发外包接单者',
    workMode: { type: '自由职业' },
    reputationTitle: { title: '小型项目熟手', current: 80, max: 140, nextTitle: '高价稳定接单者', review: '交付可靠，报价仍偏低' },
    abilities: [{ type: '技能', name: '数据库开发', level: 4 }],
    specialty: '游戏工具与数据库',
    orders: [{ title: '数据库报表脚本', publisher: '小型商户', publisherStatus: '小型商户', publishedAt: '2026-08-03 09:00', deadlineAt: '2026-08-07 18:00', requiredQuality: '较好', requiredStyle: '稳定实用', priceText: '1200元', reputationReward: '业内名声 +4' }],
  })];
  store.companyState.selectedFreelanceId = 'art-orders';

  assert.equal(store.freelanceLevelSectionView().titleText, '同城小有名气(46/120，下一级: 稳定接单者，成稿稳定但客户面较窄)');
  assert.equal(store.freelanceLevelSectionView().abilities[0].text, '技能：角色立绘绘制 lv.2');
  assert.equal(store.freelanceOrderSectionView().orders[0].title, '头像绘制');
  assert.equal(store.freelanceOrderSectionView().orders[0].publisherStatus, '本地社群');
  assert.equal(store.freelanceOrderSectionView().orders[0].deadlineAt, '2026-08-05 22:00');
  assert.equal(store.freelanceOrderSectionView().orders[0].reputationReward, '业内名声 +2');
  assert.equal(store.freelanceWorksSectionView().works[0].title, '头像试稿');
  assert.equal(store.freelanceWorksSectionView().works[0].recognition, 42);
  store.selectFreelanceProfile('code-orders');
  assert.equal(store.freelanceLevelSectionView().specialty, '游戏工具与数据库');
  assert.equal(store.freelanceOrderSectionView().orders[0].priceText, '1200元');
});

test('freelance app header uses card name instead of summary', () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/ui/company/company-summary-view-helpers.js', context);
  load('publish/ui/company/view-helpers.js', context);
  load('publish/company-actions.js', context);
  const store = {
    ...context.window.GameModules.companyActions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    workStatusText() { return '测试状态'; },
    syncCompanyLexicon() {},
  };
  store.initCompanySystem();
  store.companyState.activeCareerApp = 'freelance';
  store.companyState.freelanceProfiles = [store.normalizeCareerProfile({
    active: true,
    id: 'freelance-art',
    organizationName: '二次元绘画接单者',
    organizationType: '自由职业',
    positionTitle: '二次元绘画接单者',
    careerSummary: '承接角色立绘、头像、表情包、设定图等美术订单，按草稿、线稿、上色和修改次数交付。',
    workMode: { type: '自由职业' },
  })];
  store.companyState.selectedFreelanceId = 'freelance-art';

  assert.equal(store.companyHeaderView().title, '二次元绘画接单者');
});

test('Stage13 freelance merge only follows AI returned existing id', () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/company-actions.js', context);
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const store = {
    ...context.window.GameModules.companyActions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    syncCompanyLexicon() {},
    save() {},
  };
  store.initCompanySystem();
  store.companyState.freelanceProfiles = [store.normalizeCareerProfile({
    id: 'freelance-art',
    active: true,
    organizationName: '二次元绘画接单者',
    positionTitle: '二次元绘画接单者',
    workMode: { type: '自由职业' },
  })];

  stage.applyCareerProfile(store, {
    id: 'freelance-art',
    active: true,
    organizationName: '角色美术订单接单者',
    positionTitle: '角色美术订单接单者',
    careerSummary: '合并头像、表情包与角色立绘订单方向。',
    workMode: { type: '自由职业' },
  }, new Date('2026-08-02T12:00:00.000Z'), 'freelance');
  assert.equal(store.companyState.freelanceProfiles.length, 1);
  assert.equal(store.companyState.freelanceProfiles[0].organizationName, '角色美术订单接单者');

  stage.applyCareerProfile(store, {
    id: 'freelance-similar-new',
    active: true,
    organizationName: '头像表情包美术接单者',
    positionTitle: '头像表情包美术接单者',
    workMode: { type: '自由职业' },
  }, new Date('2026-08-02T12:05:00.000Z'), 'freelance');
  assert.equal(store.companyState.freelanceProfiles.length, 2);
});

test('Stage13 freelance reputation uses AI delta and promotion result', () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/company-actions.js', context);
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const store = {
    ...context.window.GameModules.companyActions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    companyDateKey() { return '2026-8-2'; },
    syncCompanyLexicon() {},
    save() {},
  };
  store.initCompanySystem();
  store.companyState.freelanceProfiles = [store.normalizeCareerProfile({
    id: 'freelance-code',
    active: true,
    organizationName: '程序开发外包接单者',
    workMode: { type: '自由职业' },
    reputationTitle: { title: '社区接单者', current: 95, max: 100, nextTitle: '稳定交付者', review: '口碑集中在熟人客户' },
  })];
  store.companyState.selectedFreelanceId = 'freelance-code';

  const result = stage.applyUpdate(store, {
    attendanceUpdate: { status: '交付中', detail: '完成客户验收。' },
    reputationDelta: 12,
    reputationPromoted: true,
    reputationPromotion: { title: '稳定交付者', max: 150, nextTitle: '高价接单者', review: '交付稳定，开始外溢口碑' },
  }, new Date('2026-08-02T12:00:00.000Z'), 'freelance');

  assert.equal(result.applied.reputationTitle.title, '稳定交付者');
  assert.equal(result.applied.reputationTitle.current, 107);
  assert.equal(result.applied.reputationTitle.max, 150);
  assert.equal(result.applied.reputationTitle.nextTitle, '高价接单者');
  assert.equal(result.applied.reputationTitle.review, '交付稳定，开始外溢口碑');
});

test('opening work and freelance apps does not request Stage13 generation', async () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/company-actions.js', context);
  context.window.GameModules.aiRequest.complete = async () => {
    throw new Error('APP 打开不应请求 AI');
  };
  const store = {
    ...context.window.GameModules.companyActions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    ensureAllCompanyFactions() {},
    syncCompanyLexicon() {},
  };
  await store.openWorkApp();
  assert.equal(store.companyState.open, true);
  assert.equal(store.companyState.activeCareerApp, 'work');
  await store.openFreelanceApp();
  assert.equal(store.companyState.open, true);
  assert.equal(store.companyState.activeCareerApp, 'freelance');
});

test('freelance picker searches candidates by AI and adds a basic card', async () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/company-actions.js', context);
  let requested = false;
  context.window.GameModules.aiRequest.complete = async (options = {}) => {
    requested = options.source === 'freelance-candidates';
    const text = JSON.stringify({ candidates: [{ id: 'ai-code-outsourcing', name: '游戏插件开发接单者', intro: '根据客户需求开发游戏插件、小工具与自动化脚本，按需求确认、交付验收和维护次数结算。' }] });
    options.onChunk?.(text, true, { buffer: text });
    return text;
  };
  const store = {
    ...context.window.GameModules.companyActions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    playerProfile: { refinedRole: '程序开发者' },
    syncCompanyLexicon() {},
    save() {},
  };
  store.initCompanySystem();
  store.openFreelancePicker();
  store.companyState.freelancePicker.query = '程序';
  await store.searchFreelanceCandidates();
  assert.equal(requested, true);
  assert.equal(store.companyState.freelancePicker.open, true);
  assert.ok(store.companyState.freelancePicker.results.length > 0);
  const added = store.addFreelanceProfileFromCandidate(store.companyState.freelancePicker.results[0]);
  assert.ok(added.organizationName);
  assert.equal(store.companyState.freelancePicker.open, false);
  assert.equal(store.companyState.freelanceProfiles.length, 1);
  assert.equal(store.companyState.selectedFreelanceId, added.id);
  assert.equal(store.currentCareerProfile('freelance').organizationName, added.organizationName);
});

test('selected manually added freelance card waits AI reputation while keeping local abilities and orders', () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/ui/company/company-organization-view-helpers.js', context);
  load('publish/ui/company/view-helpers.js', context);
  load('publish/company-actions.js', context);
  const store = {
    ...context.window.GameModules.companyActions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    playerProfile: { refinedRole: '程序开发者' },
    playerIdentityState() {
      return { profile: { skills: [{ name: '编程与软件开发', level: 4 }] }, values: {} };
    },
    phoneDateText() { return '2026-08-02 20:00'; },
    syncCompanyLexicon() {},
    save() {},
  };
  store.initCompanySystem();
  store.companyState.activeCareerApp = 'freelance';
  store.addFreelanceProfileFromCandidate({ name: '程序开发外包接单者', intro: '承接程序外包。' });
  const levelView = store.freelanceLevelSectionView();
  const orderView = store.freelanceOrderSectionView();

  assert.equal(levelView.titleText.includes('[object Object]'), false);
  assert.equal(levelView.titleText, '待 AI 生成业内名声称号');
  assert.ok(levelView.abilities.some((item) => item.text.includes('编程与软件开发 lv.4')));
  assert.equal(levelView.specialty, '游戏工具、网页功能与数据库脚本开发');
  assert.ok(orderView.orders.length > 0);
  assert.equal(orderView.orders[0].publishedAt, '2026-08-02 20:00');
  assert.ok(orderView.orders[0].publisherStatus);
  assert.ok(orderView.orders[0].deadlineAt);
  assert.ok(orderView.orders[0].reputationReward);
});

test('manual freelance local details do not fabricate missing player abilities', () => {
  const context = createContext();
  load('publish/company-system.js', context);
  load('publish/ui/company/company-organization-view-helpers.js', context);
  load('publish/ui/company/view-helpers.js', context);
  load('publish/company-actions.js', context);
  const store = {
    ...context.window.GameModules.companyActions,
    companyState: context.window.GameModules.companySystem.defaultState(),
    playerProfile: { refinedRole: '普通市民' },
    playerIdentityState() {
      return { profile: { skills: [], knowledge: [], professions: [] }, values: {} };
    },
    syncCompanyLexicon() {},
    save() {},
  };
  store.initCompanySystem();
  store.companyState.activeCareerApp = 'freelance';
  store.addFreelanceProfileFromCandidate({ name: '二次元绘画接单者', intro: '承接美术订单。' });

  const levelView = store.freelanceLevelSectionView();
  assert.equal(levelView.abilities.length, 0);
  assert.equal(levelView.emptyText, '角色信息中暂无与该自由职业匹配的知识/技能/职业。');
});
