window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.organizationViewHelpers = {
  companyOrganizationSectionView() {
    const company = this.currentCompany();
    const routes = (Array.isArray(company.promotionRoutes) ? company.promotionRoutes : []).map((route = {}, index = 0) => {
      const check = this.canPromoteCareerRoute ? this.canPromoteCareerRoute(route) : { ok: false, missing: [] };
      return {
        key: route.id || `${route.name || 'route'}-${index}`,
        id: route.id || '',
        name: route.name || `晋级路线${index + 1}`,
        nextPosition: route.nextPosition || '未设定',
        performanceText: `${Number(route.currentPerformance || 0)}/${Number(route.requiredPerformance || 0)}`,
        abilitiesText: (Array.isArray(route.requirements) ? route.requirements : []).map((item) => `${item.name || '能力'} lv.${Number(item.currentLevel || 0)}/lv.${Number(item.requiredLevel || 0)}`).join('，') || '无明确能力要求',
        vacanciesText: `${Number(route.vacancies || 0)}`,
        notes: route.notes || '可以在现实推演走关系或其他途径晋级。',
        canPromote: !!check.ok,
        blockedReason: check.missing?.join('、') || '',
      };
    });

    return {
      emptyText: '暂无职业晋级路线',
      currentPosition: company.positionTitle || company.name || '未设定',
      currentRoute: company.currentRoute || this.careerCurrentRouteName?.() || '未设定',
      directLeader: company.directLeader?.name
        ? `${company.directLeader.name}(${company.directLeader.title || '直系领导'})`
        : '未设定',
      routeRows: routes,
      promotionMessage: this.companyState?.promotionMessage || '',
    };
  },

  freelanceLevelSectionView() {
    const profile = this.currentCareerProfile?.('freelance') || {};
    const title = profile.reputationTitle || {};
    const abilities = (Array.isArray(profile.abilities) ? profile.abilities : []).map((item = {}, index) => ({
      key: item.id || `${item.name || 'ability'}-${index}`,
      text: `${item.type || '能力'}：${item.name || '未命名'} lv.${Number(item.level || 0)}`,
    }));
    const review = String(title.review || title.evaluation || '').trim();
    const titleText = title.title
      ? `${title.title}(${Number(title.current || 0)}/${Number(title.max || 0)}${title.nextTitle ? `，下一级: ${title.nextTitle}` : ''}${review ? `，${review}` : ''})`
      : '待 AI 生成业内名声称号';
    return {
      titleText,
      abilities,
      specialty: profile.specialty || '待现实推演补全擅长方向',
      emptyText: '角色信息中暂无与该自由职业匹配的知识/技能/职业。',
    };
  },

  freelanceOrderSectionView() {
    const profile = this.currentCareerProfile?.('freelance') || {};
    const orders = (Array.isArray(profile.orders) ? profile.orders : []).map((item = {}, index) => ({
      key: item.id || `${item.title || 'order'}-${index}`,
      title: item.title || `可接订单${index + 1}`,
      publisher: item.publisher || '未填写',
      publisherStatus: item.publisherStatus || '业内地位未填写',
      publishedAt: item.publishedAt || '未填写',
      deadlineAt: item.deadlineAt || '未填写',
      requiredQuality: item.requiredQuality || '未填写',
      requiredStyle: item.requiredStyle || '未填写',
      priceText: item.priceText || '未填写',
      reputationReward: item.reputationReward || '名声收益未填写',
    }));
    return {
      orders,
      emptyText: '暂无可接订单，等待现实推演 Stage13 根据当前世界生成。',
    };
  },

  freelanceWorksSectionView() {
    const profile = this.currentCareerProfile?.('freelance') || {};
    const works = (Array.isArray(profile.works) ? profile.works : []).map((item = {}, index) => ({
      key: item.id || `${item.title || 'work'}-${index}`,
      title: item.title || `成果${index + 1}`,
      intro: item.intro || '暂无介绍',
      recognition: Math.max(0, Math.min(100, Number(item.recognition || 0))),
      review: item.review || '暂无业内评价',
    }));
    return {
      works,
      emptyText: '暂无成果记录，可在现实推演或完成订单后生成。',
    };
  },
};
