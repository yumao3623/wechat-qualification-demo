const { missingCriterion, readFields, requirement } = require('./evaluator-utils');
const { POLICY } = require('./policy-metadata');
const { finalizeEvaluation, makeCriterion } = require('./result-builder');
const { daysBetween, findMeasurement, sourcesFrom, yearsEndingAt } = require('./value-utils');

function sumEquityInvestments(measurement, startYear) {
  if (!measurement || !Array.isArray(measurement.value)) return null;
  return measurement.value
    .filter((item) => !item.year || item.year >= startYear)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

class SpecializedInnovativeEvaluator {
  getFieldRequirements(context, profile) {
    const year = context.targetApplicationYear - 1;
    const years = yearsEndingAt(year, 2);
    const requirements = [
      requirement({ key: 'operatingRevenue', year, label: `${year} 年营业收入`, type: 'money', unit: 'CNY', requiredFor: ['S-04', 'S-05'] }),
      requirement({ key: 'mainBusinessRevenue', year, label: `${year} 年主营业务收入`, type: 'money', unit: 'CNY', requiredFor: ['S-04'] }),
      requirement({ key: 'totalAssets', year, label: `${year} 年末资产总额`, type: 'money', unit: 'CNY', periodType: 'fiscal_year_end', requiredFor: ['S-04'] }),
      requirement({ key: 'totalLiabilities', year, label: `${year} 年末负债总额`, type: 'money', unit: 'CNY', periodType: 'fiscal_year_end', requiredFor: ['S-04'] }),
      requirement({ key: 'intellectualProperties', label: '知识产权清单', type: 'list', unit: 'items', requiredFor: ['S-06'] })
    ];

    for (const currentYear of years) {
      requirements.push(
        requirement({ key: 'operatingRevenue', year: currentYear, label: `${currentYear} 年营业收入`, type: 'money', unit: 'CNY', requiredFor: ['S-05'] }),
        requirement({ key: 'rdExpense', year: currentYear, label: `${currentYear} 年研发费用`, type: 'money', unit: 'CNY', requiredFor: ['S-05'] })
      );
    }

    const operatingRevenue = findMeasurement(profile, 'operatingRevenue', {
      year,
      unit: 'CNY'
    });
    if (
      operatingRevenue.state === 'known' &&
      operatingRevenue.measurement.value < 15_000_000
    ) {
      requirements.push(
        requirement({
          key: 'equityInvestments',
          label: '近两年合格机构股权投资',
          type: 'list',
          unit: 'items',
          requiredFor: ['S-04']
        })
      );
    }

    return requirements;
  }

  evaluate(profile, context) {
    const meta = POLICY.specialized;
    const criteria = [];
    const year = context.targetApplicationYear - 1;

    const abnormal = findMeasurement(profile, 'businessAbnormal', { unit: 'boolean' });
    const dishonest = findMeasurement(profile, 'seriousDishonesty', { unit: 'boolean' });
    const explicitRisk = abnormal.measurement?.value === true || dishonest.measurement?.value === true;
    criteria.push(makeCriterion({
      id: 'S-01', criterion: '主体、中小企业划型与守法合规',
      requirement: '境内依法设立、符合中小企业划型标准，申报期无经营异常/严重失信，近三年无规定重大风险',
      actualValue: { businessAbnormal: abnormal.measurement?.value ?? null, seriousDishonesty: dishonest.measurement?.value ?? null, industry: profile.industry },
      source: sourcesFrom(abnormal.measurement, dishonest.measurement), result: explicitRisk ? 'unmet' : 'manual_review',
      explanation: explicitRisk ? '已知数据存在经营异常或严重失信记录。' : '中小企业划型、合规范围及官方信用/事故记录需人工核验。',
      action: '核实所属行业划型口径并查询近三年合规与信用记录。'
    }));

    const certificates = findMeasurement(profile, 'qualificationCertificates', { unit: 'items' });
    const certificateItems = certificates.measurement?.value;
    const hasNamedCertificate = Array.isArray(certificateItems) && certificateItems.some((item) =>
      ['tech_and_innovation_sme', 'technology_innovation_sme'].includes(item.type) && item.status !== 'expired'
    );
    const explicitNoCertificates = Array.isArray(certificateItems) && certificateItems.length === 0;
    criteria.push(makeCriterion({
      id: 'S-02', criterion: '科技和创新型中小企业称号', requirement: '已获得科技和创新型中小企业称号',
      actualValue: certificates.measurement, source: certificates.measurement?.source || [],
      result: explicitNoCertificates ? 'unmet' : 'manual_review',
      explanation: hasNamedCertificate ? '已记录候选证书，需通过官方平台/证书核验有效性。' : explicitNoCertificates ? '已知证书清单为空。' : '尚无可核验的官方称号证据。',
      action: '在官方平台核实称号类型、有效期和主体一致性。', evidenceToPrepare: ['科技和创新型中小企业官方证明']
    }));

    const marketStart = findMeasurement(profile, 'marketSegmentStartDate', { unit: 'date' });
    const marketDays = marketStart.state === 'known'
      ? daysBetween(marketStart.measurement.value, `${year}-12-31`)
      : null;
    criteria.push(makeCriterion({
      id: 'S-03', criterion: '细分市场从业年限', requirement: '截至上年末从事特定细分市场不少于 3 年',
      actualValue: marketDays === null ? marketStart.measurement : { value: marketDays, unit: 'days', period: { type: 'as_of', date: `${year}-12-31` }, derivedFrom: ['marketSegmentStartDate'] },
      source: marketStart.measurement?.source || [],
      result: marketDays !== null && marketDays < 1095 ? 'unmet' : 'manual_review',
      explanation: marketDays === null ? '缺少起始日或细分市场连续性证据，需人工核验。' : `日期预筛为 ${marketDays} 天；“特定细分市场”定义和连续性仍需核验。`,
      action: '整理细分市场界定、起始时间与连续经营证据。'
    }));

    const financeReads = readFields(profile, [
      { key: 'operatingRevenue', year, unit: 'CNY' },
      { key: 'mainBusinessRevenue', year, unit: 'CNY' },
      { key: 'totalAssets', year, unit: 'CNY', periodType: 'fiscal_year_end' },
      { key: 'totalLiabilities', year, unit: 'CNY', periodType: 'fiscal_year_end' }
    ]);
    if (financeReads.some((read) => read.state !== 'known')) {
      criteria.push(missingCriterion({ id: 'S-04', criterion: '收入/融资、主营与资产负债门槛', requirement: '上年营收≥1500万或近两年合格机构实缴股权投资≥2000万；主营占比≥80%；资产负债率≤80%', action: '补充上年营业/主营收入、资产和负债数据。' }, financeReads));
    } else {
      const [operating, mainRevenue, assets, liabilities] = financeReads.map((read) => read.measurement);
      const investments = findMeasurement(profile, 'equityInvestments', { unit: 'items' });
      const investmentTotal = sumEquityInvestments(investments.measurement, year - 1);
      const revenueRoute = operating?.value >= 15_000_000;
      const investmentRoute = investmentTotal !== null && investmentTotal >= 20_000_000;
      const mainRatio = operating.value === 0 ? null : mainRevenue.value / operating.value;
      const debtRatio = assets.value === 0 ? null : liabilities.value / assets.value;
      const numericPass = (revenueRoute || investmentRoute) && mainRatio !== null && mainRatio >= 0.8 && debtRatio !== null && debtRatio <= 0.8;
      const routeMissing = !revenueRoute && investmentTotal === null;
      const routeExplicitlyFails = !revenueRoute && investmentTotal !== null && !investmentRoute;
      const explicitFail =
        routeExplicitlyFails ||
        mainRatio === null ||
        mainRatio < 0.8 ||
        debtRatio === null ||
        debtRatio > 0.8;
      criteria.push(makeCriterion({
        id: 'S-04', criterion: '收入/融资、主营与资产负债门槛', requirement: '上年营收≥1500万或近两年合格机构实缴股权投资≥2000万；主营占比≥80%；资产负债率≤80%',
        actualValue: { operatingRevenue: operating?.value ?? null, equityInvestment: investmentTotal, mainBusinessRatio: mainRatio, debtRatio, period: { type: 'fiscal_year', year } },
        source: sourcesFrom(operating, mainRevenue, assets, liabilities, investments.measurement),
        result: explicitFail ? 'unmet' : routeMissing ? 'unknown' : numericPass && revenueRoute ? 'met' : numericPass ? 'manual_review' : 'unknown',
        missingData: routeMissing ? ['equityInvestments'] : [],
        explanation: explicitFail ? '已知数值存在未达到的门槛。' : revenueRoute && numericPass ? '营收、主营占比和资产负债率通过数值预筛，财务口径仍需审计材料。' : investmentRoute ? '融资路径达到金额预筛，合格机构和实缴属性需核验。' : '营收/融资二选一数据不完整。',
        action: '准备近两年财务材料；如使用融资路径，核实投资者资格与实缴证据。'
      }));
    }

    const years = yearsEndingAt(year, 2);
    const rdReads = readFields(profile, years.flatMap((currentYear) => [
      { key: 'operatingRevenue', year: currentYear, unit: 'CNY' },
      { key: 'rdExpense', year: currentYear, unit: 'CNY' }
    ]));
    if (rdReads.some((read) => read.state !== 'known')) {
      criteria.push(missingCriterion({ id: 'S-05', criterion: '近两年研发费用', requirement: '近两年研发费用每年不低于 100 万元，且每年占营业收入不低于 3%', action: '补充近两年营业收入与研发费用。' }, rdReads));
    } else {
      const annual = years.map((currentYear, index) => {
        const operating = rdReads[index * 2].measurement;
        const rd = rdReads[index * 2 + 1].measurement;
        return { year: currentYear, operatingRevenue: operating.value, rdExpense: rd.value, ratio: operating.value === 0 ? null : rd.value / operating.value };
      });
      const passes = annual.every((item) => item.rdExpense >= 1_000_000 && item.ratio !== null && item.ratio >= 0.03);
      criteria.push(makeCriterion({
        id: 'S-05', criterion: '近两年研发费用', requirement: '近两年研发费用每年不低于 100 万元，且每年占营业收入不低于 3%',
        actualValue: { value: annual, unit: 'mixed', period: { type: 'rolling_fiscal_years', years }, derivedFrom: years.flatMap((currentYear) => [`rdExpense.${currentYear}`, `operatingRevenue.${currentYear}`]) },
        source: sourcesFrom(rdReads.map((read) => read.measurement)), result: passes ? 'manual_review' : 'unmet',
        explanation: passes ? '两年金额和占比均达到数值预筛线，研发归集与审计口径仍需核验。' : '至少一年研发费用金额或占比未达到预筛线。',
        action: '按审计口径核实近两年研发费用与营业收入。'
      }));
    }

    const ip = findMeasurement(profile, 'intellectualProperties', { unit: 'items' });
    criteria.push(
      ip.state !== 'known'
        ? missingCriterion({ id: 'S-06', criterion: 'I 类知识产权或政策豁免', requirement: '至少一项与主导产品相关、已应用并产生经济效益的 I 类知识产权，或具备规定豁免', action: '补充知识产权及奖项/研发机构豁免证据。' }, [{ key: 'intellectualProperties', ...ip }])
        : makeCriterion({
            id: 'S-06', criterion: 'I 类知识产权或政策豁免', requirement: '至少一项与主导产品相关、已应用并产生经济效益的 I 类知识产权，或具备规定豁免',
            actualValue: ip.measurement, source: ip.measurement.source,
            result: ip.measurement.value.length === 0 ? 'unmet' : 'manual_review',
            explanation: ip.measurement.value.length === 0 ? '已知清单中无知识产权，且未见豁免证据。' : '类型和数量可预筛；主导产品关联、应用和经济效益仍需材料核验。',
            action: '核实 I 类知识产权与主导产品的关联、应用及经济效益。'
          })
    );

    criteria.push(makeCriterion({
      id: 'S-07', criterion: '细分市场地位与影响力', requirement: '主导产品在国内或国际细分市场占有率较为靠前且有一定知名度、影响力',
      result: 'manual_review', explanation: '政策未给出可由 Demo 自动确认的统一数值线，用户自报排名不作已满足。',
      action: '准备细分市场界定、第三方市场数据及品牌影响力证据。'
    }));

    const platformScore = findMeasurement(profile, 'specializedDevelopmentScore', { unit: 'points' });
    const officialScore = platformScore.state === 'known' && platformScore.measurement.source?.sourceType === 'official_platform';
    criteria.push(makeCriterion({
      id: 'S-08', criterion: '专精特新发展评价得分', requirement: '本年度平台质量评价得分不低于 50 分（复核企业按新办法相应口径）',
      actualValue: platformScore.measurement, source: platformScore.measurement?.source || [],
      result: officialScore ? platformScore.measurement.value >= 50 ? 'met' : 'unmet' : 'manual_review',
      explanation: officialScore ? `已读取可核验的官方平台得分 ${platformScore.measurement.value}。` : 'Demo 不复算平台质量评价得分；无官方平台证据时固定人工核验。',
      action: '在优质中小企业梯度培育平台获取目标年度评价结果并留存凭证。',
      evidenceToPrepare: ['官方平台评价结果']
    }));

    const afterNewRule = context.assessmentDate >= '2026-04-01';
    criteria.push(makeCriterion({
      id: 'S-09', criterion: '2026 新办法与旧证书过渡', requirement: '2026-04-01 起新申请/复核使用新办法；旧证书按过渡条款至到期',
      actualValue: { value: context.assessmentDate, unit: 'date' },
      result: afterNewRule ? 'met' : 'manual_review', blocking: false,
      explanation: afterNewRule ? '当前评估日使用 2026 新办法。' : '评估日在新办法实施前，需按当时规则和证书过渡条款核验。',
      action: '核对目标申报日、旧证书签发/到期日及属地通知。'
    }));

    return finalizeEvaluation(meta, criteria);
  }
}

module.exports = { SpecializedInnovativeEvaluator, sumEquityInvestments };
