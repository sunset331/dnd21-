// ═══════════════════════════════════════════════════════════
//  achievements.js — Unlockable DND achievements
// ═══════════════════════════════════════════════════════════

const Achievements = (() => {
  // ─── Achievement definitions ───
  const DEFS = [
    { id: 'first_crit_fail',  name: '欢迎来到地牢',   desc: '第一次掷出大失败',         rarity: 'common',   icon: '💀' },
    { id: 'first_crit_success', name: '命运宠儿',      desc: '第一次掷出大成功',         rarity: 'common',   icon: '✨' },
    { id: 'fail_streak_5',    name: '倒霉蛋',          desc: '连续五次判定失败',         rarity: 'uncommon', icon: '🎲' },
    { id: 'crit_streak_3',    name: '天选之人',        desc: '连续三次大成功',           rarity: 'rare',     icon: '👑' },
    { id: 'ten_rolls',        name: '老赌徒',          desc: '累计掷骰10次',             rarity: 'common',   icon: '🎰' },
    { id: 'fifty_rolls',      name: '骰子大师',        desc: '累计掷骰50次',             rarity: 'rare',     icon: '🎯' },
    { id: 'drunk_adventure',  name: '酒后冒险',        desc: '在醉酒状态下完成一次冒险', rarity: 'uncommon', icon: '🍺' },
    { id: 'cursed_adventure', name: '诅咒缠身',        desc: '在被诅咒状态下完成冒险',   rarity: 'uncommon', icon: '😈' },
    { id: 'holy_reroll',      name: '圣光保佑',        desc: '圣光庇护触发了一次重投',   rarity: 'uncommon', icon: '🛡️' },
    { id: 'midnight_roll',    name: '午夜骰客',        desc: '在凌晨0-4点之间掷骰',      rarity: 'uncommon', icon: '🌙' },
    { id: 'chain_trigger',    name: '因果报应',        desc: '触发了一次事件链',         rarity: 'common',   icon: '🔗' },
    { id: 'goblin_smell_roll',name: '哥布林之友',      desc: '带着哥布林气味完成冒险',   rarity: 'uncommon', icon: '👃' },
    { id: 'triple_status',    name: '行走的异常状态',  desc: '同时拥有3个或更多状态',    rarity: 'rare',     icon: '🌀' },
  ];

  let unlocked = {};        // { id: timestamp }
  let totalRolls = 0;
  let toastEl = null;

  // ─── Init ───
  async function init() {
    try {
      if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings();
        if (settings && settings.achievements) {
          unlocked = settings.achievements;
        }
      }
    } catch (e) { /* use empty */ }
    syncRollCount();
    createToast();
  }

  function syncRollCount() {
    const gs = window.__gameState;
    if (gs && gs.eventHistory) {
      totalRolls = gs.eventHistory.length;
    }
  }

  // ─── Check unlocks after each roll ───
  function check(gameState, tier, event, statusIds, rerollUsed, isChain) {
    syncRollCount();
    const now = Date.now();
    const hour = new Date().getHours();

    const checks = {
      first_crit_fail: tier === 'CRIT_FAIL',
      first_crit_success: tier === 'CRIT_SUCCESS',
      fail_streak_5: gameState.consecutiveFails >= 5,
      crit_streak_3: gameState.consecutiveCrits >= 3,
      ten_rolls: totalRolls >= 10,
      fifty_rolls: totalRolls >= 50,
      drunk_adventure: statusIds.includes('drunk'),
      cursed_adventure: statusIds.includes('cursed'),
      holy_reroll: rerollUsed,
      midnight_roll: hour >= 0 && hour < 4,
      chain_trigger: isChain,
      goblin_smell_roll: statusIds.includes('goblin_smell'),
      triple_status: statusIds.length >= 3,
    };

    for (const def of DEFS) {
      if (!unlocked[def.id] && checks[def.id]) {
        unlocked[def.id] = now;
        showToast(def);
        save();
      }
    }
  }

  // ─── Toast notification ───
  function createToast() {
    toastEl = document.createElement('div');
    toastEl.id = 'achievement-toast';
    toastEl.className = 'ach-toast hidden';
    document.body.appendChild(toastEl);
  }

  function showToast(def) {
    if (!toastEl) createToast();
    const rarityLabel = { common: '普通', uncommon: '稀有', rare: '传说' }[def.rarity] || '';
    toastEl.innerHTML = `
      <div class="ach-toast-card ach-rarity--${def.rarity}">
        <span class="ach-toast-icon">${def.icon}</span>
        <div>
          <div class="ach-toast-title">成就解锁：${def.name}</div>
          <div class="ach-toast-desc">${def.desc}</div>
          <div class="ach-toast-rarity">${rarityLabel}</div>
        </div>
      </div>
    `;
    toastEl.classList.remove('hidden');
    toastEl.classList.add('ach-toast--show');
    setTimeout(() => {
      toastEl.classList.remove('ach-toast--show');
      setTimeout(() => toastEl.classList.add('hidden'), 400);
    }, 4000);
  }

  // ─── Persist (atomic merge — no race with other savers) ───
  async function save() {
    try {
      if (window.electronAPI && window.electronAPI.mergeSettings) {
        await window.electronAPI.mergeSettings({ achievements: unlocked });
      }
    } catch (e) { /* silent */ }
  }

  function getUnlocked() { return unlocked; }
  function getDefs() { return DEFS; }

  return { init, check, getUnlocked, getDefs };
})();
