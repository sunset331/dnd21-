// ═══════════════════════════════════════════════════════════
//  settings.js — Settings panel + persistence
// ═══════════════════════════════════════════════════════════

const Settings = (() => {
  let panelEl = null;
  let currentSettings = {};
  const PANEL_ID = 'settings';

  const DEFAULTS = {
    window:  { alwaysOnTop: true, opacity: 1.0, scale: 1.0, locked: false },
    behavior:{ autoStart: false, idleSpeech: true, soundEnabled: true, nightMute: false },
    display: { showStatus: true, animationsEnabled: true },
  };

  // ─── Init ───
  async function init() {
    panelEl = document.getElementById('settings-menu');
    UIManager.register(PANEL_ID, panelEl, close);
    currentSettings = await load();
    bindControls();
    applyAll();
  }

  // ─── Persistence ───
  async function load() {
    try {
      if (window.electronAPI && window.electronAPI.getSettings) {
        return deepMerge(DEFAULTS, await window.electronAPI.getSettings());
      }
    } catch (e) { /* */ }
    return { ...DEFAULTS };
  }

  async function save() {
    try {
      if (window.electronAPI && window.electronAPI.saveSettings) {
        await window.electronAPI.saveSettings(currentSettings);
      }
    } catch (e) { /* */ }
  }

  // ─── Panel controls ───
  function bindControls() {
    bindCheckbox('set-always-on-top', 'window.alwaysOnTop');
    bindCheckbox('set-locked', 'window.locked');
    bindRange('set-opacity', 'window.opacity');
    bindRange('set-scale', 'window.scale');
    bindCheckbox('set-idle-speech', 'behavior.idleSpeech');
    bindCheckbox('set-sound', 'behavior.soundEnabled');
    bindCheckbox('set-night-mute', 'behavior.nightMute');
    bindCheckbox('set-show-status', 'display.showStatus');
    bindCheckbox('set-animations', 'display.animationsEnabled');

    document.getElementById('settings-close').addEventListener('click', () => UIManager.close(PANEL_ID));
  }

  function open()  { syncUI(); UIManager.open(PANEL_ID); }
  function close() { UIManager.close(PANEL_ID); }
  function toggle(){ UIManager.isOpen(PANEL_ID) ? close() : open(); }

  // ─── Achievement list (called by context menu) ───
  function showAchievements() {
    const defs = Achievements.getDefs();
    const unlocked = Achievements.getUnlocked();
    const html = defs.map(d => {
      const isUnlocked = !!unlocked[d.id];
      const r = { common:'common', uncommon:'uncommon', rare:'rare' }[d.rarity] || 'common';
      return `<div class="ach-item ${isUnlocked?'ach-item--unlocked':'ach-item--locked'}">
        <span class="ach-item-icon">${isUnlocked?d.icon:'🔒'}</span>
        <span class="ach-item-name">${d.name}</span>
        <span class="ach-item-desc">${d.desc}</span>
        <span class="ach-item-rarity ach-rarity-${r}">${r}</span>
      </div>`;
    }).join('');

    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `<div class="settings-section-title">成就 (${Object.keys(unlocked).length}/${defs.length})</div><div class="ach-list">${html}</div>`;

    const closeBtn = document.getElementById('settings-close');
    const old = panelEl.querySelector('.ach-list');
    if (old) old.parentNode.remove();
    closeBtn.parentNode.insertBefore(section, closeBtn);
    open();
  }

  // ─── UI sync ───
  function syncUI() {
    const s = currentSettings;
    const map = {
      'set-always-on-top': s.window.alwaysOnTop, 'set-locked': s.window.locked,
      'set-idle-speech': s.behavior.idleSpeech, 'set-sound': s.behavior.soundEnabled,
      'set-night-mute': s.behavior.nightMute, 'set-show-status': s.display.showStatus,
      'set-animations': s.display.animationsEnabled,
    };
    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el && el.type === 'checkbox') el.checked = val;
    }
    const op = document.getElementById('set-opacity'); if (op) op.value = Math.round(s.window.opacity * 100);
    const sc = document.getElementById('set-scale');  if (sc) sc.value = Math.round(s.window.scale * 100);
  }

  // ─── Helpers ───
  function getNested(obj, path) { return path.split('.').reduce((o,k)=>(o||{})[k], obj); }
  function setNested(obj, path, value) {
    const keys = path.split('.'); const last = keys.pop();
    keys.reduce((o,k) => { if (!o[k]) o[k] = {}; return o[k]; }, obj)[last] = value;
  }

  function bindCheckbox(id, path) {
    const el = document.getElementById(id); if (!el) return;
    el.checked = getNested(currentSettings, path);
    el.addEventListener('change', () => {
      setNested(currentSettings, path, el.checked);
      apply(path, el.checked); save();
    });
  }

  function bindRange(id, path) {
    const el = document.getElementById(id); if (!el) return;
    el.value = Math.round(getNested(currentSettings, path) * 100);
    el.addEventListener('input', () => setNested(currentSettings, path, parseInt(el.value)/100));
    el.addEventListener('change', () => { apply(path, getNested(currentSettings, path)); save(); });
  }

  function apply(path, value) {
    if (!window.electronAPI) return;
    switch (path) {
      case 'window.alwaysOnTop': window.electronAPI.setAlwaysOnTop(value); break;
      case 'window.opacity': window.electronAPI.setOpacity(value); break;
      case 'window.scale': window.electronAPI.setScale(value); break;
      case 'window.locked':
        const h = document.getElementById('drag-handle');
        if (h) { h.style.pointerEvents = value?'none':'auto'; h.style.webkitAppRegion = value?'no-drag':'drag'; }
        break;
      case 'behavior.soundEnabled': Audio.setMuted(!value); break;
      case 'display.showStatus':
        const sb = document.getElementById('status-bar');
        if (sb) sb.style.display = value?'':'none';
        break;
      case 'display.animationsEnabled':
        document.body.style.setProperty('--anim-state', value?'running':'paused');
        break;
    }
  }

  function applyAll() {
    const s = currentSettings;
    if (window.electronAPI) {
      window.electronAPI.setAlwaysOnTop(s.window.alwaysOnTop);
      window.electronAPI.setOpacity(s.window.opacity);
      window.electronAPI.setScale(s.window.scale);
    }
    Audio.setMuted(!s.behavior.soundEnabled);
    apply('window.locked', s.window.locked);
    apply('display.showStatus', s.display.showStatus);
    apply('display.animationsEnabled', s.display.animationsEnabled);
    syncUI();
  }

  function deepMerge(base, override) {
    const result = { ...base };
    for (const key of Object.keys(override || {})) {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key]))
        result[key] = deepMerge(base[key]||{}, override[key]);
      else result[key] = override[key];
    }
    return result;
  }

  function getSettings() { return currentSettings; }

  return { init, open, close, toggle, showAchievements, getSettings };
})();
