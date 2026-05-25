// achievements.js — 成就系统

export class AchievementSystem {
  constructor(achievementsData) {
    this.defs = achievementsData;
  }

  // 检查所有成就是否达成，返回新解锁的成就列表
  checkAll(character) {
    const newlyUnlocked = [];
    const unlocked = character.achievements.unlocked || [];

    for (const def of this.defs) {
      if (unlocked.includes(def.id)) continue;
      if (this._check(def, character)) {
        newlyUnlocked.push(def);
      }
    }

    return newlyUnlocked;
  }

  _check(def, character) {
    const c = def.check;
    const ach = character.achievements;
    const stats = character.stats;

    if (c.type === 'stat') {
      return (stats[c.field] || 0) >= c.min;
    }
    if (c.type === 'achievement') {
      return (ach[c.field] || 0) >= c.min;
    }
    if (c.type === 'custom') {
      switch (c.field) {
        case 'eventsSeen':
          return (ach.differentEventsSeen || []).length >= c.min;
        case 'surviveStreak':
          return stats.consecutiveFails >= 5;
        case 'firstEquipment':
          return Object.values(character.equipment).some(Boolean);
        case 'fullEquipped':
          return Object.values(character.equipment).every(Boolean);
        default:
          return false;
      }
    }
    return false;
  }

  // 获取成就进度（用于 UI 显示）
  getProgress(def, character) {
    const c = def.check;
    const ach = character.achievements;
    const stats = character.stats;

    if (c.type === 'stat') {
      return { current: stats[c.field] || 0, max: c.min };
    }
    if (c.type === 'achievement') {
      return { current: ach[c.field] || 0, max: c.min };
    }
    if (c.type === 'custom') {
      switch (c.field) {
        case 'eventsSeen':
          return { current: (ach.differentEventsSeen || []).length, max: c.min };
        case 'surviveStreak':
          return { current: stats.consecutiveFails, max: 5 };
        case 'firstEquipment':
          return { current: Object.values(character.equipment).some(Boolean) ? 1 : 0, max: 1 };
        case 'fullEquipped':
          return { current: Object.values(character.equipment).filter(Boolean).length, max: 7 };
        default:
          return { current: 0, max: 1 };
      }
    }
    return { current: 0, max: 1 };
  }

  // 按类别分组成就
  getCategories() {
    const cats = {
      '冒险里程碑': ['first_step', 'adventurer_10', 'adventurer_100', 'adventurer_1000'],
      '财富': ['gold_1000', 'gold_10000', 'gold_100000'],
      '幸运': ['double_crit', 'triple_crit', 'survivor'],
      '收集': ['rare_hunter_5', 'rare_hunter_20', 'event_explorer'],
      '装备': ['first_equipment', 'full_equipped', 'shopaholic']
    };
    return cats;
  }
}
