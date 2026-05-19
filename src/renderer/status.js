// ═══════════════════════════════════════════════════════════
//  status.js — Character status effects: add, tick, render
// ═══════════════════════════════════════════════════════════

const Status = (() => {
  let statusBarEl = null;
  let statusListEl = null;
  let gameState = null;

  function init(bar, list, gs) {
    statusBarEl = bar;
    statusListEl = list;
    gameState = gs;
  }

  function tick() {
    gameState.statusEffects = gameState.statusEffects.filter(s => {
      s.duration--;
      return s.duration > 0;
    });
    render();
  }

  function add(statusDef) {
    const existing = gameState.statusEffects.find(s => s.id === statusDef.id);
    if (existing) {
      existing.duration = Math.max(existing.duration, statusDef.duration);
    } else {
      gameState.statusEffects.push({ ...statusDef });
    }
    render();
  }

  function remove(id) {
    gameState.statusEffects = gameState.statusEffects.filter(s => s.id !== id);
    render();
  }

  function has(id) {
    return gameState.statusEffects.some(s => s.id === id);
  }

  function render() {
    if (gameState.statusEffects.length === 0) {
      statusBarEl.classList.add('hidden');
      return;
    }
    statusBarEl.classList.remove('hidden');
    statusListEl.innerHTML = gameState.statusEffects.map(s =>
      `<span class="status-chip" title="${s.desc}（剩余${s.duration}次）">
        <span class="status-icon">${s.icon}</span>${s.name}
        <span class="status-dur">${s.duration}</span>
      </span>`
    ).join('');
  }

  // Apply a new random status after result (30-50% chance)
  function maybeApply(tier) {
    let chance = 0.30;
    if (tier === 'CRIT_FAIL') chance = 0.50;
    if (tier === 'CRIT_SUCCESS') chance = 0.15;

    if (Math.random() < chance) {
      if (tier === 'CRIT_FAIL' && Math.random() < 0.6) {
        add({ ...STATUS_POOL.cursed });
      } else if (tier === 'CRIT_SUCCESS' && Math.random() < 0.6) {
        add({ ...STATUS_POOL.lucky });
      } else {
        add(pickRandomStatus());
      }
    }
  }

  function getIds() {
    return gameState.statusEffects.map(s => s.id);
  }

  function getAll() {
    return gameState.statusEffects;
  }

  return { init, tick, add, remove, has, render, maybeApply, getIds, getAll };
})();
