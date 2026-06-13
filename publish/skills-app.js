window.GameModules = window.GameModules || {};

window.GameModules.skillsApp = {
  defaultState() {
    return { open: false, query: '', category: '', selectedSkillId: 'player.profile.view' };
  },

  definitions: [
    {
      id: 'player.profile.view', category: '玩家信息', name: '查看当前玩家个人信息', method: 'playerProfileLexiconFields() / playerCharacter()',
      params: 'targetId?: 默认 player-self', returns: '姓名、年龄、地址、现实身份、居住状态、人际关系、世界观补全等词条。',
      description: '读取手机主人当前个人资料，供现实推演判断身份、地点、社会关系与边界。',
      detail: 'AI需要核对玩家本人是谁、住在哪里、当前社会身份是什么时调用；只读，不推进时间。',
    },
    {
      id: 'player.rpg.view', category: '玩家信息', name: '查看玩家职业/技能/知识', method: 'ensurePlayerRpgState() / identityTargetState()',
      params: 'targetId?: player-self', returns: 'professions、skills、knowledge、factions、status_tags等RPG字段。',
      description: '整理玩家已有职业、技能、知识，用于岗位匹配和现实行动能力判断。',
      detail: 'BOSS招聘的匹配标注必须只引用这里已有的能力原名；没有匹配则留空。',
    },
    {
      id: 'identity.open', category: '手机应用', name: '打开身份证APP', method: 'openIdentityApp(targetId)',
      params: 'targetId: player-self 或角色id', returns: '切换到身份证界面并展示身份词条与RPG属性。',
      description: '让AI或玩家查看目标身份卡。',
      detail: '会关闭微信、公司、BOSS、日历等其它手机APP。',
    },
    {
      id: 'wechat.open', category: '手机应用', name: '打开微信APP', method: 'openWechatApp() / selectWechatContact(id)',
      params: 'contactId?: 联系人id', returns: '联系人、会话页、个人页等微信界面。',
      description: '进入手机通讯入口，查看联系人或对话占位信息。',
      detail: '当前作为现实社交通讯的入口；不会自动替玩家发送消息。',
    },
    {
      id: 'company.open', category: '公司系统', name: '打开公司APP', method: 'openCompanyApp()',
      params: '无', returns: '公司词条、招聘制度、组织架构、薪酬绩效、入职记录。',
      description: '查看玩家当前在职公司与工作制度。',
      detail: 'AI推演上班、薪酬、绩效、组织关系前应先读取公司上下文。',
    },
    {
      id: 'company.context', category: '公司系统', name: '读取公司推演上下文', method: 'companyPromptContext()',
      params: '无', returns: '公司词条、组织架构、本月上班状态、公司规则文本。',
      description: '把公司制度整理成可注入AI现实推演的上下文。',
      detail: '适合判断迟到、旷班、绩效扣减、收入结算和工作安排。',
    },
    {
      id: 'company.resign', category: '公司系统', name: '辞职', method: 'resignCompany()',
      params: '无', returns: '更新就业状态、入职记录，清空合同/投稿，停止上班提醒。',
      description: '玩家主动从当前公司离职。',
      detail: '这是有副作用的技能：会写入存档并影响后续公司和上班推演。',
    },
    {
      id: 'company.attendance', category: '公司系统', name: '处理上班提醒', method: 'checkWorkReminder() / decideWorkAttendance(choice)',
      params: 'choice: work | delay | absent', returns: '更新当天上班决策、迟到/旷班次数和绩效。',
      description: '手机时间推进到上班点后，触发并处理上班选择。',
      detail: '由AI推演推进手机时间后检查；同一天只记录一次决策。',
    },
    {
      id: 'boss.open', category: 'BOSS招聘', name: '打开BOSS招聘APP', method: 'openBossApp()',
      params: '无', returns: '招聘筛选、随机岗位列表和岗位详情界面。',
      description: '进入外部招聘市场。',
      detail: '首次打开且没有岗位时会自动随机生成一批岗位。',
    },
    {
      id: 'boss.generate', category: 'BOSS招聘', name: '生成岗位列表', method: 'randomBossJobs() / generateBossJobsByAI()',
      params: 'filters, pageSize, customPrompt, usePlayerFit', returns: '10/20/50个随机岗位，含薪酬、技能要求、匹配玩家能力。',
      description: '按筛选、玩家文本和可选玩家适配生成岗位。',
      detail: '无分页缓存；每次调用都会清空旧列表并按随机种子重新生成。AI失败会用本地岗位兜底。',
    },
    {
      id: 'boss.fit.toggle', category: 'BOSS招聘', name: '切换玩家能力适配', method: 'toggleBossPlayerFit()',
      params: '无', returns: '切换usePlayerFit后重新生成岗位。',
      description: '决定岗位生成是否优先参考玩家职业、技能、知识。',
      detail: '开启后仍保留少量跨领域入门机会；匹配字段仍会过滤为玩家已拥有能力。',
    },
    {
      id: 'boss.apply', category: 'BOSS招聘', name: '申请岗位并创建约定', method: 'applyBossJob() / createBossAppointment(job)',
      params: 'jobId: 当前选中岗位；applyHours?: 定时工小时数', returns: '向日历写入面试、投稿通知或到岗上班事件。',
      description: '把招聘投递结果转成日历事项。',
      detail: '员工默认约24小时后面试，创作者默认48小时后通知，定时工记录到岗和小时数。',
    },
    {
      id: 'calendar.open', category: '日历', name: '打开日历APP', method: 'openCalendarApp()',
      params: '无', returns: '按月展示面试、投稿通知、到岗上班等事项。',
      description: '查看已经写入的现实约定。',
      detail: '日历事件通常由BOSS申请技能写入，也可由系统调用addCalendarEvent添加。',
    },
    {
      id: 'calendar.add', category: '日历', name: '添加日历事项', method: 'addCalendarEvent(event)',
      params: 'event: { title,type,time,company?,jobTitle?,note? }', returns: '写入calendarState.events并保存。',
      description: '登记现实时间点上的提醒或预约。',
      detail: 'time必须是可解析ISO时间；展示时按当前日历月份归类。',
    },
    {
      id: 'realworld.open', category: '现实推演', name: '打开现实世界推演', method: 'openRealWorldPanel()',
      params: '无', returns: '现实世界日志、状态、目标和下一步行动。',
      description: '收起手机，进入手机外现实行动推演。',
      detail: '首次打开会写入现实日志种子，并检查是否触发上班提醒。',
    },
    {
      id: 'realworld.submit', category: '现实推演', name: '提交现实行动', method: 'submitRealWorldAction(action)',
      params: 'action: 玩家要执行的现实动作文本', returns: 'AI现实推演结果、choices、elapsedSeconds，并推进手机时间。',
      description: '让AI根据玩家个人资料和现实世界上下文推演行动结果。',
      detail: '这是推进手机时间的主要入口之一；完成后会写入玩家现实记忆。',
    },
    {
      id: 'memory.player.record', category: '记忆', name: '记录玩家现实记忆', method: 'recordPlayerRealWorldMemory(action, result)',
      params: 'action: 行动文本；result: AI推演结果', returns: '写入player-self短期记忆并尝试压缩。',
      description: '把现实行动及结果纳入玩家本人记忆档案。',
      detail: '用于后续现实推演回看已发生事实；不包含《我要狠狠操控》APP内接口。',
    },
  ],
};
