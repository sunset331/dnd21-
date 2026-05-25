// adventure-engine.js — 冒险引擎：事件选择、D20判定、叙事生成

import { DICE } from './dice.js';
import { Economy } from './economy.js';

export class AdventureEngine {
  constructor(eventsData, equipmentData, statusData) {
    this.events = eventsData;
    this.equipmentData = equipmentData;
    this.statusData = statusData;
  }

  // 选择冒险事件（加权随机，考虑状态和魅力）
  selectEvent(character) {
    const charisma = character.getCharisma();
    const luck = character.getLuck();
    const statusEffects = character.getStatusEffects();

    // 过滤满足条件的事件
    const eligible = this.events.filter(ev => {
      if (ev.conditions?.minCharisma && charisma < ev.conditions.minCharisma) return false;
      if (ev.conditions?.maxCharisma && charisma > ev.conditions.maxCharisma) return false;
      return true;
    });

    if (eligible.length === 0) return this.events[0];  // 保底

    // 计算权重：基础权重 + 幸运加成稀有事件 + 状态修正
    const weights = eligible.map(ev => {
      let w = ev.weight || 5;

      // 稀有事件权重随幸运提升
      if (ev.rarity === 'rare') w += Math.floor(luck / 3);
      if (ev.rarity === 'legendary') w += Math.floor(luck / 5);

      // 状态修正：bias 到特定类别
      const eventBiases = character.getEventBiases();
      if (eventBiases.includes(ev.category) || eventBiases.includes(ev.id)) {
        w *= 2;
      }

      // 宝箱怪诅咒：地牢事件权重翻倍
      if (statusEffects.mimicAttract && ev.category === 'dungeon') {
        w *= 2;
      }

      return w;
    });

    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < eligible.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return eligible[i];
    }
    return eligible[eligible.length - 1];
  }

  // 执行一次冒险，返回 AdventureResult
  run(character) {
    const event = this.selectEvent(character);
    const luck = character.getLuck();
    const charisma = character.getCharisma();
    const goldFind = character.getGoldFind();

    // 安全网：连续失败保护
    const safetyBonus = Economy.getConsecutiveFailBonus(character.stats.consecutiveFails);
    const totalLuck = luck + safetyBonus;

    // 状态修正
    const statusEffects = character.getStatusEffects();
    const luckMod = totalLuck + statusEffects.luckMod;
    const goldMod = statusEffects.goldMod / 100;
    const critExpand = statusEffects.critExpand;

    // 装备特效（使用实际概率）
    const extraRoll = character.getBestEffectChance('extraRoll');
    const failShield = character.getBestEffectChance('failShield');
    const goldReroll = character.getBestEffectChance('goldReroll');

    // 消耗品：灌铅骰子（必定传奇）
    const guaranteedLegendary = character._guaranteedLegendary;
    if (guaranteedLegendary) {
      character._guaranteedLegendary = false;
    }

    // 投骰
    let diceResult = guaranteedLegendary
      ? { roll: 20, bonus: 0, total: 20 }
      : DICE.roll(luckMod);

    // 装备特效：额外骰一次取高值
    if (extraRoll && Math.random() < extraRoll.chance) {
      const secondRoll = DICE.roll(luckMod);
      if (secondRoll.total > diceResult.total) diceResult = secondRoll;
    }

    // 装备特效：失败防护（骰子=1 且有防护 → 改为 2）
    if (diceResult.roll === 1 && failShield && Math.random() < failShield.chance) {
      diceResult = { roll: 1, bonus: luckMod, total: Math.min(20, 2 + luckMod) };
    }

    // 判定
    let outcome = DICE.judge(diceResult.total, critExpand);

    // 状态效果：隐身术（失败免疫）
    if (statusEffects.failImmune && (outcome === 'disaster' || outcome === 'fail')) {
      outcome = 'minor';
      diceResult = { roll: 6 + luckMod, bonus: luckMod, total: Math.min(20, 6 + luckMod) };
    }

    // 状态效果：再起之风（失败重骰）
    if (statusEffects.secondChance && (outcome === 'disaster' || outcome === 'fail')) {
      const secondRoll = DICE.roll(luckMod);
      const secondOutcome = DICE.judge(secondRoll.total, critExpand);
      if (secondOutcome !== 'disaster' && secondOutcome !== 'fail') {
        diceResult = secondRoll;
        outcome = secondOutcome;
      }
    }

    // 获取事件模板和金币范围
    const outcomes = event.outcomes[outcome];
    const template = outcomes.templates[Math.floor(Math.random() * outcomes.templates.length)];
    const goldMult = outcomes.goldMult;

    // 计算金币
    const dailyBonus = Economy.getDailyBonus(character.lastAdventureAt);
    let goldChange = Economy.calculateGold(
      event.baseGoldMin, event.baseGoldMax,
      goldMult + goldMod, charisma, goldFind
    );

    // 大失败时扣钱
    if (outcome === 'disaster' || outcome === 'fail') {
      goldChange = -goldChange;  // 转为负值
    }

    // 安全网
    goldChange = Economy.applySafetyNet(character, goldChange);

    // 装备特效：金币重骰（收益不满时重骰）
    if (goldReroll && goldChange < (event.baseGoldMax * (goldMult + goldMod) * 0.5) && Math.random() < goldReroll.chance) {
      const rerollGold = Economy.calculateGold(
        event.baseGoldMin, event.baseGoldMax,
        goldMult + goldMod, charisma, goldFind
      );
      const rerollSigned = (outcome === 'disaster' || outcome === 'fail') ? -rerollGold : rerollGold;
      if (rerollSigned > goldChange) goldChange = rerollSigned;
    }

    // 每日保底
    if (dailyBonus > 0 && goldChange < dailyBonus) {
      goldChange = Math.max(goldChange, dailyBonus);
    }

    // 物品掉落判定
    let droppedItem = null;
    if (outcomes.itemChance && Math.random() < outcomes.itemChance) {
      droppedItem = this.rollItemDrop(outcome);
    }

    // 状态判定
    let gainedStatus = null;
    if (outcomes.statusChance && Math.random() < outcomes.statusChance) {
      gainedStatus = this.rollStatus(outcome);
    }

    // 更新角色金币
    character.gold += goldChange;
    if (goldChange > 0) character.totalEarned += goldChange;
    else character.totalSpent += Math.abs(goldChange);

    character.stats.totalAdventures++;
    if (outcome === 'legendary' || outcome === 'great' || outcome === 'success' || outcome === 'minor') {
      character.stats.successCount++;
      character.stats.consecutiveFails = 0;
    } else {
      character.stats.failCount++;
      character.stats.consecutiveFails++;
    }
    if (outcome === 'legendary') character.stats.critSuccessCount++;
    if (outcome === 'disaster') character.stats.critFailCount++;

    character.lastAdventureAt = new Date().toISOString();

    // 更新状态倒计时
    character.tickStatuses();

    // 应用新状态（先于叙事构建，以便展示交互结果）
    let interactionResult = null;
    if (gainedStatus) {
      interactionResult = character.addStatus(gainedStatus);
    }

    // 构建叙事（现在可以引用 interactionResult）
    const narrative = this.buildNarrative(event, template, character, diceResult, outcome, goldChange, droppedItem, gainedStatus, interactionResult);

    // 构建结果对象
    const result = {
      eventName: event.name,
      eventCategory: event.category,
      dice: diceResult,
      outcome,
      goldChange,
      droppedItem,
      gainedStatus,
      interactionResult,
      narrative,
      timestamp: new Date().toISOString()
    };

    // 成就追踪
    if (!character.achievements.firstAdventure) {
      character.achievements.firstAdventure = true;
    }
    character.achievements.totalGoldEarnedLifetime += goldChange > 0 ? goldChange : 0;
    if (outcome === 'legendary') {
      character.achievements.critsInARow++;
      if (character.achievements.critsInARow > character.achievements.maxCritsInARow) {
        character.achievements.maxCritsInARow = character.achievements.critsInARow;
      }
    } else {
      character.achievements.critsInARow = 0;
    }
    if (droppedItem && (droppedItem.rarity === 'epic' || droppedItem.rarity === 'legendary')) {
      character.achievements.rareItemsFound++;
    }
    if (!character.achievements.differentEventsSeen.includes(event.id)) {
      character.achievements.differentEventsSeen.push(event.id);
    }

    // 更新情绪
    character.updateMood(outcome);

    // 添加冒险日志（含完整叙事）
    character.addLogEntry({
      eventName: event.name,
      outcome,
      diceRoll: diceResult.roll,
      diceBonus: diceResult.bonus,
      diceTotal: diceResult.total,
      goldChange,
      droppedItem: droppedItem ? droppedItem.name : null,
      gainedStatus: gainedStatus ? gainedStatus.name : null,
      narrativeLine1: narrative.line1,
      narrativeLine2: narrative.line2,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // 构建 2 行冒险叙事
  buildNarrative(event, template, character, dice, outcome, goldChange, droppedItem, gainedStatus, interactionResult) {
    const raceData = character.getRaceData();

    // 随机填充模板变量
    const location = event.locations[Math.floor(Math.random() * event.locations.length)];
    const creature = event.creatures[Math.floor(Math.random() * event.creatures.length)];
    const treasures = ['一袋沉甸甸的金币', '闪亮的宝石', '古老的金币', '精良的装备部件',
      '一块蕴含魔力的水晶', '镶金的古书', '矮人铸造的金锭', '精灵的月光金币'];
    const treasure = treasures[Math.floor(Math.random() * treasures.length)];

    // 替换模板变量
    const story = template
      .replace('{location}', location)
      .replace('{creature}', creature)
      .replace('{raceTrait}', raceData.trait)
      .replace('{treasure}', treasure)
      .replace('{name}', character.name);

    // Line 1: 骰子 + 故事
    const diceText = dice.bonus > 0
      ? `🎲${dice.roll}+${dice.bonus}=${dice.total}`
      : `🎲${dice.roll}`;

    const line1 = `${diceText} ${story}`;

    // Line 2: 金币 + 掉落 + 状态
    const parts = [];
    const goldSign = goldChange >= 0 ? '+' : '';
    parts.push(`💰${goldSign}${goldChange}金币`);

    if (droppedItem) {
      parts.push(`📦获得[${droppedItem.name}]`);
    }
    if (gainedStatus) {
      if (interactionResult === 'cancelled') {
        parts.push(`⚡状态抵消！`);
      } else if (interactionResult && interactionResult !== gainedStatus.id) {
        // 组合状态
        const compound = character.statuses.find(s => s.id === interactionResult);
        if (compound) parts.push(`${compound.icon}组合「${compound.name}」`);
      } else {
        parts.push(`${gainedStatus.icon}获得「${gainedStatus.name}」`);
      }
    }

    const line2 = parts.join('  ');

    return { line1, line2 };
  }

  // 随机物品掉落
  rollItemDrop(outcome) {
    const rarityPool = outcome === 'legendary'
      ? ['rare', 'epic', 'legendary']
      : outcome === 'great'
        ? ['uncommon', 'rare', 'epic']
        : ['common', 'uncommon'];

    const rarity = rarityPool[Math.floor(Math.random() * rarityPool.length)];
    const items = Object.values(this.equipmentData).filter(e => e.rarity === rarity);
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
  }

  // 随机状态
  rollStatus(outcome) {
    if (outcome === 'legendary' || outcome === 'great') {
      const good = ['lucky', 'dragon_blessing'];
      const id = good[Math.floor(Math.random() * good.length)];
      return { ...this.statusData[id] };
    } else {
      const bad = ['drunk', 'cursed'];
      const id = bad[Math.floor(Math.random() * bad.length)];
      return { ...this.statusData[id] };
    }
  }
}
