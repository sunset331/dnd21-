// panel-app.js — 面板窗口
import { Character } from './systems/character.js';
import { Shop } from './systems/shop.js';
import { AchievementSystem } from './systems/achievements.js';
import { SaveManager } from './storage/save-manager.js';
import { loadJSON } from './storage/loader.js';
import { esc } from './utils/escape-html.js';
import { PANEL_SYNC_INTERVAL_MS } from './config.js';

// ─── SVG helper ───
function renderSvg(svgStr, size = 36) {
  return `<span style="display:inline-block;width:${size}px;height:${size}px;vertical-align:middle;">${svgStr}</span>`;
}

// ═══════════════════════════════════════════════════
//  Tab 渲染函数（ctx 包含 character/shop/achievements/saveManager + data）
// ═══════════════════════════════════════════════════

function renderCharacter(ctx) {
  const c = ctx.character;
  const raceData = c.getRaceData();
  const moodEmoji = c.getMoodEmoji();
  const moodNames = { ecstatic: '欣喜若狂', happy: '开心', neutral: '平静', sad: '低落', depressed: '沮丧' };

  document.getElementById('panel-char-emoji').textContent = c.getDisplayEmoji();
  document.getElementById('panel-char-name').textContent = (moodEmoji ? moodEmoji + ' ' : '') + c.name;
  document.getElementById('panel-char-race').textContent = `${raceData.name} · ${moodNames[c.mood] || '平静'}`;
  document.getElementById('panel-gold').textContent = c.gold;
  document.getElementById('panel-charisma').textContent = c.getCharisma();
  document.getElementById('panel-luck').textContent = c.getLuck();
  document.getElementById('panel-adventures').textContent = c.stats.totalAdventures;
  document.getElementById('panel-crits').textContent = c.stats.critSuccessCount;
  document.getElementById('panel-fails').textContent = c.stats.failCount;

  const total = c.stats.totalAdventures;
  const rate = total > 0 ? Math.round((c.stats.successCount / total) * 100) + '%' : '--';
  document.getElementById('panel-success-rate').textContent = rate;

  const statusList = document.getElementById('status-list');
  statusList.innerHTML = '';
  if (c.statuses.length === 0) {
    statusList.innerHTML = '<span style="color:#8a8aaa;font-size:11px;">暂无状态</span>';
  } else {
    c.statuses.forEach(s => {
      const tag = document.createElement('span');
      tag.className = 'status-tag';
      const rem = s.remaining === -1 || s.remaining === 99 ? '永久' : `${s.remaining}次`;
      tag.textContent = `${s.icon || ''} ${s.name} (${rem})`;
      tag.title = s.desc || '';
      statusList.appendChild(tag);
    });
  }
}

function renderEquipment(ctx) {
  const c = ctx.character;
  const slots = document.getElementById('equipment-slots');
  const slotNames = { hat: '🎩 帽子', weapon: '⚔️ 武器', ring: '💍 戒指',
    necklace: '📿 项链', gauntlets: '🧤 护手', cloak: '🧣 披风', boots: '👢 鞋子' };

  slots.innerHTML = '';
  for (const [slotId, slotLabel] of Object.entries(slotNames)) {
    const item = c.equipment[slotId];
    const div = document.createElement('div');
    div.className = 'equipment-slot';
    const rarityClass = item ? 'rarity-' + item.rarity : '';
    let bonuses = '';
    if (item) {
      const parts = [];
      if (item.bonuses.charisma) parts.push(`✨+${item.bonuses.charisma}`);
      if (item.bonuses.luck) parts.push(`🍀+${item.bonuses.luck}`);
      if (item.bonuses.goldFind) parts.push(`💰+${item.bonuses.goldFind}%`);
      if (item.specialEffect) parts.push(`⚡${item.specialEffect.desc}`);
      bonuses = parts.join(' ');
    }
    div.innerHTML = `
      ${renderSvg(ctx.slotSvgs[slotId] || '')}
      <div class="slot-info">
        <div class="slot-name">${slotLabel.slice(3)}</div>
        <div class="slot-item ${rarityClass}">${item ? item.icon + ' ' + item.name : '(空)'}</div>
        ${bonuses ? `<div class="slot-bonus">${bonuses}</div>` : ''}
      </div>
      ${item ? '<button class="unequip-btn" data-slot="' + slotId + '">卸下</button>' : ''}
    `;
    slots.appendChild(div);
  }

  const activeSets = c.getActiveSetBonuses();
  if (activeSets.length > 0) {
    const setDiv = document.createElement('div');
    setDiv.className = 'set-bonus-section';
    setDiv.innerHTML = '<div class="shop-section-label">🔗 套装加成</div>';
    activeSets.forEach(set => {
      const setRow = document.createElement('div');
      setRow.className = 'set-bonus-row';
      const bonusParts = [];
      if (set.bonus.charisma) bonusParts.push(`✨+${set.bonus.charisma}`);
      if (set.bonus.luck) bonusParts.push(`🍀+${set.bonus.luck}`);
      if (set.bonus.goldFind) bonusParts.push(`💰+${set.bonus.goldFind}%`);
      if (set.specialEffect) bonusParts.push(`⚡${set.specialEffect.desc}`);
      setRow.innerHTML = `
        <span>${set.icon}</span>
        <span style="flex:1;font-size:12px;font-weight:600;">${set.name}</span>
        <span style="font-size:10px;color:var(--text-dim);">${set.matched}/${set.total}</span>
        <span style="font-size:10px;color:var(--gold);">${bonusParts.join(' ')}</span>
      `;
      setDiv.appendChild(setRow);
    });
    slots.appendChild(setDiv);
  }

  slots.querySelectorAll('.unequip-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      c.unequipSlot(btn.dataset.slot);
      await ctx.saveManager.save(c);
      renderCharacter(ctx); renderEquipment(ctx); renderShop(ctx);
    });
  });
}

function renderShop(ctx) {
  const c = ctx.character;
  const shop = ctx.shop;
  document.getElementById('shop-gold-amount').textContent = c.gold;
  const equippedIds = c.getEquippedIds();
  const effects = c.getStatusEffects();
  const discount = effects.shopDiscount / 100;

  // 装备
  const eqDiv = document.getElementById('shop-equipment');
  eqDiv.innerHTML = '';
  shop.getEquipmentList().forEach(item => {
    const isEquipped = equippedIds.includes(item.id);
    const price = item.displayPrice;
    const discountedPrice = Math.round(price * (1 - discount));
    const canAfford = c.gold >= discountedPrice;

    const div = document.createElement('div');
    div.className = `shop-item ${isEquipped ? 'equipped' : ''} ${item.isDaily ? 'daily-special' : ''}`;
    div.innerHTML = `
      <span class="shop-item-icon">${item.icon}</span>
      <div class="shop-item-info">
        <div class="shop-item-name ${'rarity-' + item.rarity}">${item.name}</div>
        <div class="shop-item-flavor">${item.flavor}</div>
        <div class="shop-item-stats">
          ${item.bonuses.charisma ? '✨+' + item.bonuses.charisma : ''}
          ${item.bonuses.luck ? ' 🍀+' + item.bonuses.luck : ''}
          ${item.bonuses.goldFind ? ' 💰寻宝+' + item.bonuses.goldFind + '%' : ''}
          ${item.specialEffect ? ' ⚡' + item.specialEffect.desc : ''}
        </div>
      </div>
      <div class="shop-item-price">
        ${item.isDaily ? '<span class="original-price">' + item.price + '</span> ' : ''}
        ${discount > 0 ? '<span class="original-price">' + price + '</span> ' : ''}
        ${discountedPrice}G
      </div>
      <button class="shop-item-buy" data-id="${item.id}" ${!canAfford || isEquipped ? 'disabled' : ''}>
        ${isEquipped ? '已装备' : '购买'}
      </button>
    `;
    eqDiv.appendChild(div);
  });

  // 消耗品
  const conDiv = document.getElementById('shop-consumables');
  conDiv.innerHTML = '';
  shop.getConsumableList().forEach(item => {
    const canAfford = c.gold >= item.price;
    const owned = c.getConsumableCount(item.id);
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <span class="shop-item-icon">${item.icon}</span>
      <div class="shop-item-info">
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-flavor">${item.desc}</div>
        ${owned > 0 ? `<div class="shop-item-stats">已持有: ${owned}</div>` : ''}
      </div>
      <span class="shop-item-price">${item.price}G</span>
      <button class="shop-item-buy" data-id="${item.id}" ${!canAfford ? 'disabled' : ''}>购买</button>
    `;
    conDiv.appendChild(div);
  });

  document.querySelectorAll('#shop-equipment .shop-item-buy').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (shop.buyEquipment(c, btn.dataset.id).success) {
        await ctx.saveManager.save(c);
        renderCharacter(ctx); renderEquipment(ctx); renderShop(ctx); renderInventory(ctx);
      }
    });
  });
  document.querySelectorAll('#shop-consumables .shop-item-buy').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (shop.buyConsumable(c, btn.dataset.id).success) {
        await ctx.saveManager.save(c);
        renderShop(ctx); renderInventory(ctx); renderCharacter(ctx);
      }
    });
  });
}

function renderInventory(ctx) {
  const c = ctx.character;
  document.getElementById('inv-gold-amount').textContent = c.gold;
  const list = document.getElementById('consumable-list');
  list.innerHTML = '';
  const ownedItems = c.consumables || [];
  if (ownedItems.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#8a8aaa;padding:20px;">背包空空如也</p>';
    return;
  }
  const consumablesData = ctx.consumablesData;
  ownedItems.forEach(entry => {
    const item = consumablesData[entry.id];
    if (!item) return;
    const div = document.createElement('div');
    div.className = 'consumable-card';
    div.innerHTML = `
      <span class="consumable-card-icon">${item.icon}</span>
      <div class="consumable-card-info">
        <div class="consumable-card-name">${item.name}</div>
        <div class="consumable-card-desc">${item.desc}</div>
      </div>
      <span class="consumable-card-qty">x${entry.qty}</span>
      <button class="consumable-use-btn" data-id="${entry.id}" ${entry.qty <= 0 ? 'disabled' : ''}>使用</button>
    `;
    list.appendChild(div);
  });
  list.querySelectorAll('.consumable-use-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const result = ctx.shop.useConsumable(c, btn.dataset.id);
      if (result.success) {
        const item = consumablesData[btn.dataset.id];
        if (item && item.type === 'immediate') {
          window.electronAPI.sendConsumableEffect(item.effect);
        }
        await ctx.saveManager.save(c);
        renderInventory(ctx); renderCharacter(ctx); renderShop(ctx);
      }
    });
  });
}

function renderCosmetics(ctx) {
  const c = ctx.character;
  const items = ctx.cosmeticsData.items || {};
  const categories = { pet_skin: 'cosmetic-skins', window_theme: 'cosmetic-themes', particle_effect: 'cosmetic-particles' };

  for (const [cat, divId] of Object.entries(categories)) {
    const container = document.getElementById(divId);
    container.innerHTML = '';
    Object.values(items).filter(i => i.category === cat).forEach(item => {
      const isOwned = c.ownedCosmetics.includes(item.id);
      const isActive = c.activeSkin === item.id || c.activeTheme === item.id || c.activeParticle === item.id;
      const canAfford = c.gold >= item.price;
      if (item.race && item.race !== c.race && !isOwned) return;

      const div = document.createElement('div');
      div.className = `shop-item ${isActive ? 'daily-special' : ''}`;
      div.innerHTML = `
        <span class="shop-item-icon">${item.icon}</span>
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-flavor">${item.desc}</div>
        </div>
        ${isOwned
          ? `<button class="consumable-use-btn" data-id="${item.id}">${isActive ? '使用中' : '装备'}</button>`
          : `<span class="shop-item-price">${item.price}G</span>
             <button class="shop-item-buy" data-id="${item.id}" ${!canAfford ? 'disabled' : ''}>购买</button>`
        }
      `;
      container.appendChild(div);
    });
  }

  document.querySelectorAll('#tab-cosmetics .shop-item-buy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const item = items[btn.dataset.id];
      if (!item || c.gold < item.price) return;
      c.gold -= item.price;
      c.totalSpent += item.price;
      c.equipCosmetic(btn.dataset.id);
      await ctx.saveManager.save(c);
      renderCosmetics(ctx); renderCharacter(ctx);
    });
  });
  document.querySelectorAll('#tab-cosmetics .consumable-use-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      c.equipCosmetic(btn.dataset.id);
      await ctx.saveManager.save(c);
      renderCosmetics(ctx); renderCharacter(ctx);
    });
  });
}

let logDetailVisible = false;

function renderLog(ctx) {
  const c = ctx.character;
  const logEntries = document.getElementById('log-entries');
  const logs = c.getRecentLogs(50);
  logEntries.innerHTML = '';
  if (logs.length === 0) {
    logEntries.innerHTML = '<p style="text-align:center;color:#8a8aaa;padding:20px;">还没有冒险记录</p>';
    return;
  }
  const outcomeIcons = { legendary: '⭐', great: '🌟', success: '✅', minor: '👍', fail: '❌', disaster: '💀' };
  const outcomeLabels = { legendary: '传奇成功', great: '大成功', success: '成功', minor: '小成功', fail: '失败', disaster: '大失败' };
  logs.forEach((log) => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    const icon = outcomeIcons[log.outcome] || '❓';
    const diceText = log.diceBonus > 0
      ? `🎲${log.diceRoll}+${log.diceBonus}=${log.diceTotal}` : `🎲${log.diceRoll}`;
    const goldSign = log.goldChange >= 0 ? '+' : '';
    const parts = [`💰${goldSign}${log.goldChange}金币`];
    if (log.droppedItem) parts.push(`📦${log.droppedItem}`);
    if (log.gainedStatus) parts.push(`「${log.gainedStatus}」`);

    div.innerHTML = `
      <div class="log-line1">${icon} ${diceText} | ${esc(log.eventName)}</div>
      <div class="log-line2">${parts.map(esc).join('  ')} · ${new Date(log.timestamp).toLocaleString('zh-CN')}</div>
    `;

    div.addEventListener('click', () => {
      const old = document.querySelector('.log-detail-overlay');
      if (old) { old.remove(); logDetailVisible = false; return; }

      const detail = document.createElement('div');
      detail.className = 'log-detail-overlay';
      const hasStory = log.narrativeLine1 && log.narrativeLine1.length > 20;
      detail.innerHTML = `
        <div class="log-detail-card">
          <h4>${icon} ${outcomeLabels[log.outcome] || log.outcome}</h4>
          <div class="log-detail-story">
            ${hasStory ? '<p>' + esc(log.narrativeLine1||'') + '</p><p>' + esc(log.narrativeLine2||'') + '</p>'
              : '<p style="color:var(--text-dim)">传说已随风消散...</p>'}
          </div>
          <div class="log-detail-stats">
            <span>🎲 ${log.diceRoll}${log.diceBonus>0?'+'+log.diceBonus:''} = <strong>${log.diceTotal}</strong></span>
            <span>💰 ${goldSign}${log.goldChange}G</span>
            ${log.droppedItem ? '<span>📦 '+esc(log.droppedItem)+'</span>' : ''}
            ${log.gainedStatus ? '<span>✨ '+esc(log.gainedStatus)+'</span>' : ''}
          </div>
          <div class="log-detail-time">🕐 ${new Date(log.timestamp).toLocaleString('zh-CN')}</div>
          <button class="log-detail-close">收起</button>
        </div>
      `;
      detail.addEventListener('click', (e) => {
        if (e.target === detail || e.target.classList.contains('log-detail-close')) {
          detail.remove(); logDetailVisible = false;
        }
      });
      logEntries.appendChild(detail);
      logDetailVisible = true;
    });

    logEntries.appendChild(div);
  });
}

function renderAchievements(ctx) {
  const c = ctx.character;
  const ach = ctx.achievements;
  const cats = ach.getCategories();
  const container = document.getElementById('achievement-categories');
  container.innerHTML = '';
  const unlocked = c.achievements.unlocked || [];
  for (const [catName, ids] of Object.entries(cats)) {
    const catDiv = document.createElement('div');
    catDiv.className = 'ach-category';
    catDiv.innerHTML = `<h4>${catName}</h4>`;
    ids.forEach(id => {
      const def = ach.defs.find(d => d.id === id);
      if (!def) return;
      const isUnlocked = unlocked.includes(def.id);
      const prog = ach.getProgress(def, c);
      const done = prog.current >= prog.max;
      const card = document.createElement('div');
      card.className = `ach-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <span class="ach-icon">${isUnlocked ? def.icon : '🔒'}</span>
        <div class="ach-info">
          <div class="ach-name">${def.name}</div>
          <div class="ach-desc">${def.desc}</div>
          <div class="ach-progress">${done ? '<span class="done">已完成 ✓</span>' : `${prog.current}/${prog.max}`}</div>
        </div>
      `;
      catDiv.appendChild(card);
    });
    container.appendChild(catDiv);
  }
}

function renderStats(ctx) {
  const c = ctx.character;
  const ach = ctx.achievements;
  const dash = document.getElementById('stats-dashboard');
  const s = c.stats;
  const total = s.totalAdventures || 1;
  const rate = Math.round((s.successCount / total) * 100);
  const critRate = Math.round((s.critSuccessCount / total) * 100);
  const avgGold = c.totalEarned > 0 ? Math.round(c.totalEarned / total) : 0;
  const bestStreak = c.achievements.maxCritsInARow || 0;
  const equippedCount = Object.values(c.equipment).filter(Boolean).length;
  const achievementUnlocked = (c.achievements.unlocked || []).length;
  const totalAchievements = ach.defs.length;
  const eventsSeen = (c.achievements.differentEventsSeen || []).length;

  dash.innerHTML = `
    <div class="stat-card"><div class="stat-card-value">${s.totalAdventures}</div><div class="stat-card-label">总冒险次数</div></div>
    <div class="stat-card"><div class="stat-card-value">${rate}%</div><div class="stat-card-label">成功率</div></div>
    <div class="stat-card"><div class="stat-card-value">${critRate}%</div><div class="stat-card-label">传奇率</div></div>
    <div class="stat-card"><div class="stat-card-value">${bestStreak}</div><div class="stat-card-label">最高连爆</div></div>
    <div class="stat-card"><div class="stat-card-value">💰${c.totalEarned}</div><div class="stat-card-label">生涯总收入</div></div>
    <div class="stat-card"><div class="stat-card-value">${avgGold}G</div><div class="stat-card-label">场均金币</div></div>
    <div class="stat-card"><div class="stat-card-value">${equippedCount}/7</div><div class="stat-card-label">装备槽</div></div>
    <div class="stat-card"><div class="stat-card-value">${eventsSeen}</div><div class="stat-card-label">事件种类</div></div>
    <div class="stat-card"><div class="stat-card-value">${achievementUnlocked}/${totalAchievements}</div><div class="stat-card-label">成就进度</div></div>
    <div class="stat-card"><div class="stat-card-value">${c.achievements.rareItemsFound || 0}</div><div class="stat-card-label">稀有物品</div></div>
  `;
}

function renderSettings() {
  const soundBtn = document.getElementById('setting-sound-toggle');
  const soundEnabled = localStorage.getItem('dnd-pet-sound') !== 'off';
  soundBtn.textContent = soundEnabled ? '开启' : '关闭';
  soundBtn.className = 'setting-toggle ' + (soundEnabled ? 'on' : 'off');
  soundBtn.onclick = () => {
    const newState = localStorage.getItem('dnd-pet-sound') !== 'off' ? 'off' : 'on';
    localStorage.setItem('dnd-pet-sound', newState);
    soundBtn.textContent = newState === 'off' ? '关闭' : '开启';
    soundBtn.className = 'setting-toggle ' + (newState === 'off' ? 'off' : 'on');
  };

  const rateSelect = document.getElementById('setting-activity-rate');
  const savedRate = localStorage.getItem('dnd-pet-activity-rate') || '24';
  rateSelect.value = savedRate;
  rateSelect.onchange = () => localStorage.setItem('dnd-pet-activity-rate', rateSelect.value);

  document.getElementById('setting-save-position').onclick = () => {
    alert('窗口位置已保存！重启后宠物会出现在这里。');
  };

  document.getElementById('setting-reset').onclick = () => {
    if (confirm('确定要删除所有数据吗？此操作不可撤销！')) {
      window.electronAPI.saveGame(null);
      alert('数据已重置，请重启应用。');
    }
  };
}

// ═══════════════════════════════════════════════════
//  Boot
// ═══════════════════════════════════════════════════

async function boot() {
  const [racesData, equipmentData, statusesData, consumablesData,
         achievementsData, setsData, cosmeticsData, iconsSvg] = await Promise.all([
    loadJSON('data/races.json'), loadJSON('data/equipment.json'),
    loadJSON('data/statuses.json'), loadJSON('data/consumables.json'),
    loadJSON('data/achievements.json'), loadJSON('data/sets.json'),
    loadJSON('data/cosmetics.json'), loadJSON('data/icons-svg.json')
  ]);

  const character = new Character(racesData, equipmentData, statusesData, setsData, cosmeticsData);
  const shop = new Shop(equipmentData, consumablesData);
  const achievements = new AchievementSystem(achievementsData);
  const saveManager = new SaveManager();

  const slotSvgs = {
    hat: iconsSvg.hat, weapon: iconsSvg.weapon, ring: iconsSvg.ring,
    necklace: iconsSvg.necklace, gauntlets: iconsSvg.gauntlets,
    cloak: iconsSvg.cloak, boots: iconsSvg.boots
  };

  const ctx = { character, shop, achievements, saveManager, consumablesData, cosmeticsData, slotSvgs };

  const saveResult = await saveManager.load(character);
  if (!saveResult) {
    document.getElementById('tab-content').innerHTML =
      '<p style="text-align:center;padding:40px;color:#8a8aaa;">还没有存档</p>';
    return;
  }
  if (saveResult.shop) shop.fromJSON(saveResult.shop);

  // Tab 路由
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const renderers = {
    character: () => renderCharacter(ctx), equipment: () => renderEquipment(ctx),
    shop: () => renderShop(ctx), inventory: () => renderInventory(ctx),
    cosmetics: () => renderCosmetics(ctx), log: () => renderLog(ctx),
    achievements: () => renderAchievements(ctx), stats: () => renderStats(ctx),
    settings: renderSettings
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (renderers[btn.dataset.tab]) renderers[btn.dataset.tab]();
    });
  });

  document.getElementById('btn-close-panel').addEventListener('click', () => window.close());

  renderCharacter(ctx);

  setInterval(async () => {
    if (document.hidden) return;
    await saveManager.load(character);
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && renderers[activeTab.dataset.tab]) {
      renderers[activeTab.dataset.tab]();
    }
  }, PANEL_SYNC_INTERVAL_MS);
}

boot().catch(err => {
  console.error('[DND-PANEL] Boot failed:', err);
  document.body.innerHTML = '<div style="color:#ff4466;padding:20px;">面板加载失败，请重启应用。</div>';
});
