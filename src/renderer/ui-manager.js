// ═══════════════════════════════════════════════════════════
//  ui-manager.js — Panel control via inline style (bypasses CSS issues)
// ═══════════════════════════════════════════════════════════

const UIManager = (() => {
  let activePanel = null;
  let panels = {};

  function register(id, el, closeFn) {
    panels[id] = { el, closeFn };
    el.style.display = 'none'; // force hidden, bypass CSS
  }

  function open(id) {
    if (!panels[id]) return;
    if (activePanel && activePanel !== id) {
      panels[activePanel].el.style.display = 'none';
    }
    panels[id].el.style.display = '';
    activePanel = id;
  }

  function close(id) {
    if (!panels[id]) return;
    panels[id].el.style.display = 'none';
    if (activePanel === id) activePanel = null;
  }

  function closeAll() {
    if (activePanel) close(activePanel);
  }

  function toggle(id) {
    isOpen(id) ? close(id) : open(id);
  }

  function isOpen(id) {
    return activePanel === id;
  }

  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activePanel) {
        close(activePanel);
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (!activePanel) return;
      const panel = panels[activePanel];
      if (!panel) return;
      if (panel.el.contains(e.target)) return;
      const ctx = document.getElementById('context-menu');
      if (ctx && !ctx.classList.contains('hidden') && ctx.contains(e.target)) return;
      if (e.target.closest && (e.target.closest('.dice-wrapper') || e.target.closest('#action-btn'))) return;
      close(activePanel);
    });
  }

  return { init, register, open, close, closeAll, toggle, isOpen };
})();
