// dice.js — D20 骰子系统

export const DICE = {
  d20() {
    return Math.floor(Math.random() * 20) + 1;
  },

  // 带幸运加值的 D20，返回 { roll, bonus, total }（total 上限 20）
  roll(luckBonus = 0) {
    const roll = this.d20();
    const total = Math.min(20, roll + luckBonus);
    return {
      roll,                        // 原始骰子值
      bonus: Math.min(luckBonus, 20 - roll),  // 实际生效的加值
      total                        // 最终结果（上限20）
    };
  },

  // 判定结果等级
  // critExpand: 暴击范围扩展（默认仅20，+2 表示 18-20）
  judge(total, critExpand = 0) {
    const critThreshold = Math.max(19, 20 - critExpand);

    if (total === 1)                  return 'disaster';
    if (total >= critThreshold)       return 'legendary';
    if (total >= 16)                  return 'great';
    if (total >= 11)                  return 'success';
    if (total >= 6)                   return 'minor';
    return 'fail';
  },

  // 结果名称映射
  label(outcome) {
    const map = {
      legendary: '传奇成功',
      great: '大成功',
      success: '成功',
      minor: '小成功',
      fail: '失败',
      disaster: '大失败'
    };
    return map[outcome] || outcome;
  },

  // 结果图标
  icon(outcome) {
    const map = {
      legendary: '⭐',
      great: '🌟',
      success: '✅',
      minor: '👍',
      fail: '❌',
      disaster: '💀'
    };
    return map[outcome] || '❓';
  }
};
