// economy.js — 金币计算 + 安全网

export const Economy = {
  // 计算冒险金币收益
  calculateGold(baseMin, baseMax, goldMult, charisma, goldFindBonus = 0) {
    const baseGold = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1));
    const charismaMult = 1.0 + (charisma * 0.05);  // 每点魅力 +5% 金币
    const goldFindChance = goldFindBonus / 100;     // 额外金币概率

    let gold = Math.round(baseGold * goldMult * charismaMult);

    // 额外金币判定
    if (goldFindChance > 0 && Math.random() < goldFindChance) {
      gold = Math.round(gold * 1.5);  // 触发寻宝，额外 50%
    }

    return gold;
  },

  // 安全网：防止破产
  applySafetyNet(character, goldChange) {
    const currentGold = character.gold;

    // 金币不能为负
    if (currentGold + goldChange < 0) {
      return -currentGold;  // 最多扣到 0
    }

    // 金币 < 20 时，失败不扣金币
    if (currentGold < 20 && goldChange < 0) {
      return 0;
    }

    return goldChange;
  },

  // 连续失败保护
  getConsecutiveFailBonus(consecutiveFails) {
    if (consecutiveFails >= 3) return 5;  // +5 幸运加值（几乎保证不失败）
    return 0;
  },

  // 每日保底（每天首次冒险 +30 gold）
  getDailyBonus(lastAdventureAt) {
    if (!lastAdventureAt) return 30;
    const last = new Date(lastAdventureAt);
    const now = new Date();
    if (last.toDateString() !== now.toDateString()) return 30;
    return 0;
  }
};
