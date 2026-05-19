// ═══════════════════════════════════════════════════════════
//  ghost.js — Ghost mode: idle → transparent, mouse near → restore
// ═══════════════════════════════════════════════════════════

const Ghost = (() => {
  let enabled = true;
  let idleTime = 15000;         // ms before ghosting starts
  let minOpacity = 0.25;       // lowest opacity in ghost mode
  let currentOpacity = 1.0;
  let targetOpacity = 1.0;
  let checkTimer = null;
  let lastActivity = Date.now();
  let wasNear = true;

  // ─── Config from settings ───
  function configure(settings) {
    if (settings.ghost) {
      enabled = settings.ghost.enabled !== false;
      idleTime = (settings.ghost.idleTime || 15) * 1000;
      minOpacity = settings.ghost.minOpacity || 0.25;
    }
  }

  // ─── Notify activity ───
  function poke() {
    lastActivity = Date.now();
  }

  // ─── Check loop: runs every 1s ───
  function start() {
    if (checkTimer) return;
    checkTimer = setInterval(tick, 1000);
  }

  function stop() {
    if (checkTimer) { clearInterval(checkTimer); checkTimer = null; }
  }

  async function tick() {
    if (!enabled) {
      targetOpacity = 1.0;
      applyTarget();
      return;
    }

    const idle = Date.now() - lastActivity;
    let near = true;

    // Check cursor proximity via IPC
    try {
      if (window.electronAPI && window.electronAPI.getCursorNear) {
        near = await window.electronAPI.getCursorNear();
      }
    } catch (e) { near = true; }

    if (!near) {
      // Cursor far: ghost based on idle time
      if (idle > idleTime) {
        targetOpacity = minOpacity;
      } else {
        const t = idle / idleTime;
        targetOpacity = 1.0 - t * (1.0 - minOpacity);
      }
    } else {
      targetOpacity = 1.0;
      // If cursor just came back, reset idle
      if (!wasNear) lastActivity = Date.now();
    }
    wasNear = near;
    applyTarget();
  }

  function applyTarget() {
    if (Math.abs(currentOpacity - targetOpacity) < 0.01) return;
    currentOpacity += (targetOpacity - currentOpacity) * 0.3; // smooth lerp
    if (window.electronAPI && window.electronAPI.setOpacity) {
      window.electronAPI.setOpacity(Math.round(currentOpacity * 100) / 100);
    }
  }

  return { configure, poke, start, stop };
})();
