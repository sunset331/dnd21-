// ═══════════════════════════════════════════════════════════
//  adventure-log.js — Full adventure journal panel
// ═══════════════════════════════════════════════════════════

const AdventureLog = (() => {
  let panelEl = null;
  let listEl = null;
  let searchEl = null;
  let entries = [];
  const MAX_ENTRIES = 500;
  const PANEL_ID = 'log';

  // ─── Init ───
  async function init() {
    createPanel();
    UIManager.register(PANEL_ID, panelEl, close);
    await load();
  }

  // ─── Create DOM ───
  function createPanel() {
    panelEl = document.createElement('div');
    panelEl.id = 'log-panel';
    panelEl.className = 'log-panel';
    panelEl.style.display = 'none';
    panelEl.innerHTML = `
      <div class="log-panel-card">
        <div class="log-panel-header">
          <span class="log-panel-title">📜 冒险者日记</span>
          <button class="log-panel-close">&times;</button>
        </div>
        <input type="text" id="log-search" class="log-search" placeholder="搜索冒险记录...">
        <div class="log-panel-list" id="log-panel-list"></div>
        <div class="log-panel-footer">
          <span id="log-count">0 条记录</span>
          <button id="log-clear" class="log-clear-btn">清空日志</button>
        </div>
      </div>
    `;
    document.body.appendChild(panelEl);

    listEl = document.getElementById('log-panel-list');
    searchEl = document.getElementById('log-search');

    panelEl.querySelector('.log-panel-close').addEventListener('click', () => UIManager.close(PANEL_ID));
    document.getElementById('log-clear').addEventListener('click', clear);
    searchEl.addEventListener('input', render);
  }

  // ─── Add entry ───
  function addEntry(eventText, value, tier, outcome, statusIds) {
    entries.unshift({
      time: Date.now(),
      event: eventText,
      value,
      tier,
      outcome,
      statusIds: statusIds || [],
    });
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    save();
    render();
  }

  // ─── Render ───
  function render() {
    if (!listEl) return;
    const query = searchEl ? searchEl.value.toLowerCase() : '';
    let filtered = entries;
    if (query) {
      filtered = entries.filter(e =>
        e.event.toLowerCase().includes(query) ||
        e.outcome.toLowerCase().includes(query) ||
        tierLabel(e.tier).includes(query)
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="log-empty">未找到匹配的冒险记录</div>';
    } else {
      listEl.innerHTML = filtered.map(e => {
        const time = new Date(e.time);
        const ts = `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`;
        const emoji = tierEmoji(e.tier);
        return `<div class="log-entry-item">
          <div class="log-entry-head">
            <span class="log-entry-emoji">${emoji}</span>
            <span class="log-entry-value">${e.value}点</span>
            <span class="log-entry-tier" data-tier="${e.tier}">${tierLabel(e.tier)}</span>
            <span class="log-entry-time">${ts}</span>
          </div>
          <div class="log-entry-event">${esc(e.event)}</div>
          <div class="log-entry-outcome">${esc(e.outcome)}</div>
        </div>`;
      }).join('');
    }
    const countEl = document.getElementById('log-count');
    if (countEl) countEl.textContent = `${entries.length} 条记录`;
  }

  // ─── Open / Close ───
  function open() {
    render();
    UIManager.open(PANEL_ID);
  }
  function close() {
    UIManager.close(PANEL_ID);
  }

  // ─── Clear ───
  function clear() {
    entries = [];
    save();
    render();
  }

  // ─── Persist (atomic merge, no race) ───
  async function save() {
    try {
      if (window.electronAPI && window.electronAPI.mergeSettings) {
        await window.electronAPI.mergeSettings({ logEntries: entries.slice(0, MAX_ENTRIES) });
      }
    } catch (e) { /* silent */ }
  }

  async function load() {
    try {
      if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings();
        if (settings && settings.logEntries) {
          entries = settings.logEntries;
          render();
        }
      }
    } catch (e) { /* use empty */ }
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  return { init, addEntry, open, close };
})();
