// equip-cache.js — 统一装备资源缓存
export class EquipCache {
  constructor(equipmentData) {
    this.cache = new Map();
    this.equipmentData = equipmentData || {};  // 内存索引，避免35次fetch
    this.maxPreview = 5;
    this._previewLRU = [];
  }

  getData(itemId) {
    if (!itemId || !this.cache) return null;
    if (this.cache.has(itemId)) return this.cache.get(itemId);
    const entry = {
      icon: null, layer: null, preview: null,
      data: this.equipmentData[itemId] || null  // 直接从内存取
    };
    this.cache.set(itemId, entry);
    return entry;
  }

  // 获取 icon (商城/背包)
  async getIcon(itemId) {
    const entry = await this.getData(itemId);
    if (!entry || entry.icon) return entry?.icon;
    entry.icon = await this._loadImage(`assets/equipment/${itemId}/icon.webp`);
    // fallback: 旧路径
    if (!entry.icon) entry.icon = await this._loadImage(`assets/equipment/${itemId.split('_')[0]}.png`);
    return entry.icon;
  }

  // 获取 layer (Paper Doll穿戴)
  async getLayer(itemId) {
    const entry = await this.getData(itemId);
    if (!entry || entry.layer) return entry?.layer;
    entry.layer = await this._loadImage(`assets/equipment/${itemId}/layer.webp`);
    if (!entry.layer) entry.layer = await this._loadImage(`assets/equipment/${itemId.split('_')[0]}.png`);
    return entry.layer;
  }

  // 获取 preview (详情弹窗)
  async getPreview(itemId) {
    const entry = await this.getData(itemId);
    if (!entry) return null;
    if (entry.preview) return entry.preview;
    entry.preview = await this._loadImage(`assets/equipment/${itemId}/preview.webp`);
    // LRU
    this._previewLRU = this._previewLRU.filter(id => id !== itemId);
    this._previewLRU.push(itemId);
    if (this._previewLRU.length > this.maxPreview) {
      const old = this._previewLRU.shift();
      const oldEntry = this.cache.get(old);
      if (oldEntry) oldEntry.preview = null; // 释放
    }
    return entry.preview;
  }

  // 预加载当前装备的所有layer
  async preloadLayers(equippedIds) {
    return Promise.all(equippedIds.map(id => this.getLayer(id)));
  }

  // 预加载所有icon
  async preloadAllIcons(ids) {
    return Promise.all(ids.map(id => this.getIcon(id)));
  }

  async _loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
}
