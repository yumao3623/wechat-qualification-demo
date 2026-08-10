const { missingCriterion, ratioActual, readFields, requirement } = require('./evaluator-utils');
const { POLICY } = require('./policy-metadata');
const { finalizeEvaluation, makeCriterion } = require('./result-builder');
const { findMeasurement, sourcesFrom } = require('./value-utils');

function techPersonnelScore(ratio) {
  if (ratio >= 0.3) return 20;
  if (ratio >= 0.25) return 16;
  if (ratio >= 0.2) return 12;
  if (ratio >= 0.15) return 8;
  if (ratio >= 0.1) return 4;
  return 0;
}

function rdScore(method, ratio) {
  const thresholds =
    method === 'sales_revenue'
      ? [0.06, 0.05, 0.04, 0.03, 0.02]
      : [0.3, 0.25, 0.2, 0.15, 0.1];
  const scores = [50, 40, 30, 20, 10];
  const index = thresholds.findIndex((threshold) => ratio >= threshold);
  return index === -1 ? 0 : scores[index];
}

function intellectualPropertyScore(items) {
  if (items.some((item) => item.category === 'invention_patent')) return 30;
  const categoryTwoCount = items.filter((item) =>
    ['utility_model', 'design_patent', 'software_copyright'].includes(item.category)
  ).length;
  if (categoryTwoCount >= 4) return 24;
  if (categoryTwoCount === 3) return 18;
  if (categoryTwoCount === 2) return 12;
  if (categoryTwoCount === 1) return 6;
  return 0;
}

class TechSMEEvaluator {
  getFieldRequirements(context) {
    const year = context.targetApplicationYear - 1;
    return [
      requirement({ key: 'employeeCount', year, label: `${year} 年职工总数`, type: 'integer', unit: 'people', requiredFor: ['T-02', 'T-06', 'T-10'] }),
      requirement({ key: 'salesRevenue', year, label: `${year} 年销售收入`, type: 'money', unit: 'CNY', requiredFor: ['T-02', 'T-07'] }),
      requirement({ key: 'totalAssets', year, label: `${year} 年末资产总额`, type: 'money', unit: 'CNY', periodType: 'fiscal_year_end', requiredFor: ['T-02'] }),
      requirement({ key: 'techEmployeeCount', year, label: `${year} 年科技人员数`, type: 'integer', unit: 'people', requiredFor: ['T-05', 'T-06'] }),
      requirement({ key: 'rdExpense', year, label: `${year} 年研发费用`, type: 'money', unit: 'CNY', requiredFor: ['T-05', 'T-07', 'T-10'] }),
      requirement({ key: 'rdScoringMethod', label: '研发投入评分口径', type: 'enum', unit: 'enum', periodType: undefined, requiredFor: ['T-07'], validation: { enum: ['sales_revenue', 'cost_expense'] } }),
      requirement({ key: 'intellectualProperties', label: '知识产权清单', type: 'list', unit: 'items', requiredFor: ['T-05', 'T-08', 'T-10'] })
    ];
  }

  evaluate(profile, context) {
    const meta = POLICY.techSme;
    const criteria = [];
    const year = context.targetApplicationYear - 1;

    criteria.push(makeCriterion({
      id: 'T-01', criterion: '居民企业、会计核算与税收口径',
      requirement: '中国境内居民企业，会计核算健全、查账征收，可准确归集研发费用并缴纳企业所得税',
      actualValue: { registrationCountry: profile.registrationRegion?.country || null },
      result: profile.registrationRegion?.country === 'CN' ? 'manual_review' : 'unmet',
      explanation: profile.registrationRegion?.country === 'CN' ? '注册地域符合预筛；会计、征收和研发归集口径需税务/财务材料核验。' : '注册国家/地区不在本规则范围。',
      action: '核实查账征收、会计核算和研发费用归集材料。',
      evidenceToPrepare: ['纳税申报与会计核算材料', '研发费用辅助账']
    }));

    const scaleReads = readFields(profile, [
      { key: 'employeeCount', year, unit: 'people' },
      { key: 'salesRevenue', year, unit: 'CNY' },
      { key: 'totalAssets', year, unit: 'CNY', periodType: 'fiscal_year_end' }
    ]);
    if (scaleReads.some((read) => read.state !== 'known')) {
      criteria.push(missingCriterion({ id: 'T-02', criterion: '企业规模门槛', requirement: '职工不超过 500 人、销售收入不超过 2 亿元、资产总额不超过 2 亿元', action: '补充同年度职工、销售收入和资产总额。' }, scaleReads));
    } else {
      const [employees, revenue, assets] = scaleReads.map((read) => read.measurement);
      const passes = employees.value <= 500 && revenue.value <= 200_000_000 && assets.value <= 200_000_000;
      criteria.push(makeCriterion({
        id: 'T-02', criterion: '企业规模门槛', requirement: '职工不超过 500 人、销售收入不超过 2 亿元、资产总额不超过 2 亿元',
        actualValue: { employeeCount: employees.value, salesRevenue: revenue.value, totalAssets: assets.value, period: { type: 'fiscal_year', year } },
        source: sourcesFrom(employees, revenue, assets), result: passes ? 'met' : 'unmet',
        explanation: `职工 ${employees.value} 人，销售收入 ${revenue.value} 元，资产 ${assets.value} 元。`,
        action: passes ? '保留财务和人员口径证据。' : '核对当年企业规模口径及是否超出评价范围。'
      }));
    }

    const prohibited = findMeasurement(profile, 'prohibitedIndustry', { unit: 'boolean' });
    criteria.push(makeCriterion({
      id: 'T-03', criterion: '产品和行业适用性', requirement: '产品/服务不属于国家禁止、限制、淘汰类及研发加计扣除不适用行业',
      actualValue: prohibited.measurement, source: prohibited.measurement?.source || [],
      result: prohibited.state === 'known' && prohibited.measurement.value === true ? 'unmet' : 'manual_review',
      explanation: prohibited.state === 'known' && prohibited.measurement.value === true ? '已知数据标记为不适用行业。' : '行业代码和具体产品仍需与当年目录人工匹配。',
      action: '核对主营业务、产品及当年禁止/限制/淘汰目录。'
    }));

    const riskKeys = ['majorIncidents', 'researchDishonesty', 'businessAbnormal', 'seriousDishonesty'];
    const riskReads = riskKeys.map((key) => ({ key, ...findMeasurement(profile, key) }));
    const explicitRisk = riskReads.some((read) => {
      if (read.state !== 'known') return false;
      return Array.isArray(read.measurement.value)
        ? read.measurement.value.length > 0
        : read.measurement.value === true;
    });
    criteria.push(makeCriterion({
      id: 'T-04', criterion: '重大风险与信用记录', requirement: '填报上一年及当年无重大事故、严重环境违法、科研严重失信，未列经营异常/严重违法失信',
      actualValue: riskReads.filter((read) => read.state === 'known').map((read) => ({ key: read.key, value: read.measurement.value })),
      source: sourcesFrom(riskReads.map((read) => read.measurement)), result: explicitRisk ? 'unmet' : 'manual_review',
      explanation: explicitRisk ? '已知数据中存在不利风险/信用记录。' : '尚需当年官方系统查询与材料核验。',
      action: '查询并留存当年信用、环保、安全及科研诚信记录。'
    }));

    const personnelReads = readFields(profile, [
      { key: 'employeeCount', year, unit: 'people' },
      { key: 'techEmployeeCount', year, unit: 'people' }
    ]);
    let personnelScore = null;
    if (personnelReads.some((read) => read.state !== 'known')) {
      criteria.push(missingCriterion({ id: 'T-06', criterion: '科技人员指标', requirement: '科技人员占比按 30%/25%/20%/15%/10% 分档计分', action: '补充同年度职工和科技人员数。' }, personnelReads));
    } else {
      const [employees, techEmployees] = personnelReads.map((read) => read.measurement);
      const ratio = employees.value === 0 ? null : techEmployees.value / employees.value;
      personnelScore = ratio === null ? 0 : techPersonnelScore(ratio);
      criteria.push(makeCriterion({
        id: 'T-06', criterion: '科技人员指标', requirement: '科技人员占比按 30%/25%/20%/15%/10% 分档计分',
        actualValue: { ...ratioActual(techEmployees.value, employees.value, [`techEmployeeCount.${year}`, `employeeCount.${year}`], year), score: personnelScore },
        source: sourcesFrom(employees, techEmployees), result: personnelScore > 0 ? 'met' : 'unmet',
        explanation: `预筛占比 ${ratio === null ? '无法计算' : `${(ratio * 100).toFixed(2)}%`}，该项 ${personnelScore} 分。`,
        action: personnelScore > 0 ? '准备科技人员口径与工作时长证据。' : '核对科技人员范围并评估人员指标缺口。'
      }));
    }

    const methodRead = findMeasurement(profile, 'rdScoringMethod', { unit: 'enum' });
    const rdRead = findMeasurement(profile, 'rdExpense', { year, unit: 'CNY' });
    let rdMetricScore = null;
    const methodIsValid =
      methodRead.state === 'known' &&
      ['sales_revenue', 'cost_expense'].includes(methodRead.measurement.value);
    if (!methodIsValid || rdRead.state !== 'known') {
      criteria.push(missingCriterion({ id: 'T-07', criterion: '研发投入指标', requirement: '明确选择研发费用/销售收入或研发费用/成本费用口径分档计分', action: '选择有完整证据的研发评分口径并补充对应数据。' }, [
        { key: 'rdScoringMethod', ...methodRead, state: methodIsValid ? methodRead.state : 'invalid_type' },
        { key: 'rdExpense', year, ...rdRead }
      ]));
    } else {
      const denominatorKey = methodRead.measurement.value === 'sales_revenue' ? 'salesRevenue' : 'costExpense';
      const denominator = findMeasurement(profile, denominatorKey, { year, unit: 'CNY' });
      if (denominator.state !== 'known') {
        criteria.push(missingCriterion({ id: 'T-07', criterion: '研发投入指标', requirement: '按用户明确选择的合法口径分档计分', action: `补充 ${year} 年${denominatorKey === 'salesRevenue' ? '销售收入' : '成本费用'}。` }, [{ key: denominatorKey, year, ...denominator }]));
      } else {
        const ratio = denominator.measurement.value === 0 ? null : rdRead.measurement.value / denominator.measurement.value;
        rdMetricScore = ratio === null ? 0 : rdScore(methodRead.measurement.value, ratio);
        criteria.push(makeCriterion({
          id: 'T-07', criterion: '研发投入指标', requirement: '按用户明确选择的研发费用/销售收入或研发费用/成本费用口径分档计分',
          actualValue: { ...ratioActual(rdRead.measurement.value, denominator.measurement.value, [`rdExpense.${year}`, `${denominatorKey}.${year}`], year), method: methodRead.measurement.value, score: rdMetricScore },
          source: sourcesFrom(methodRead.measurement, rdRead.measurement, denominator.measurement), result: 'met',
          explanation: `选定口径预筛比例 ${ratio === null ? '无法计算' : `${(ratio * 100).toFixed(2)}%`}，该项 ${rdMetricScore} 分；归集真实性仍需核验。`,
          action: '准备选定口径的研发费用归集和财务证据。'
        }));
      }
    }

    const ipRead = findMeasurement(profile, 'intellectualProperties', { unit: 'items' });
    let ipScore = null;
    if (ipRead.state !== 'known') {
      criteria.push(missingCriterion({ id: 'T-08', criterion: '科技成果指标', requirement: '有效且与主要产品相关的 I/II 类知识产权按档计分', action: '补充知识产权类型、状态和产品关联证据。' }, [{ key: 'intellectualProperties', ...ipRead }]));
    } else {
      ipScore = intellectualPropertyScore(ipRead.measurement.value);
      criteria.push(makeCriterion({
        id: 'T-08', criterion: '科技成果指标', requirement: '有效且与主要产品相关的 I/II 类知识产权按档计分',
        actualValue: { value: ipRead.measurement.value, unit: 'items', period: ipRead.measurement.period, score: ipScore }, source: ipRead.measurement.source,
        result: ipScore > 0 ? 'manual_review' : 'unmet',
        explanation: `按类型和数量预计 ${ipScore} 分；有效性、无争议与产品关联仍需核验。`,
        action: '核实知识产权有效性、权属争议和主要产品关联。'
      }));
    }

    const scoresKnown = [personnelScore, rdMetricScore, ipScore].every((score) => score !== null);
    const totalScore = scoresKnown ? personnelScore + rdMetricScore + ipScore : null;
    const scoreMissingData = [
      ...new Set(
        criteria
          .filter((item) => ['T-06', 'T-07', 'T-08'].includes(item.id))
          .flatMap((item) => item.missingData)
      )
    ];
    criteria.push(makeCriterion({
      id: 'T-05', criterion: '综合评分门槛', requirement: '综合评分不低于 60 分，且科技人员指标不得为 0 分',
      actualValue: totalScore === null ? null : { value: totalScore, unit: 'points', period: { type: 'fiscal_year', year }, components: { personnelScore, rdMetricScore, ipScore } },
      result: totalScore === null ? 'unknown' : totalScore >= 60 && personnelScore > 0 ? 'manual_review' : 'unmet',
      missingData: totalScore === null ? scoreMissingData : [],
      explanation: totalScore === null ? '分项数据不完整，无法计算预筛总分。' : `结构化数据预筛总分 ${totalScore}；证据真实性与口径仍需核验。`,
      action: totalScore === null ? '先补齐科技人员、研发投入和知识产权计分数据。' : '核验分项证据并在官方平台完成年度评价。'
    }));

    criteria.push(makeCriterion({
      id: 'T-09', criterion: '可直接确认情形', requirement: '有效高企、近五年科技奖、研发机构或主导标准等情形可按办法直接确认',
      result: 'manual_review', blocking: false, priority: 'low',
      explanation: 'Demo 未将自报称号/奖项直接当作官方确认结果。',
      action: '如具备直接确认条件，准备官方证书、年限和排名证据。'
    }));

    const employeeValue = scaleReads[0]?.measurement?.value;
    const ipCount = ipRead.measurement?.value?.length;
    const rdValue = rdRead.measurement?.value;
    const firstTime = findMeasurement(profile, 'firstTimeApplicant', { unit: 'boolean' });
    const triggers = [
      employeeValue !== undefined && employeeValue <= 5 ? '职工不超过 5 人' : null,
      ipCount === 0 ? '知识产权数为 0' : null,
      rdValue !== undefined && rdValue < 100_000 ? '研发费用低于 10 万元' : null,
      firstTime.measurement?.value === true ? '首次参评' : null
    ].filter(Boolean);
    criteria.push(makeCriterion({
      id: 'T-10', criterion: '2026 年实地核查触发', requirement: '对小规模、无 IP、低研发费、特定风险或首次参评等情形强化核查',
      actualValue: triggers, result: triggers.length > 0 ? 'manual_review' : 'met', blocking: false,
      explanation: triggers.length > 0 ? `触发核查提示：${triggers.join('、')}。触发本身不是否决条件。` : '已有数据未触发列明的实地核查提示。',
      action: triggers.length > 0 ? '提前整理人员、研发、知识产权和信用材料以备核查。' : '按年度通知继续自查核查触发项。'
    }));

    const assessmentDate = Date.parse(`${context.assessmentDate}T00:00:00.000Z`);
    const windowStart = Date.parse(`${context.targetApplicationYear}-06-01T00:00:00.000Z`);
    const windowEnd = Date.parse(`${context.targetApplicationYear}-08-31T00:00:00.000Z`);
    const inWindow = assessmentDate >= windowStart && assessmentDate <= windowEnd;
    criteria.push(makeCriterion({
      id: 'T-11', criterion: `${context.targetApplicationYear} 年度填报时间窗口`, requirement: `${context.targetApplicationYear} 年度公布窗口为 06-01 至 08-31`,
      actualValue: { value: context.assessmentDate, unit: 'date' }, result: inWindow ? 'met' : 'manual_review', blocking: false,
      explanation: inWindow ? '评估日在当年公布时间窗内。' : '评估日不在当年公布窗口内；这不等于企业条件不符合。',
      action: '在申报前复核当年最新通知、开放时间和属地要求。'
    }));

    return finalizeEvaluation(meta, criteria);
  }
}

module.exports = {
  TechSMEEvaluator,
  intellectualPropertyScore,
  rdScore,
  techPersonnelScore
};
