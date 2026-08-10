const { DRAFT_TTL_MS } = require('../config/index');

const DRAFT_PREFIX = 'qualification-draft:';
const CURRENT_ENTERPRISE_KEY = 'qualification-current-enterprise';

function storageOrDefault(storage) {
  return storage || wx;
}

function createDraft(enterpriseId, now = Date.now()) {
  return {
    version: 1,
    enterpriseId,
    supplements: { fields: {} },
    updatedAt: now,
    expiresAt: now + DRAFT_TTL_MS
  };
}

function loadDraft(enterpriseId, { storage, now = Date.now() } = {}) {
  const adapter = storageOrDefault(storage);
  const draft = adapter.getStorageSync(`${DRAFT_PREFIX}${enterpriseId}`);
  if (!draft || draft.enterpriseId !== enterpriseId || draft.expiresAt <= now) {
    if (draft) adapter.removeStorageSync(`${DRAFT_PREFIX}${enterpriseId}`);
    return createDraft(enterpriseId, now);
  }
  return draft;
}

function saveDraft(enterpriseId, supplements, { storage, now = Date.now() } = {}) {
  const adapter = storageOrDefault(storage);
  const draft = {
    ...createDraft(enterpriseId, now),
    supplements: supplements && supplements.fields ? supplements : { fields: {} }
  };
  adapter.setStorageSync(`${DRAFT_PREFIX}${enterpriseId}`, draft);
  return draft;
}

function clearDraft(enterpriseId, { storage } = {}) {
  storageOrDefault(storage).removeStorageSync(`${DRAFT_PREFIX}${enterpriseId}`);
}

function setCurrentEnterprise(enterpriseId, { storage } = {}) {
  storageOrDefault(storage).setStorageSync(CURRENT_ENTERPRISE_KEY, enterpriseId);
}

function getCurrentEnterprise({ storage } = {}) {
  return storageOrDefault(storage).getStorageSync(CURRENT_ENTERPRISE_KEY) || null;
}

module.exports = {
  DRAFT_PREFIX,
  clearDraft,
  createDraft,
  getCurrentEnterprise,
  loadDraft,
  saveDraft,
  setCurrentEnterprise
};
