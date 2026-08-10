const STATUS_SUMMARIES = Object.freeze({
  promising: '可自动预筛项未见明确缺口，仍需以主管部门审核为准。',
  opportunity: '数值预筛具备一定基础，仍有材料、平台或专家核验项。',
  needs_data: '关键字段不完整或口径无效，补充后才能继续预筛。',
  not_met: '已有有效数据显示至少一项关键预筛门槛暂未达到。',
  not_applicable: '当前企业地域、主体或规则日期不在该版本适用范围内。'
});

function publicCriterion(criterion) {
  const {
    blocking: _blocking,
    gapTitle: _gapTitle,
    gapImpact: _gapImpact,
    priority: _priority,
    evidenceToPrepare: _evidenceToPrepare,
    suggestedOwner: _suggestedOwner,
    advisorRecommended: _advisorRecommended,
    ...output
  } = criterion;

  return output;
}

function evidenceId(qualificationType, ruleId) {
  return `evd_${qualificationType}_${ruleId.toLowerCase().replaceAll('-', '_')}`;
}

function finalizeEvaluation(meta, criteria) {
  const publicCriteria = criteria.map(publicCriterion);
  const evidence = criteria.map((criterion) => ({
    id: evidenceId(meta.qualificationType, criterion.id),
    qualificationType: meta.qualificationType,
    ruleId: criterion.id,
    criterion: criterion.criterion,
    requirement: criterion.requirement,
    actualValue: criterion.actualValue,
    sources: Array.isArray(criterion.source)
      ? criterion.source
      : criterion.source
        ? [criterion.source]
        : [],
    result: criterion.result,
    missingData: criterion.missingData,
    explanation: criterion.explanation,
    action: criterion.action,
    policyRef: {
      ruleVersionId: meta.ruleVersion.id,
      sourceIndex: 0
    }
  }));

  const gaps = [];
  const actions = [];

  for (const criterion of criteria) {
    const gapType = {
      unmet: 'unmet',
      unknown: 'missing_data',
      manual_review: 'manual_review'
    }[criterion.result];

    if (!gapType) continue;

    const gapId = `gap_${meta.qualificationType}_${criterion.id.toLowerCase().replaceAll('-', '_')}`;
    const gap = {
      id: gapId,
      qualificationType: meta.qualificationType,
      ruleId: criterion.id,
      type: gapType,
      title: criterion.gapTitle || criterion.criterion,
      whyItMatters: criterion.requirement,
      impact: criterion.gapImpact || (criterion.blocking ? 'blocks_confident_conclusion' : 'requires_follow_up'),
      priority: criterion.priority || (criterion.blocking ? 'high' : 'medium'),
      evidenceIds: [evidenceId(meta.qualificationType, criterion.id)],
      missingFields: [...criterion.missingData]
    };
    gaps.push(gap);

    actions.push({
      id: `act_${meta.qualificationType}_${criterion.id.toLowerCase().replaceAll('-', '_')}`,
      gapId,
      qualificationType: meta.qualificationType,
      title: criterion.action,
      description: criterion.action,
      priority: gap.priority,
      suggestedOwner: criterion.suggestedOwner || '企业申报负责人',
      evidenceToPrepare: criterion.evidenceToPrepare || [],
      advisorRecommended: criterion.advisorRecommended ?? gap.priority === 'high',
      disclaimer: '建议仅用于材料准备，不构成申报通过承诺。'
    });
  }

  const missingFields = [...new Set(criteria.flatMap((item) => item.missingData))];
  const status = aggregateStatus(criteria);

  return {
    qualificationType: meta.qualificationType,
    displayName: meta.displayName,
    jurisdiction: meta.jurisdiction,
    applicableRegion: meta.applicableRegion,
    status,
    summary: meta.summaries?.[status] || STATUS_SUMMARIES[status],
    criteria: publicCriteria,
    evidence,
    missingFields,
    gaps,
    actions,
    ruleVersion: structuredClone(meta.ruleVersion)
  };
}

function aggregateStatus(criteria) {
  if (criteria.length > 0 && criteria.every((item) => item.result === 'not_applicable')) {
    return 'not_applicable';
  }

  if (criteria.some((item) => item.blocking !== false && item.result === 'unmet')) {
    return 'not_met';
  }

  if (criteria.some((item) => item.blocking !== false && item.result === 'unknown')) {
    return 'needs_data';
  }

  if (
    criteria.some(
      (item) =>
        item.result === 'manual_review' ||
        item.result === 'unmet' ||
        item.result === 'unknown'
    )
  ) {
    return 'opportunity';
  }

  return 'promising';
}

function makeCriterion(options) {
  return {
    actualValue: null,
    unit: null,
    period: null,
    source: [],
    result: 'unknown',
    missingData: [],
    explanation: '',
    action: '核实并准备相关材料。',
    blocking: true,
    ...options
  };
}

module.exports = {
  aggregateStatus,
  finalizeEvaluation,
  makeCriterion
};
