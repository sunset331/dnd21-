// shop.js — 商城系统：装备 + 消耗品 + 每日特价

export class Shop {
  constructor(equipmentData, consumablesData) {
    this.equipmentData = equipmentData;
    this.consumablesData = consumablesData;
    this.lastDailyRefresh = null;

    // 每日特价（随机3件装备8折）
    this.dailySpecials = [];
    this.refreshDaily();
  }

  // 每日刷新
  refreshDaily() {
    const now = new Date();
    if (this.lastDailyRefresh) {
      const last = new Date(this.lastDailyRefresh);
      if (last.toDateString() === now.toDateString()) return; // 今天已刷新
    }
    this.lastDailyRefresh = now.toISOString();

    const allItems = Object.values(this.equipmentData);
    const shuffled = allItems.sort(() => Math.random() - 0.5);
    this.dailySpecials = shuffled.slice(0, 3).map(item => ({
      ...item,
      dailyPrice: Math.round(item.price * 0.8),
      isDaily: true
    }));
  }

  // 获取所有可购买的装备（含每日特价标记）
  getEquipmentList() {
    const specialIds = this.dailySpecials.map(s => s.id);
    return Object.values(this.equipmentData).map(item => {
      const isDaily = specialIds.includes(item.id);
      const dailyItem = this.dailySpecials.find(s => s.id === item.id);
      return {
        ...item,
        isDaily,
        displayPrice: isDaily ? dailyItem.dailyPrice : item.price
      };
    });
  }

  // 获取消耗品列表
  getConsumableList() {
    return Object.values(this.consumablesData);
  }

  // 购买装备
  buyEquipment(character, itemId) {
    const item = this.equipmentData[itemId];
    if (!item) return { success: false, reason: 'item not found' };

    const isDaily = this.dailySpecials.find(s => s.id === itemId);
    const price = isDaily ? Math.round(item.price * 0.8) : item.price;

    if (character.gold < price) return { success: false, reason: 'not enough gold' };
    if (character.getEquippedIds().includes(itemId)) return { success: false, reason: 'already equipped' };

    // 应用商人青睐折扣
    const effects = character.getStatusEffects();
    const discount = effects.shopDiscount / 100;
    const finalPrice = Math.round(price * (1 - discount));

    if (character.gold < finalPrice) return { success: false, reason: 'not enough gold' };

    character.gold -= finalPrice;
    character.totalSpent += finalPrice;
    character.equipItem(itemId);

    return { success: true, price: finalPrice };
  }

  // 购买消耗品
  buyConsumable(character, itemId) {
    const item = this.consumablesData[itemId];
    if (!item) return { success: false, reason: 'item not found' };
    if (character.gold < item.price) return { success: false, reason: 'not enough gold' };

    character.gold -= item.price;
    character.totalSpent += item.price;
    character.addConsumable(itemId, 1);

    return { success: true, price: item.price };
  }

  // 使用消耗品
  useConsumable(character, itemId) {
    const item = this.consumablesData[itemId];
    if (!item) return { success: false, reason: 'item not found' };
    if (!character.useConsumable(itemId)) return { success: false, reason: 'none in inventory' };

    if (item.type === 'status') {
      const statusId = item.effect.statusId;
      const statusData = character.statusesData[statusId];
      if (statusData) {
        character.addStatus(statusData);
      }
    } else if (item.type === 'cure') {
      for (const sid of item.effect.removeStatuses) {
        character.removeStatus(sid);
      }
    } else if (item.type === 'immediate') {
      if (item.effect.action === 'guarantee_legendary') {
        character._guaranteedLegendary = true;  // 下次冒险必定传奇
      }
    }

    return { success: true };
  }

  // 检查消耗品冷却
  getCooldownRemaining(itemId, lastUsedTimestamps) {
    const item = this.consumablesData[itemId];
    if (!item?.cooldownMinutes) return 0;
    const lastUsed = lastUsedTimestamps[itemId];
    if (!lastUsed) return 0;
    const elapsed = (Date.now() - lastUsed) / 60000;
    return Math.max(0, item.cooldownMinutes - elapsed);
  }

  toJSON() {
    return {
      lastDailyRefresh: this.lastDailyRefresh,
      dailySpecials: this.dailySpecials
    };
  }

  fromJSON(data) {
    if (data.lastDailyRefresh) this.lastDailyRefresh = data.lastDailyRefresh;
    if (data.dailySpecials) this.dailySpecials = data.dailySpecials;
    this.refreshDaily();  // 如果过了一天就刷新
  }
}
