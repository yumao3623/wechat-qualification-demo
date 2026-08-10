const { missingCriterion, ratioActual, readFields, requirement } = require('./evaluator-utils');
const { POLICY } = require('./policy-metadata');
const { finalizeEvaluation, makeCriterion } = require('./result-builder');
const { daysBetween, findMeasurement, sourcesFrom, yearsEndingAt } = require('./value-utils');

class HighTechEnterpriseEvaluator {
  getFieldRequirements(context) {
    const latestYear = context.targetApplicationYear - 1;
    const years = yearsEndingAt(latestYear, 3);
    const requirements = [
      requirement({ key: 'residentEnterpriseStatus', label: '居民企业身份', type: 'boolean', unit: 'boolean', requiredFor: ['H-01'] }),
      requirement({ key: 'employeeCount', year: latestYear, label: `${latestYear} 年职工总数`, type: 'integer', unit: 'people', requiredFor: ['H-05'] }),
      requirement({ key: 'techEmployeeCount', year: latestYear, label: `${latestYear} 年科技人员数`, type: 'integer', unit: 'people', requiredFor: ['H-05'] }),
      requirement({ key: 'highTechRevenue', year: latestYear, label: `${latestYear} 年高新技术产品（服务）收入`, type: 'money', unit: 'CNY', requiredFor: ['H-07'] }),
      requirement({ key: 'totalRevenue', year: latestYear, label: `${latestYear} 年收入总额`, type: 'money', unit: 'CNY', requiredFor: ['H-07'] }),
      requirement({ key: 'intellectualProperties', label: '知识产权清单', type: 'list', unit: 'items', requiredFor: ['H-03'] })
    ];

    for (const year of years) {
      requirements.push(
        requirement({ key: 'salesRevenue', year, label: `${year} 年销售收入`, type: 'money', unit: 'CNY', requiredFor: ['H-06'] }),
        requirement({ key: 'rdExpense', year, label: `${year} 年研发费用`, type: 'money', unit: 'CNY', requiredFor: ['H-06'] }),
        requirement({ key: 'domesticRdExpense', year, label: `${year} 年境内研发费用`, type: 'money', unit: 'CNY', requiredFor: ['H-06'] })
      );
    }

    return requirements;
  }

  evaluate(profile, context) {
    const meta = POLICY.highTech;

    if (profile.registrationRegion?.country !== 'CN') {
      return finalizeEvaluation(meta, [
        makeCriterion({
          id: 'H-01',
          criterion: '注册地域与居民企业',
          requirement: '在中国境内（不含港澳台）注册的居民企业',
          actualValue: profile.registrationRegion,
          result: 'not_applicable',
          explanation: '当前注册国家/地区不在本规则适用范围。',
          action: '核对企业注册主体及目标政策适用范围。'
        })
      ]);
    }

    const criteria = [];
    const resident = findMeasurement(profile, 'residentEnterpriseStatus', { unit: 'boolean' });
    criteria.push(
      resident.state !== 'known'
        ? missingCriterion({ id: 'H-01', criterion: '注册地域与居民企业', requirement: '在中国境内（不含港澳台）注册的居民企业', action: '补充居民企业身份并准备登记/税务证据。' }, [{ key: 'residentEnterpriseStatus', ...resident }])
        : makeCriterion({
            id: 'H-01', criterion: '注册地域与居民企业', requirement: '在中国境内（不含港澳台）注册的居民企业',
            actualValue: resident.measurement, unit: resident.measurement.unit, period: resident.measurement.period, source: resident.measurement.source,
            result: resident.measurement.value ? 'manual_review' : 'unmet',
            explanation: resident.measurement.value ? '地域符合预筛，居民企业身份仍需登记/税务证据。' : '已知数据显示不具备居民企业身份。',
            action: '核实居民企业身份及相关登记/税务证据。',
            evidenceToPrepare: ['企业登记与税务身份证明']
          })
    );

    const ageDays = daysBetween(profile.establishedAt, context.assessmentDate);
    criteria.push(makeCriterion({
      id: 'H-02', criterion: '注册成立年限', requirement: '申请时注册成立一年以上',
      actualValue: ageDays === null ? null : { value: ageDays, unit: 'days', period: { type: 'as_of', date: context.assessmentDate }, derivedFrom: ['establishedAt'] },
      source: [], result: ageDays === null ? 'unknown' : ageDays >= 365 ? 'met' : 'unmet',
      missingData: ageDays === null ? ['establishedAt'] : [],
      explanation: ageDays === null ? '成立日期无效。' : `截至评估日已成立 ${ageDays} 天。`,
      action: ageDays !== null && ageDays >= 365 ? '保留主体登记材料。' : '核对成立日期与目标申报日。'
    }));

    const ip = findMeasurement(profile, 'intellectualProperties', { unit: 'items' });
    criteria.push(
      ip.state !== 'known'
        ? missingCriterion({ id: 'H-03', criterion: '核心知识产权', requirement: '拥有对主要产品（服务）发挥核心支持作用的知识产权所有权', action: '补充知识产权清单并核实权属、有效性和主营业务关联。' }, [{ key: 'intellectualProperties', ...ip }])
        : makeCriterion({
            id: 'H-03', criterion: '核心知识产权', requirement: '拥有对主要产品（服务）发挥核心支持作用的知识产权所有权',
            actualValue: ip.measurement, unit: 'items', period: ip.measurement.period, source: ip.measurement.source,
            result: ip.measurement.value.length === 0 ? 'unmet' : 'manual_review',
            explanation: ip.measurement.value.length === 0 ? '已知清单中无知识产权。' : `已记录 ${ip.measurement.value.length} 项；所有权、无争议及核心支持作用仍需核验。`,
            action: '核实现有知识产权及其与主营业务的关联性。',
            evidenceToPrepare: ['知识产权证书', '权属及产品关联说明']
          })
    );

    criteria.push(makeCriterion({
      id: 'H-04', criterion: '高新技术领域归属', requirement: '企业核心技术属于《国家重点支持的高新技术领域》',
      result: 'manual_review', explanation: '领域候选可由企业说明，最终归类不能仅靠 Demo 字段确认。',
      action: '整理核心技术、主要产品与高新技术领域的对应说明。', evidenceToPrepare: ['核心技术说明', '领域对应说明']
    }));

    const latestYear = context.targetApplicationYear - 1;
    const people = readFields(profile, [
      { key: 'employeeCount', year: latestYear, unit: 'people' },
      { key: 'techEmployeeCount', year: latestYear, unit: 'people' }
    ]);
    if (people.some((read) => read.state !== 'known')) {
      criteria.push(missingCriterion({ id: 'H-05', criterion: '科技人员占比', requirement: '当年科技人员占企业职工总数不低于 10%', action: '补充同一年度职工和科技人员数，并核实人员口径。' }, people));
    } else {
      const [employee, tech] = people.map((read) => read.measurement);
      const ratio = employee.value === 0 ? null : tech.value / employee.value;
      criteria.push(makeCriterion({
        id: 'H-05', criterion: '科技人员占比', requirement: '当年科技人员占企业职工总数不低于 10%',
        actualValue: ratioActual(tech.value, employee.value, [`techEmployeeCount.${latestYear}`, `employeeCount.${latestYear}`], latestYear), source: sourcesFrom(employee, tech),
        result: ratio !== null && ratio >= 0.1 ? 'manual_review' : 'unmet',
        explanation: ratio === null ? '职工总数为 0，无法形成有效占比。' : `预筛占比为 ${(ratio * 100).toFixed(2)}%；人员定义和工作时长仍需证据。`,
        action: '准备科技人员花名册、劳动关系和工作时长证据。', evidenceToPrepare: ['科技人员花名册与工作时长证据']
      }));
    }

    const years = yearsEndingAt(latestYear, 3);
    const rdReads = readFields(profile, years.flatMap((year) => [
      { key: 'salesRevenue', year, unit: 'CNY' },
      { key: 'rdExpense', year, unit: 'CNY' },
      { key: 'domesticRdExpense', year, unit: 'CNY' }
    ]));
    if (rdReads.some((read) => read.state !== 'known')) {
      criteria.push(missingCriterion({ id: 'H-06', criterion: '研发费用比例', requirement: '近三年研发费用占销售收入按收入档为 5%/4%/3%，境内研发费用占比不低于 60%', action: '补充近三年销售收入、研发费用和境内研发费用。' }, rdReads));
    } else {
      const sales = rdReads.filter((_, index) => index % 3 === 0).map((read) => read.measurement);
      const rd = rdReads.filter((_, index) => index % 3 === 1).map((read) => read.measurement);
      const domestic = rdReads.filter((_, index) => index % 3 === 2).map((read) => read.measurement);
      const salesTotal = sales.reduce((sum, item) => sum + item.value, 0);
      const rdTotal = rd.reduce((sum, item) => sum + item.value, 0);
      const domesticTotal = domestic.reduce((sum, item) => sum + item.value, 0);
      const latestSales = sales.at(-1).value;
      const threshold = latestSales <= 50_000_000 ? 0.05 : latestSales <= 200_000_000 ? 0.04 : 0.03;
      const rdRatio = salesTotal === 0 ? null : rdTotal / salesTotal;
      const domesticRatio = rdTotal === 0 ? null : domesticTotal / rdTotal;
      const passes = rdRatio !== null && domesticRatio !== null && rdRatio >= threshold && domesticRatio >= 0.6;
      criteria.push(makeCriterion({
        id: 'H-06', criterion: '研发费用比例', requirement: '近三年研发费用占销售收入按收入档为 5%/4%/3%，境内研发费用占比不低于 60%',
        actualValue: { value: { rdRatio, domesticRatio, threshold }, unit: 'ratio', period: { type: 'rolling_fiscal_years', years }, derivedFrom: years.flatMap((year) => [`salesRevenue.${year}`, `rdExpense.${year}`, `domesticRdExpense.${year}`]) },
        source: sourcesFrom(sales, rd, domestic), result: passes ? 'manual_review' : 'unmet',
        explanation: `研发占比 ${rdRatio === null ? '无法计算' : `${(rdRatio * 100).toFixed(2)}%`}，档位线 ${(threshold * 100).toFixed(0)}%；境内占比 ${domesticRatio === null ? '无法计算' : `${(domesticRatio * 100).toFixed(2)}%`}。归集与审计口径仍需核验。`,
        action: '准备近三年研发辅助账及专项审计/鉴证材料。', evidenceToPrepare: ['近三年研发辅助账', '专项审计或鉴证材料']
      }));
    }

    const revenueReads = readFields(profile, [
      { key: 'highTechRevenue', year: latestYear, unit: 'CNY' },
      { key: 'totalRevenue', year: latestYear, unit: 'CNY' }
    ]);
    if (revenueReads.some((read) => read.state !== 'known')) {
      criteria.push(missingCriterion({ id: 'H-07', criterion: '高新技术产品（服务）收入占比', requirement: '近一年高新技术产品（服务）收入占企业同期总收入不低于 60%', action: '补充同一年度高新技术产品收入与收入总额。' }, revenueReads));
    } else {
      const [highTech, total] = revenueReads.map((read) => read.measurement);
      const ratio = total.value === 0 ? null : highTech.value / total.value;
      criteria.push(makeCriterion({
        id: 'H-07', criterion: '高新技术产品（服务）收入占比', requirement: '近一年高新技术产品（服务）收入占企业同期总收入不低于 60%',
        actualValue: ratioActual(highTech.value, total.value, [`highTechRevenue.${latestYear}`, `totalRevenue.${latestYear}`], latestYear), source: sourcesFrom(highTech, total),
        result: ratio !== null && ratio >= 0.6 ? 'manual_review' : 'unmet',
        explanation: ratio === null ? '收入总额为 0，无法形成有效占比。' : `预筛占比为 ${(ratio * 100).toFixed(2)}%；收入的高新属性仍需核验。`,
        action: '核实高新技术产品（服务）收入分类及对应合同/发票。', evidenceToPrepare: ['收入专项明细与产品归类说明']
      }));
    }

    criteria.push(makeCriterion({
      id: 'H-08', criterion: '创新能力综合评价', requirement: '知识产权、成果转化、研发组织管理和企业成长性综合得分高于 70 分',
      result: 'manual_review', explanation: '综合评价含专家定性评分，Demo 不伪造得分。',
      action: '按四个评分维度整理证据并开展人工预审。', evidenceToPrepare: ['成果转化材料', '研发组织管理制度', '近三年成长性数据']
    }));

    const incidents = findMeasurement(profile, 'majorIncidents');
    const hasIncident = incidents.state === 'known' && Array.isArray(incidents.measurement.value) && incidents.measurement.value.length > 0;
    criteria.push(makeCriterion({
      id: 'H-09', criterion: '申请前一年重大事故与环境违法', requirement: '申请认定前一年内无重大安全、重大质量事故或严重环境违法行为',
      actualValue: incidents.measurement, source: incidents.measurement?.source || [], result: hasIncident ? 'unmet' : 'manual_review',
      explanation: hasIncident ? '已知数据存在不利记录。' : '缺少完整的官方监管查询证据，不将未发现记录视为已确认无风险。',
      action: '查询并留存安全、质量和环境监管记录。', evidenceToPrepare: ['官方监管查询记录']
    }));

    return finalizeEvaluation(meta, criteria);
  }
}

module.exports = { HighTechEnterpriseEvaluator };
