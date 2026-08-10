const { createHash } = require('node:crypto');

const DISCLAIMER = '本结果仅供初步判断和准备工作参考，最终结果以相关主管部门政策、申报通知及审核结果为准。';

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function inputHash(input) {
  return `sha256:${createHash('sha256').update(stableSerialize(input)).digest('hex')}`;
}

class ReportGenerator {
  generate({
    reportId,
    assessmentId,
    userId,
    assessmentInput,
    qualificationResults,
    ruleSetVersion,
    generatedAt
  }) {
    if (!Array.isArray(qualificationResults) || qualificationResults.length !== 4) {
      throw new TypeError('Report 必须恰好包含四类资质结果。');
    }
    if (new Set(qualificationResults.map((item) => item.qualificationType)).size !== 4) {
      throw new TypeError('Report 的 qualificationType 必须唯一。');
    }
    if (!generatedAt) {
      throw new TypeError('Report 生成时间必须由调用方显式传入。');
    }

    const qualifications = structuredClone(qualificationResults);
    return {
      id: reportId,
      assessmentId,
      userId,
      enterprise: {
        id: assessmentInput.id,
        name: assessmentInput.name,
        subjectCode: assessmentInput.subjectCode,
        isDemoData: assessmentInput.isDemoData,
        dataLabel: assessmentInput.dataLabel,
        snapshot: structuredClone(assessmentInput)
      },
      status: 'ready',
      reportVersion: '1.0',
      ruleSetVersion,
      inputSnapshotHash: inputHash(assessmentInput),
      qualifications,
      evidence: qualifications.flatMap((item) => item.evidence),
      gaps: qualifications.flatMap((item) => item.gaps),
      actions: qualifications.flatMap((item) => item.actions),
      ruleVersions: qualifications.map((item) => ({
        qualificationType: item.qualificationType,
        applicableRegion: item.applicableRegion,
        ruleVersion: item.ruleVersion
      })),
      disclaimer: DISCLAIMER,
      generatedAt
    };
  }
}

module.exports = { DISCLAIMER, ReportGenerator, inputHash, stableSerialize };
