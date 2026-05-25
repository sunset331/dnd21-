// character.js — 角色系统：属性、装备、状态

export class Character {
  constructor(racesData, equipmentData, statusesData, setsData = {}, cosmeticsData = {}) {
    this.racesData = racesData;
    this.equipmentData = equipmentData;
    this.statusesData = statusesData;
    this.setsData = setsData;
    this.cosmeticsData = cosmeticsData;

    // 默认角色
    this.name = '无名冒险者';
    this.gender = 'male';
    this.race = 'human';
    this.gold = 100;
    this.totalEarned = 0;
    this.totalSpent = 0;

    this.equipment = {
      hat: null, weapon: null, ring: null, necklace: null,
      gauntlets: null, cloak: null, boots: null
    };

    // 外观
    this.activeSkin = null;       // cosmetic ID
    this.activeTheme = null;      // theme ID
    this.activeParticle = null;   // particle ID

    this.statuses = [];
    this.stats = {
      totalAdventures: 0, successCount: 0, failCount: 0,
      critSuccessCount: 0, critFailCount: 0, consecutiveFails: 0
    };

    // 情绪追踪
    this.mood = 'neutral';
    this.recentOutcomes = [];  // 最近10次结果 ['legendary','fail',...]

    this.adventureLog = [];
    this.ownedCosmetics = [];
    this.consumables = [];
    this.lastAdventureAt = null;

    this.achievements = {
      unlocked: [],
      firstAdventure: false,
      totalGoldEarnedLifetime: 0,
      critsInARow: 0, maxCritsInARow: 0,
      rareItemsFound: 0,
      totalSpentInShop: 0,
      differentEventsSeen: []
    };

    this.createdAt = new Date().toISOString();
  }

  // ===== 属性计算 =====
  getRaceData() {
    return this.racesData[this.race] || this.racesData.human;
  }

  getBaseCharisma() {
    const race = this.getRaceData();
    let total = 5 + (race.bonus.charisma || 0);
    for (const slot of Object.values(this.equipment)) {
      if (slot) total += slot.bonuses.charisma || 0;
    }
    return total;
  }

  getBaseLuck() {
    const race = this.getRaceData();
    let total = 5 + (race.bonus.luck || 0);
    for (const slot of Object.values(this.equipment)) {
      if (slot) total += slot.bonuses.luck || 0;
    }
    return total;
  }

  getCharisma() {
    const statusEffects = this.getStatusEffects();
    return Math.max(0, this.getBaseCharisma() + statusEffects.charismaMod);
  }

  getLuck() {
    const statusEffects = this.getStatusEffects();
    return Math.max(0, this.getBaseLuck() + statusEffects.luckMod);
  }

  getGoldFind() {
    const race = this.getRaceData();
    let total = race.bonus.goldFind || 0;
    for (const slot of Object.values(this.equipment)) {
      if (slot) total += slot.bonuses.goldFind || 0;
    }
    return total;
  }

  // ===== 状态系统 =====
  getStatusEffects() {
    const effects = {
      luckMod: 0,
      goldMod: 0,
      charismaMod: 0,
      critExpand: 0,
      opsDiscount: 0,
      shopDiscount: 0
    };

    for (const status of this.statuses) {
      const e = status.effects || {};
      if (e.luckMod) effects.luckMod += e.luckMod;
      if (e.goldMod) effects.goldMod += e.goldMod;
      if (e.charismaMod) effects.charismaMod += e.charismaMod;
      if (e.critExpand) effects.critExpand = Math.max(effects.critExpand, e.critExpand);
      if (e.opsDiscount) effects.opsDiscount += e.opsDiscount;
      if (e.shopDiscount) effects.shopDiscount = Math.max(effects.shopDiscount, e.shopDiscount);
    }

    return effects;
  }

  getEventBiases() {
    return this.statuses
      .filter(s => s.effects?.eventBias)
      .map(s => s.effects.eventBias);
  }

  // 返回完整特殊效果列表 [{ type, chance, desc }]
  getSpecialEffects() {
    const effects = [];
    for (const slot of Object.values(this.equipment)) {
      if (slot?.specialEffect) {
        effects.push({ ...slot.specialEffect, slotName: slot.slot });
      }
    }
    return effects;
  }

  // 检查是否有某类特殊效果并返回最高概率
  getBestEffectChance(type) {
    let best = null;
    for (const eff of this.getSpecialEffects()) {
      if (eff.type === type && (!best || eff.chance > best.chance)) {
        best = eff;
      }
    }
    return best;
  }

  // ===== 状态交互 =====
  // 在添加状态前检查组合效果，返回被替换/取消的状态
  resolveStatusInteraction(newStatusId) {
    const interactions = {
      // 龙之祝福 + 被诅咒 → 互相抵消
      dragon_blessing_cursed: 'cancel_both',
      cursed_dragon_blessing: 'cancel_both',
      // 醉酒 + 幸运 → 幸运醉汉（+3%金币，-1幸运 → 改为 +5%金币，+1幸运）
      drunk_lucky: 'lucky_drunk',
      lucky_drunk: 'lucky_drunk',
      // 哥布林通缉 + 龙之祝福 → 强化通缉
      goblin_wanted_dragon_blessing: 'empowered_wanted',
      dragon_blessing_goblin_wanted: 'empowered_wanted'
    };

    const existingIds = this.statuses.map(s => s.id);
    for (const existingId of existingIds) {
      const key = `${existingId}_${newStatusId}`;
      if (interactions[key]) return interactions[key];
    }
    return null;
  }

  // 特殊的组合状态数据
  getCompoundStatus(comboId) {
    const compounds = {
      lucky_drunk: {
        id: 'lucky_drunk', name: '幸运醉汉', icon: '🍀🍺',
        duration: 3,
        effects: { luckMod: 1, goldMod: 5 },
        desc: '酒精和幸运混合在一起，你觉得自己无所不能！'
      },
      empowered_wanted: {
        id: 'empowered_wanted', name: '龙焰通缉', icon: '🐉📜',
        duration: 5,
        effects: { goldMod: 50, luckMod: 2, eventBias: 'goblin' },
        desc: '哥布林部落知道你背后有龙的力量，赏金翻了三倍！'
      }
    };
    return compounds[comboId] || null;
  }

  addStatus(statusDef) {
    // 检查状态交互
    const interaction = this.resolveStatusInteraction(statusDef.id);
    if (interaction === 'cancel_both') {
      // 移除冲突状态，不添加新状态
      const conflictIds = ['dragon_blessing', 'cursed'];
      this.statuses = this.statuses.filter(s => !conflictIds.includes(s.id));
      return 'cancelled';
    }

    // 组合状态
    const compound = this.getCompoundStatus(interaction);
    if (compound) {
      // 移除参与组合的旧状态
      this.statuses = this.statuses.filter(s => s.id !== statusDef.id);
      const existingCombo = this.statuses.find(s => s.id === compound.id);
      if (existingCombo) {
        existingCombo.remaining = compound.duration;
        return compound.id;
      }
      this.statuses.push({ ...compound, remaining: compound.duration });
      return compound.id;
    }

    const status = {
      ...statusDef,
      remaining: statusDef.duration,
      icon: this.statusesData[statusDef.id]?.icon || '❓'
    };
    // 同名状态刷新持续时间
    const existing = this.statuses.find(s => s.id === status.id);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, status.remaining);
      return status.id;
    }
    this.statuses.push(status);
    return status.id;
  }

  tickStatuses() {
    this.statuses = this.statuses.filter(s => {
      if (s.remaining === -1 || s.remaining === 99) return true;  // 永久
      s.remaining--;
      return s.remaining > 0;
    });
  }

  removeStatus(id) {
    this.statuses = this.statuses.filter(s => s.id !== id);
  }

  // ===== 装备系统 =====
  equipItem(itemId) {
    const item = this.equipmentData[itemId];
    if (!item) return false;
    this.equipment[item.slot] = item;
    return true;
  }

  unequipSlot(slot) {
    const item = this.equipment[slot];
    this.equipment[slot] = null;
    return item;
  }

  // 获取已装备物品 ID 集合
  getEquippedIds() {
    return Object.values(this.equipment).filter(Boolean).map(e => e.id);
  }

  // ===== 套装系统 =====
  getActiveSetBonuses() {
    const bonuses = [];
    const equippedIds = this.getEquippedIds();

    for (const [setId, setDef] of Object.entries(this.setsData)) {
      const matched = setDef.pieces.filter(id => equippedIds.includes(id));
      if (matched.length >= setDef.minEquipped) {
        bonuses.push({
          setId,
          name: setDef.name,
          icon: setDef.icon,
          matched: matched.length,
          total: setDef.pieces.length,
          bonus: setDef.bonus,
          specialEffect: setDef.specialEffect || null,
          desc: setDef.desc
        });
      }
    }
    return bonuses;
  }

  getSetBonusStats() {
    const stats = { charisma: 0, luck: 0, goldFind: 0 };
    const effects = [];
    for (const set of this.getActiveSetBonuses()) {
      if (set.bonus.charisma) stats.charisma += set.bonus.charisma;
      if (set.bonus.luck) stats.luck += set.bonus.luck;
      if (set.bonus.goldFind) stats.goldFind += set.bonus.goldFind;
      if (set.specialEffect) effects.push(set.specialEffect);
    }
    return { stats, effects };
  }

  // 重写属性计算，加入套装加成
  getCharisma() {
    const statusEffects = this.getStatusEffects();
    const setBonus = this.getSetBonusStats();
    return Math.max(0, this.getBaseCharisma() + statusEffects.charismaMod + setBonus.stats.charisma);
  }

  getLuck() {
    const statusEffects = this.getStatusEffects();
    const setBonus = this.getSetBonusStats();
    return Math.max(0, this.getBaseLuck() + statusEffects.luckMod + setBonus.stats.luck);
  }

  getGoldFind() {
    const race = this.getRaceData();
    let total = race.bonus.goldFind || 0;
    for (const slot of Object.values(this.equipment)) {
      if (slot) total += slot.bonuses.goldFind || 0;
    }
    total += this.getSetBonusStats().stats.goldFind;
    return total;
  }

  getSpecialEffects() {
    const effects = [];
    for (const slot of Object.values(this.equipment)) {
      if (slot?.specialEffect) effects.push({ ...slot.specialEffect, slotName: slot.slot });
    }
    // 套装特效
    for (const eff of this.getSetBonusStats().effects) {
      effects.push({ ...eff, source: 'set' });
    }
    return effects;
  }

  // ===== 外观系统 =====
  getDisplayEmoji() {
    if (this.activeSkin) {
      const skin = this.cosmeticsData?.items?.[this.activeSkin];
      if (skin?.emoji) return skin.emoji;
    }
    return this.getRaceData().emoji;
  }

  equipCosmetic(cosmeticId) {
    const item = this.cosmeticsData?.items?.[cosmeticId];
    if (!item) return false;

    if (item.category === 'pet_skin') {
      if (this.activeSkin === cosmeticId) {
        this.activeSkin = null;  // 取消装备
        return true;
      }
      // 检查种族匹配
      if (item.race && item.race !== this.race) return false;
      this.activeSkin = cosmeticId;
    } else if (item.category === 'window_theme') {
      this.activeTheme = (this.activeTheme === cosmeticId) ? null : cosmeticId;
    } else if (item.category === 'particle_effect') {
      this.activeParticle = (this.activeParticle === cosmeticId) ? null : cosmeticId;
    }

    if (!this.ownedCosmetics.includes(cosmeticId)) {
      this.ownedCosmetics.push(cosmeticId);
    }
    return true;
  }

  getThemeCSS() {
    if (!this.activeTheme) return null;
    return this.cosmeticsData?.items?.[this.activeTheme]?.css || null;
  }

  // ===== 情绪系统 =====
  updateMood(outcome) {
    this.recentOutcomes.unshift(outcome);
    if (this.recentOutcomes.length > 10) this.recentOutcomes = this.recentOutcomes.slice(0, 10);

    const goodCount = this.recentOutcomes.filter(o =>
      o === 'legendary' || o === 'great').length;
    const badCount = this.recentOutcomes.filter(o =>
      o === 'disaster' || o === 'fail').length;

    if (goodCount >= 5) this.mood = 'ecstatic';
    else if (goodCount >= 3) this.mood = 'happy';
    else if (badCount >= 5) this.mood = 'depressed';
    else if (badCount >= 3) this.mood = 'sad';
    else this.mood = 'neutral';
  }

  getMoodEmoji() {
    const moods = {
      ecstatic: '💖',
      happy: '😊',
      neutral: '',
      sad: '😢',
      depressed: '💔'
    };
    return moods[this.mood] || '';
  }

  // ===== 消耗品 =====
  addConsumable(itemId, qty = 1) {
    const existing = this.consumables.find(c => c.id === itemId);
    if (existing) { existing.qty += qty; }
    else { this.consumables.push({ id: itemId, qty }); }
  }

  useConsumable(itemId) {
    const existing = this.consumables.find(c => c.id === itemId);
    if (!existing || existing.qty <= 0) return false;
    existing.qty--;
    if (existing.qty <= 0) {
      this.consumables = this.consumables.filter(c => c.id !== itemId);
    }
    return true;
  }

  getConsumableCount(itemId) {
    return this.consumables.find(c => c.id === itemId)?.qty || 0;
  }

  // ===== 冒险日志 =====
  addLogEntry(entry) {
    this.adventureLog.unshift(entry);
    if (this.adventureLog.length > 200) {
      this.adventureLog = this.adventureLog.slice(0, 200);
    }
  }

  getRecentLogs(n = 20) {
    return this.adventureLog.slice(0, n);
  }

  // ===== 序列化 =====
  toJSON() {
    return {
      name: this.name,
      gender: this.gender,
      race: this.race,
      gold: this.gold,
      totalEarned: this.totalEarned,
      totalSpent: this.totalSpent,
      equipment: this.equipment,
      statuses: this.statuses,
      consumables: this.consumables,
      activeSkin: this.activeSkin,
      activeTheme: this.activeTheme,
      activeParticle: this.activeParticle,
      mood: this.mood,
      recentOutcomes: this.recentOutcomes,
      stats: this.stats,
      adventureLog: this.adventureLog,
      ownedCosmetics: this.ownedCosmetics,
      achievements: this.achievements,
      lastAdventureAt: this.lastAdventureAt,
      createdAt: this.createdAt
    };
  }

  fromJSON(data) {
    Object.assign(this, data);
    return this;
  }
}
