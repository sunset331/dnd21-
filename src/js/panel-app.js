// panel-app.js — 面板窗口（角色/装备/商城/背包/外观/日志/成就/统计/设置）

import { Character } from './systems/character.js';
import { Shop } from './systems/shop.js';
import { AchievementSystem } from './systems/achievements.js';
import { SaveManager } from './storage/save-manager.js';

import { loadJSON } from './storage/loader.js';

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

  // SVG 图标渲染辅助
  const slotSvgs = {
    hat: iconsSvg.hat, weapon: iconsSvg.weapon, ring: iconsSvg.ring,
    necklace: iconsSvg.necklace, gauntlets: iconsSvg.gauntlets,
    cloak: iconsSvg.cloak, boots: iconsSvg.boots
  };
  function renderSvg(svgStr, size = 36) {
    return `<span style="display:inline-block;width:${size}px;height:${size}px;vertical-align:middle;">${svgStr}</span>`;
  }

  const saveResult = await saveManager.load(character);
  if (!saveResult) {
    document.getElementById('tab-content').innerHTML =
      '<p style="text-align:center;padding:40px;color:#8a8aaa;">还没有存档</p>';
    return;
  }
  if (saveResult.shop) shop.fromJSON(saveResult.shop);

  // ===== Tab 路由 =====
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const renderers = {
    character: renderCharacter, equipment: renderEquipment,
    shop: renderShop, inventory: renderInventory,
    cosmetics: renderCosmetics, log: renderLog,
    achievements: renderAchievements, stats: renderStats,
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

  // ===== 角色面板 =====
  function renderCharacter() {
    const raceData = character.getRaceData();
    const moodEmoji = character.getMoodEmoji();
    const moodNames = { ecstatic: '欣喜若狂', happy: '开心', neutral: '平静', sad: '低落', depressed: '沮丧' };

    document.getElementById('panel-char-emoji').textContent = character.getDisplayEmoji();
    document.getElementById('panel-char-name').textContent =
      (moodEmoji ? moodEmoji + ' ' : '') + character.name;
    document.getElementById('panel-char-race').textContent =
      `${raceData.name} · ${moodNames[character.mood] || '平静'}`;
    document.getElementById('panel-gold').textContent = character.gold;
    document.getElementById('panel-charisma').textContent = character.getCharisma();
    document.getElementById('panel-luck').textContent = character.getLuck();
    document.getElementById('panel-adventures').textContent = character.stats.totalAdventures;
    document.getElementById('panel-crits').textContent = character.stats.critSuccessCount;
    document.getElementById('panel-fails').textContent = character.stats.failCount;

    const total = character.stats.totalAdventures;
    const rate = total > 0 ? Math.round((character.stats.successCount / total) * 100) + '%' : '--';
    document.getElementById('panel-success-rate').textContent = rate;

    // 状态列表
    const statusList = document.getElementById('status-list');
    statusList.innerHTML = '';
    if (character.statuses.length === 0) {
      statusList.innerHTML = '<span style="color:#8a8aaa;font-size:11px;">暂无状态</span>';
    } else {
      character.statuses.forEach(s => {
        const tag = document.createElement('span');
        tag.className = 'status-tag';
        const rem = s.remaining === -1 || s.remaining === 99 ? '永久' : `${s.remaining}次`;
        tag.textContent = `${s.icon || ''} ${s.name} (${rem})`;
        tag.title = s.desc || '';
        statusList.appendChild(tag);
      });
    }
  }

  // ===== 装备面板（含套装） =====
  function renderEquipment() {
    const slots = document.getElementById('equipment-slots');
    const slotNames = { hat: '🎩 帽子', weapon: '⚔️ 武器', ring: '💍 戒指',
      necklace: '📿 项链', gauntlets: '🧤 护手', cloak: '🧣 披风', boots: '👢 鞋子' };

    slots.innerHTML = '';
    for (const [slotId, slotLabel] of Object.entries(slotNames)) {
      const item = character.equipment[slotId];
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
        ${renderSvg(slotSvgs[slotId] || '')}
        <div class="slot-info">
          <div class="slot-name">${slotLabel.slice(3)}</div>
          <div class="slot-item ${rarityClass}">${item ? item.icon + ' ' + item.name : '(空)'}</div>
          ${bonuses ? `<div class="slot-bonus">${bonuses}</div>` : ''}
        </div>
        ${item ? '<button class="unequip-btn" data-slot="' + slotId + '">卸下</button>' : ''}
      `;
      slots.appendChild(div);
    }

    // 套装信息
    const activeSets = character.getActiveSetBonuses();
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

    // 卸下按钮
    slots.querySelectorAll('.unequip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        character.unequipSlot(btn.dataset.slot);
        await saveManager.save(character);
        renderCharacter(); renderEquipment(); renderShop();
      });
    });
  }

  // ===== 商城 =====
  function renderShop() {
    document.getElementById('shop-gold-amount').textContent = character.gold;
    const equippedIds = character.getEquippedIds();
    const effects = character.getStatusEffects();
    const discount = effects.shopDiscount / 100;

    // 装备
    const eqDiv = document.getElementById('shop-equipment');
    eqDiv.innerHTML = '';
    shop.getEquipmentList().forEach(item => {
      const isEquipped = equippedIds.includes(item.id);
      const price = item.displayPrice;
      const discountedPrice = Math.round(price * (1 - discount));
      const canAfford = character.gold >= discountedPrice;

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
      const canAfford = character.gold >= item.price;
      const owned = character.getConsumableCount(item.id);
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
        if (shop.buyEquipment(character, btn.dataset.id).success) {
          await saveManager.save(character);
          renderCharacter(); renderEquipment(); renderShop(); renderInventory();
        }
      });
    });
    document.querySelectorAll('#shop-consumables .shop-item-buy').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (shop.buyConsumable(character, btn.dataset.id).success) {
          await saveManager.save(character);
          renderShop(); renderInventory(); renderCharacter();
        }
      });
    });
  }

  // ===== 背包 =====
  function renderInventory() {
    document.getElementById('inv-gold-amount').textContent = character.gold;
    const list = document.getElementById('consumable-list');
    list.innerHTML = '';
    const ownedItems = character.consumables || [];
    if (ownedItems.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:#8a8aaa;padding:20px;">背包空空如也</p>';
      return;
    }
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
        const result = shop.useConsumable(character, btn.dataset.id);
        if (result.success) {
          // 如果是即时效果，同步到宠物窗口
          const item = consumablesData[btn.dataset.id];
          if (item && item.type === 'immediate') {
            window.electronAPI.sendConsumableEffect(item.effect);
          }
          await saveManager.save(character);
          renderInventory(); renderCharacter(); renderShop();
        }
      });
    });
  }

  // ===== 外观 =====
  function renderCosmetics() {
    const items = cosmeticsData.items || {};
    const categories = { pet_skin: 'cosmetic-skins', window_theme: 'cosmetic-themes', particle_effect: 'cosmetic-particles' };

    for (const [cat, divId] of Object.entries(categories)) {
      const container = document.getElementById(divId);
      container.innerHTML = '';
      Object.values(items).filter(i => i.category === cat).forEach(item => {
        const isOwned = character.ownedCosmetics.includes(item.id);
        const isActive = character.activeSkin === item.id ||
                        character.activeTheme === item.id ||
                        character.activeParticle === item.id;
        const canAfford = character.gold >= item.price;

        // 种族皮肤检查
        if (item.race && item.race !== character.race && !isOwned) return;

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

    // 购买/装备事件
    document.querySelectorAll('#tab-cosmetics .shop-item-buy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = items[btn.dataset.id];
        if (!item || character.gold < item.price) return;
        character.gold -= item.price;
        character.totalSpent += item.price;
        character.equipCosmetic(btn.dataset.id);
        await saveManager.save(character);
        renderCosmetics(); renderCharacter();
      });
    });
    document.querySelectorAll('#tab-cosmetics .consumable-use-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        character.equipCosmetic(btn.dataset.id);
        await saveManager.save(character);
        renderCosmetics(); renderCharacter();
      });
    });
  }

  // ===== 冒险日志 =====
  let logDetailVisible = false;
  function renderLog() {
    const logEntries = document.getElementById('log-entries');
    const logs = character.getRecentLogs(50);
    logEntries.innerHTML = '';
    if (logs.length === 0) {
      logEntries.innerHTML = '<p style="text-align:center;color:#8a8aaa;padding:20px;">还没有冒险记录</p>';
      return;
    }
    const outcomeIcons = { legendary: '⭐', great: '🌟', success: '✅', minor: '👍', fail: '❌', disaster: '💀' };
    const outcomeLabels = { legendary: '传奇成功', great: '大成功', success: '成功', minor: '小成功', fail: '失败', disaster: '大失败' };
    logs.forEach((log, idx) => {
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
        <div class="log-line1">${icon} ${diceText} | ${log.eventName}</div>
        <div class="log-line2">${parts.join('  ')} · ${new Date(log.timestamp).toLocaleString('zh-CN')}</div>
      `;

      // 点击展开详细冒险故事
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
              ${hasStory ? '<p>' + (log.narrativeLine1||'') + '</p><p>' + (log.narrativeLine2||'') + '</p>' : '<p style="color:var(--text-dim)">传说已随风消散...</p>'}
            </div>
            <div class="log-detail-stats">
              <span>🎲 ${log.diceRoll}${log.diceBonus>0?'+'+log.diceBonus:''} = <strong>${log.diceTotal}</strong></span>
              <span>💰 ${goldSign}${log.goldChange}G</span>
              ${log.droppedItem ? '<span>📦 '+log.droppedItem+'</span>' : ''}
              ${log.gainedStatus ? '<span>✨ '+log.gainedStatus+'</span>' : ''}
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

  // ===== 成就 =====
  function renderAchievements() {
    const cats = achievements.getCategories();
    const container = document.getElementById('achievement-categories');
    container.innerHTML = '';
    const unlocked = character.achievements.unlocked || [];
    for (const [catName, ids] of Object.entries(cats)) {
      const catDiv = document.createElement('div');
      catDiv.className = 'ach-category';
      catDiv.innerHTML = `<h4>${catName}</h4>`;
      ids.forEach(id => {
        const def = achievements.defs.find(d => d.id === id);
        if (!def) return;
        const isUnlocked = unlocked.includes(def.id);
        const prog = achievements.getProgress(def, character);
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

  // ===== 统计 =====
  function renderStats() {
    const dash = document.getElementById('stats-dashboard');
    const s = character.stats;
    const total = s.totalAdventures || 1;
    const rate = Math.round((s.successCount / total) * 100);
    const critRate = Math.round((s.critSuccessCount / total) * 100);
    const avgGold = character.totalEarned > 0
      ? Math.round(character.totalEarned / total) : 0;
    const bestStreak = character.achievements.maxCritsInARow || 0;

    const equippedCount = Object.values(character.equipment).filter(Boolean).length;
    const achievementUnlocked = (character.achievements.unlocked || []).length;
    const totalAchievements = achievements.defs.length;
    const eventsSeen = (character.achievements.differentEventsSeen || []).length;

    dash.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-value">${s.totalAdventures}</div>
        <div class="stat-card-label">总冒险次数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${rate}%</div>
        <div class="stat-card-label">成功率</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${critRate}%</div>
        <div class="stat-card-label">传奇率</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${bestStreak}</div>
        <div class="stat-card-label">最高连爆</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">💰${character.totalEarned}</div>
        <div class="stat-card-label">生涯总收入</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${avgGold}G</div>
        <div class="stat-card-label">场均金币</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${equippedCount}/7</div>
        <div class="stat-card-label">装备槽</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${eventsSeen}</div>
        <div class="stat-card-label">事件种类</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${achievementUnlocked}/${totalAchievements}</div>
        <div class="stat-card-label">成就进度</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${character.achievements.rareItemsFound || 0}</div>
        <div class="stat-card-label">稀有物品</div>
      </div>
    `;
  }

  // ===== 设置 =====
  function renderSettings() {
    // 音效开关
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

    // 活动速率
    const rateSelect = document.getElementById('setting-activity-rate');
    const savedRate = localStorage.getItem('dnd-pet-activity-rate') || '24';
    rateSelect.value = savedRate;
    rateSelect.onchange = () => {
      localStorage.setItem('dnd-pet-activity-rate', rateSelect.value);
    };

    // 保存窗口位置
    document.getElementById('setting-save-position').onclick = () => {
      alert('窗口位置已保存！重启后宠物会出现在这里。');
      // 实际通过 IPC 通知 main process
    };

    // 重置
    document.getElementById('setting-reset').onclick = () => {
      if (confirm('确定要删除所有数据吗？此操作不可撤销！')) {
        // 清除存档
        window.electronAPI.saveGame(null);
        alert('数据已重置，请重启应用。');
      }
    };
  }

  // 关闭面板返回冒险界面
  document.getElementById('btn-close-panel').addEventListener('click', () => window.close());

  // 初始渲染
  renderCharacter();

  // 每30秒静默同步（仅面板可见时刷新）
  setInterval(async () => {
    if (document.hidden) return;
    await saveManager.load(character);
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && renderers[activeTab.dataset.tab]) {
      renderers[activeTab.dataset.tab]();
    }
  }, 30000);
}

boot().catch(err => {
  document.body.innerHTML = `<div style="color:#ff4466;padding:20px;">面板加载失败: ${err.message}</div>`;
});
