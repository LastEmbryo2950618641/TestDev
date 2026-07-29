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
        renderPrompt: async () => '',
        aiRequest: { complete: async () => '' },
      },
    },
  };
  context.window.window = context.window;
  vm.createContext(context);
  return context;
}

test('Stage13 parsePayload enforces strict JSON contract', () => {
  const context = createContext();
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const invalid = stage.parsePayload('{"workPerformanceUpdate":{"reviewTriggered":true}}');
  assert.equal(Boolean(invalid.update), false);
  assert.match(invalid.error, /必须为字符串|attendanceUpdate|缺少/);
});

test('Stage13 buildPrompt forces review when next review date is due', () => {
  const context = createContext();
  load('publish/inference/work-performance-stage-update.js', context);
  const stage = context.window.GameModules.inferenceWorkPerformanceStageUpdate;
  const prompt = stage.buildPrompt({
    companyContext: '单位上下文',
    narration: '今天推进了项目。',
    action: '继续工作',
    nextPerformanceReviewAt: '2026-07-29T08:00:00.000Z',
    reviewDue: true,
  });
  assert.match(prompt, /2026-07-29T08:00:00.000Z/);
  assert.match(prompt, /必须执行评绩效/);
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
  store.companyState.unitProfilesByFactionId['company-acme'] = {
    factionId: 'company-acme',
    unitName: '测试单位',
    workMode: { type: '员工', schedule: '标准工作制', workDays: '周一至周五', startTime: '09:00', endTime: '18:00', lateGraceMinutes: 10 },
    salary: { monthlyBase: 9000, performanceMonths: 2, performanceRate: 0.15, currency: 'CNY' },
    rules: ['遵守考勤与保密要求'],
    openings: [],
    notes: '测试资料',
    generatedAt: '2026-07-29T10:00:00.000Z',
    source: 'ai-faction',
  };

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
