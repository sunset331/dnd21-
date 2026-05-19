// ═══════════════════════════════════════════════════════════
//  context-menu.js — Right-click context menu
// ═══════════════════════════════════════════════════════════

const ContextMenu = (() => {
  let menuEl = null;
  let justOpened = false;

  function init() {
    menuEl = document.createElement('div');
    menuEl.id = 'context-menu';
    menuEl.style.display = 'none';
    menuEl.innerHTML = `
      <div class="ctx-item" data-action="log"><span class="ctx-icon">📜</span>冒险日志</div>
      <div class="ctx-item" data-action="achievements"><span class="ctx-icon">🏆</span>成就系统</div>
      <div class="ctx-item" data-action="settings"><span class="ctx-icon">⚙</span>设置</div>
      <div class="ctx-separator"></div>
      <div class="ctx-item" data-action="toggle-vis"><span class="ctx-icon">👁</span>显示/隐藏</div>
      <div class="ctx-separator"></div>
      <div class="ctx-item" data-action="quit"><span class="ctx-icon">🚪</span>退出</div>
    `;
    document.body.appendChild(menuEl);

    menuEl.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.ctx-item');
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        close();
        handleAction(item.dataset.action);
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (justOpened) return;
      if (menuEl && menuEl.style.display !== 'none' && !menuEl.contains(e.target)) {
        close();
      }
    });

    // Right-click triggers
    const wrapper = document.getElementById('dice-wrapper');
    const dragHandle = document.getElementById('drag-handle');
    [wrapper, dragHandle].forEach(el => {
      if (el) el.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        open(e.clientX, e.clientY);
      });
    });

    document.body.addEventListener('contextmenu', (e) => {
      if (e.target === document.body || e.target.id === 'app' || e.target.id === 'drag-handle') {
        e.preventDefault();
        open(e.clientX, e.clientY);
      }
    });
  }

  function open(x, y) {
    justOpened = true;
    menuEl.style.display = '';
    menuEl.style.left = x + 'px';
    menuEl.style.top = y + 'px';
    const rect = menuEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) menuEl.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menuEl.style.top = (y - rect.height) + 'px';
    setTimeout(() => { justOpened = false; }, 150);
  }

  function close() {
    menuEl.style.display = 'none';
    justOpened = false;
  }

  function handleAction(action) {
    switch (action) {
      case 'log':
        AdventureLog.open();
        break;
      case 'achievements':
        Settings.showAchievements();
        break;
      case 'settings':
        Settings.open();
        break;
      case 'toggle-vis':
        if (window.electronAPI && window.electronAPI.toggleVisibility) {
          window.electronAPI.toggleVisibility();
        }
        break;
      case 'quit':
        if (window.electronAPI && window.electronAPI.quitApp) {
          window.electronAPI.quitApp();
        }
        break;
    }
  }

  return { init };
})();
