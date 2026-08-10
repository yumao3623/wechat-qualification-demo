(function initAdminPage() {
  const STATUS_LABELS = {
    pending: '待处理',
    processing: '诊断中',
    ready: '已完成',
    failed: '失败',
    not_generated: '未生成'
  };
  const DIRECTION_LABELS = {
    high_tech_enterprise: '高新技术企业',
    tech_sme: '科技型中小企业',
    specialized_innovative: '专精特新',
    eagle_enterprise: '雏鹰企业',
    comprehensive: '综合咨询'
  };

  function textCell(value, className = '') {
    const cell = document.createElement('td');
    cell.textContent = value ?? '—';
    if (className) cell.className = className;
    return cell;
  }

  function badgeCell(status) {
    const cell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge${status === 'failed' || status === 'not_generated' ? ' is-danger' : ''}`;
    badge.textContent = STATUS_LABELS[status] || status || '—';
    cell.appendChild(badge);
    return cell;
  }

  function formatTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false });
  }

  function enterpriseCell(enterprise, showDemoLabel) {
    const cell = textCell(enterprise?.name, 'primary-cell');
    const secondary = document.createElement('span');
    secondary.className = 'secondary';
    secondary.textContent = showDemoLabel && enterprise?.isDemoData
      ? `${enterprise.dataLabel || '虚构 Demo 数据'} · ${enterprise.enterpriseId}`
      : enterprise?.enterpriseId || '未关联企业 ID';
    cell.appendChild(secondary);
    return cell;
  }

  function renderAssessments(items) {
    const body = document.getElementById('assessmentRows');
    body.replaceChildren();
    items.forEach((item) => {
      const row = document.createElement('tr');
      row.append(
        enterpriseCell(item.enterprise, true),
        textCell(item.assessmentId, 'mono'),
        badgeCell(item.status),
        badgeCell(item.reportStatus),
        textCell(formatTime(item.createdAt))
      );
      body.appendChild(row);
    });
  }

  function renderLeads(items) {
    const body = document.getElementById('leadRows');
    body.replaceChildren();
    items.forEach((item) => {
      const row = document.createElement('tr');
      const directions = document.createElement('td');
      const tags = document.createElement('div');
      tags.className = 'tag-list';
      item.directions.forEach((direction) => {
        const tag = document.createElement('span');
        tag.className = 'badge is-muted';
        tag.textContent = DIRECTION_LABELS[direction] || direction;
        tags.appendChild(tag);
      });
      directions.appendChild(tags);
      row.append(
        enterpriseCell(item.enterprise, false),
        textCell(item.contactName),
        textCell(item.maskedMobile, 'mono'),
        directions,
        textCell(formatTime(item.submittedAt))
      );
      body.appendChild(row);
    });
  }

  function setSectionState(sectionId, state, message) {
    const section = document.getElementById(sectionId);
    const stateBox = section.querySelector('[data-role="state"]');
    const content = section.querySelector('[data-role="content"]');
    section.dataset.state = state;
    stateBox.textContent = message;
    stateBox.hidden = state === 'success';
    content.hidden = state !== 'success';
  }

  async function fetchItems(path) {
    let response;
    try {
      response = await fetch(path, { headers: { accept: 'application/json' } });
    } catch {
      throw new Error('加载失败，请确认 Backend 正常后重试。');
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const requestId = body?.error?.requestId;
      throw new Error(requestId ? `加载失败，请重试（请求 ID：${requestId}）` : '加载失败，请确认 Backend 正常后重试。');
    }
    return body?.data?.items || [];
  }

  async function loadSection({ sectionId, path, countId, emptyMessage, render }) {
    setSectionState(sectionId, 'loading', '正在加载数据…');
    document.getElementById(countId).textContent = '—';
    try {
      const items = await fetchItems(path);
      document.getElementById(countId).textContent = String(items.length);
      if (items.length === 0) {
        setSectionState(sectionId, 'empty', emptyMessage);
        return;
      }
      render(items);
      setSectionState(sectionId, 'success', '加载完成');
    } catch (error) {
      setSectionState(sectionId, 'error', error.message || '加载失败，请重试。');
    }
  }

  async function loadAll() {
    const refreshButton = document.getElementById('refreshButton');
    refreshButton.disabled = true;
    await Promise.all([
      loadSection({
        sectionId: 'assessmentSection',
        path: '/api/admin/assessments',
        countId: 'assessmentCount',
        emptyMessage: '当前还没有诊断记录。请先在小程序完成一次诊断。',
        render: renderAssessments
      }),
      loadSection({
        sectionId: 'leadSection',
        path: '/api/admin/leads',
        countId: 'leadCount',
        emptyMessage: '当前还没有顾问线索。请先在小程序提交一次咨询。',
        render: renderLeads
      })
    ]);
    refreshButton.disabled = false;
  }

  document.getElementById('refreshButton').addEventListener('click', loadAll);
  loadAll();
}());
