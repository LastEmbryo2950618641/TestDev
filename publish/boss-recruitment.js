window.GameModules = window.GameModules || {};

window.GameModules.bossRecruitment = {
  defaultBossState(profile = {}) {
    return {
      open: false,
      selectedJobId: 'employee-fe',
      filters: {
        industry: '',
        scale: '', province: '', city: '', county: '', town: '', payType: '',
        baseMin: '', baseMax: '', performanceMonths: '', creatorPay: '', creatorLevel: '',
      },
      jobs: this.defaultBossJobs(profile),
    };
  },


  defaultBossJobs(profile = {}) {
    const city = profile.refinedCity || profile.city || '四川省 成都市 武侯区 玉林街道';
    return [
      { id: 'employee-fe', title: '前端开发员工', company: '星河云栈科技', industry: '互联网软件', scale: '50-150人', address: city, payType: '员工', base: 9000, performanceMonths: 2, desc: '负责网页与游戏化界面开发，双休制，年底按绩效月数结算。' },
      { id: 'employee-ops', title: '内容运营员工', company: '青桥互动', industry: '现代服务业', scale: '20-50人', address: city, payType: '员工', base: 6000, performanceMonths: 1, desc: '负责日常运营、资料整理和活动执行，底薪稳定。' },
      { id: 'creator-contract', title: '签约创作者', company: '绯月文创', industry: '内容创作', scale: '10-20人', address: city, payType: '创作者', creatorPay: '提成制度', level: 'A级签约', base: 3200, royalty: '18%', desc: '公司征集作品，玩家投稿，合格后提出签约等级；后续可升级，提高提成与全勤底薪。' },
      { id: 'creator-buyout', title: '征稿买断作者', company: '绯月文创', industry: '内容创作', scale: '10-20人', address: city, payType: '创作者', creatorPay: '一次性买断', buyout: '800-5000元/篇', desc: '公司按需要数量择优录取合格作品，按作品内容一次性给定价格。' },
      { id: 'hourly-help', title: '临时资料整理小时工', company: '城南企服', industry: '现代服务业', scale: '20-50人', address: city, payType: '定时工', hourly: 45, desc: '按小时结薪酬，一小时干完即可随时离开，不绑定长期合同。' },
    ];
  },
};
