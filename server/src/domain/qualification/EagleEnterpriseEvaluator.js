const { missingCriterion, ratioActual, readFields, requirement } = require('./evaluator-utils');
const { POLICY } = require('./policy-metadata');
const { finalizeEvaluation, makeCriterion } = require('./result-builder');
const { daysBetween, findMeasurement, sourcesFrom, yearsEndingAt } = require('./value-utils');

class EagleEnterpriseEvaluator {
  isApplicable(profile, context) {
    return (
      profile.registrationRegion?.city === '杭州市' &&
      context.assessmentDate >= '2024-10-11' &&
      context.assessmentDate <= '2027-12-31'
    );
  }

  getFieldRequirements(context, profile) {
    if (!this.isApplicable(profile, context)) return [];
    const year = context.targetApplicationYear - 1;
    return [
      requirement({ key: 'employeeCount', year, label: `${year} 年职工总数`, type: 'integer', unit: 'people', requiredFor: ['E-03'] }),
      requirement({ key: 'rdEmployeeCount', year, label: `${year} 年研发人员数`, type: 'integer', unit: 'people', requiredFor: ['E-03'] }),
      requirement({ key: 'operatingRevenue', year, label: `${year} 年营业收入`, type: 'money', unit: 'CNY', requiredFor: ['E-03'] }),
      requirement({ key: 'rdExpense', year, label: `${year} 年研发费用`, type: 'money', unit: 'CNY', requiredFor: ['E-03', 'E-05B'] }),
      requirement({ key: 'intellectualProperties', label: '自研核心知识产权清单', type: 'list', unit: 'items', requiredFor: ['E-04'] })
    ];
  }

  evaluate(profile, context) {
    const meta = POLICY.eagle;
    const applicable = this.isApplicable(profile, context);

    if (!applicable) {
      const reason = profile.registrationRegion?.city !== '杭州市'
        ? `企业注册地为 ${profile.registrationRegion?.city || '未知'}，不在杭州市适用地域。`
        : '评估日不在当前已核验规则的实施期内。';
      return finalizeEvaluation(meta, [
        makeCriterion({
          id: 'E-00', criterion: '地域与规则有效期', requirement: '仅适用杭州市，当前规则有效至 2027-12-31',
          actualValue: { registrationRegion: profile.registrationRegion, assessmentDate: context.assessmentDate }, result: 'not_applicable',
          explanation: reason, action: '核对企业注册地并查询所在城市对应的培育政策。'
        })
      ]);
    }

    const criteria = [
      makeCriterion({
        id: 'E-00', criterion: '地域与规则有效期', requirement: '仅适用杭州市，当前规则有效至 2027-12-31',
        actualValue: { registrationRegion: profile.registrationRegion, assessmentDate: context.assessmentDate }, result: 'met',
        explanation: '企业注册地和评估日在当前已核验规则适用范围内。', action: '申报前再次复核杭州市当年通知。'
      })
    ];
    const year = context.targetApplicationYear - 1;
    const ageDays = daysBetween(profile.establishedAt, `${year}-12-31`);
    criteria.push(makeCriterion({
      id: 'E-01', criterion: '杭州市内注册、省科技型中小企业与成立年限', requirement: '杭州市内注册的省科技型中小企业，成立时间不超过 5 年',
      actualValue: { ageDays, registrationRegion: profile.registrationRegion },
      result: ageDays === null ? 'unknown' : ageDays > 1826 ? 'unmet' : 'manual_review',
      missingData: ageDays === null ? ['establishedAt'] : [],
      explanation: ageDays === null ? '成立日无效。' : ageDays > 1826 ? `截至 ${year}-12-31 成立已 ${ageDays} 天，超出 5 年预筛范围。` : `成立 ${ageDays} 天通过年限预筛；省科技型中小企业证明仍需官方核验。`,
      action: '核实成立日与省科技型中小企业证书有效性。'
    }));

    criteria.push(makeCriterion({
      id: 'E-02', criterion: '未来产业领域', requirement: '产品/服务属于办法列举的未来产业领域',
      result: 'manual_review', explanation: '用户选择只能作为候选，Demo 不预测主管部门的产业归类。',
      action: '整理主要产品、核心技术与杭州未来产业目录的对应说明。'
    }));

    const ratioReads = readFields(profile, [
      { key: 'rdEmployeeCount', year, unit: 'people' },
      { key: 'employeeCount', year, unit: 'people' },
      { key: 'rdExpense', year, unit: 'CNY' },
      { key: 'operatingRevenue', year, unit: 'CNY' }
    ]);
    if (ratioReads.some((read) => read.state !== 'known')) {
      criteria.push(missingCriterion({ id: 'E-03', criterion: '研发人员与研发投入占比', requirement: '上年研发人员占职工不低于 20%，研发费用占营业收入不低于 10%', action: '补充同一年度人员、研发人员、研发费用和营收。' }, ratioReads));
    } else {
      const [rdEmployees, employees, rdExpense, revenue] = ratioReads.map((read) => read.measurement);
      const peopleRatio = employees.value === 0 ? null : rdEmployees.value / employees.value;
      const rdRatio = revenue.value === 0 ? null : rdExpense.value / revenue.value;
      const passes = peopleRatio !== null && rdRatio !== null && peopleRatio >= 0.2 && rdRatio >= 0.1;
      criteria.push(makeCriterion({
        id: 'E-03', criterion: '研发人员与研发投入占比', requirement: '上年研发人员占职工不低于 20%，研发费用占营业收入不低于 10%',
        actualValue: { peopleRatio: ratioActual(rdEmployees.value, employees.value, [`rdEmployeeCount.${year}`, `employeeCount.${year}`], year), rdExpenseRatio: ratioActual(rdExpense.value, revenue.value, [`rdExpense.${year}`, `operatingRevenue.${year}`], year) },
        source: sourcesFrom(rdEmployees, employees, rdExpense, revenue), result: passes ? 'manual_review' : 'unmet',
        explanation: `研发人员占比 ${peopleRatio === null ? '无法计算' : `${(peopleRatio * 100).toFixed(2)}%`}，研发费用占比 ${rdRatio === null ? '无法计算' : `${(rdRatio * 100).toFixed(2)}%`}；人员和费用口径仍需核验。`,
        action: '准备研发人员花名册、研发辅助账和财务证据。'
      }));
    }

    const ip = findMeasurement(profile, 'intellectualProperties', { unit: 'items' });
    if (ip.state !== 'known') {
      criteria.push(missingCriterion({ id: 'E-04', criterion: '自研核心知识产权', requirement: '自研申请核心 IP 不少于 3 项（其中授权不少于 1 项），或 PCT 申请不少于 1 项', action: '补充核心知识产权的自研、申请类型与状态。' }, [{ key: 'intellectualProperties', ...ip }]));
    } else {
      const items = ip.measurement.value;
      const selfDeveloped = items.filter((item) => item.selfDeveloped === true);
      const granted = selfDeveloped.filter((item) => item.status === 'granted');
      const pct = selfDeveloped.filter((item) => item.applicationType === 'pct');
      const passes = selfDeveloped.length >= 3 && granted.length >= 1 || pct.length >= 1;
      criteria.push(makeCriterion({
        id: 'E-04', criterion: '自研核心知识产权', requirement: '自研申请核心 IP 不少于 3 项（其中授权不少于 1 项），或 PCT 申请不少于 1 项',
        actualValue: { total: items.length, selfDeveloped: selfDeveloped.length, granted: granted.length, pct: pct.length, period: ip.measurement.period }, source: ip.measurement.source,
        result: passes ? 'manual_review' : 'unmet',
        explanation: passes ? '数量和状态通过预筛；自研属性、核心性和材料真实性仍需核验。' : '已有清单的数量/状态未达到预筛线。',
        action: '核实自研属性、核心性、申请和授权凭证。'
      }));
    }

    criteria.push(makeCriterion({
      id: 'E-05A', criterion: '人才或科技奖路径', requirement: '核心成员含杭州市 D 类及以上人才，或落地项目获省科技奖二等奖及以上',
      result: 'manual_review', blocking: false, explanation: '人才等级、团队关系、项目落地和奖项需官方证据。',
      action: '如使用该路径，准备人才证明、团队关系或科技奖材料。'
    }));

    const years = yearsEndingAt(year, 3);
    const rdReads = readFields(profile, years.map((currentYear) => ({ key: 'rdExpense', year: currentYear, unit: 'CNY' })));
    const knownRd = rdReads.filter((read) => read.state === 'known').map((read) => read.measurement);
    const latestRd = knownRd.find((item) => item.period?.year === year)?.value;
    const cumulativeRd = knownRd.length === 3 ? knownRd.reduce((sum, item) => sum + item.value, 0) : null;
    const rdFundingPass = latestRd >= 10_000_000 || cumulativeRd >= 20_000_000;
    criteria.push(makeCriterion({
      id: 'E-05B', criterion: '研发投入路径', requirement: '上年研发投入不低于 1000 万元，或近三年累计不低于 2000 万元',
      actualValue: { latestRd: latestRd ?? null, cumulativeRd, years }, source: sourcesFrom(knownRd),
      result: rdReads.every((read) => read.state === 'known') ? rdFundingPass ? 'manual_review' : 'unmet' : 'unknown', blocking: false,
      missingData: rdReads.filter((read) => read.state !== 'known').map((read) => `rdExpense.${read.year}`),
      explanation: rdFundingPass ? '金额通过该备选路径预筛，归集口径仍需审计证据。' : rdReads.every((read) => read.state === 'known') ? '已有金额未达到该备选路径的预筛线；仍可核实其他备选路径。' : '近三年数据不完整，无法确认该备选路径。',
      action: '核实近三年研发投入与专项审计口径。'
    }));

    criteria.push(makeCriterion({
      id: 'E-05C', criterion: '股权融资路径', requirement: '累计获得合格机构投资者实缴股权融资不低于 2000 万元',
      result: 'manual_review', blocking: false, explanation: '融资金额、合格机构资格与实缴属性需投资材料核验。',
      action: '如使用该路径，准备投资协议、投资者资格和实缴凭证。'
    }));
    criteria.push(makeCriterion({
      id: 'E-05', criterion: '人才/奖项、研发投入、股权融资三选一', requirement: 'E-05A、E-05B、E-05C 至少一项具备充分证据',
      result: 'manual_review', explanation: rdFundingPass ? '研发投入路径达到数值预筛，仍需审计证据；其他路径未自动推定。' : '至少一条备选路径需材料核验，不因单一路径未达线直接否决。',
      action: '选择证据最完整的一条路径并准备对应官方/专业材料。'
    }));

    const dishonesty = findMeasurement(profile, 'seriousDishonesty', { unit: 'boolean' });
    criteria.push(makeCriterion({
      id: 'E-06', criterion: '严重失信名单', requirement: '企业未列入严重失信名单',
      actualValue: dishonesty.measurement, source: dishonesty.measurement?.source || [],
      result: dishonesty.state === 'known' && dishonesty.measurement.value === true ? 'unmet' : 'manual_review',
      explanation: dishonesty.state === 'known' && dishonesty.measurement.value === true ? '已知数据显示存在严重失信记录。' : '仍需评估时点的官方信用查询证据。',
      action: '在官方信用渠道查询并留存最新记录。'
    }));

    criteria.push(makeCriterion({
      id: 'E-07', criterion: '官方审核、综合评审与现场考察', requirement: '按当年通知经审核推荐、综合评审，必要时现场考察',
      result: 'manual_review', blocking: false, priority: 'low',
      explanation: 'Demo 永久保留为人工核验，不预测专家择优与主管部门结果。',
      action: '关注当年通知，按要求准备申报材料和现场核查准备。'
    }));

    return finalizeEvaluation(meta, criteria);
  }
}

module.exports = { EagleEnterpriseEvaluator };
