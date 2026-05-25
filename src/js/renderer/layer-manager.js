// layer-manager.js — 11层 Paper Doll 图层管理
import { EquipCache } from './equip-cache.js';

export class LayerManager {
  constructor(anchors, equipmentData) {
    this.anchors = anchors;
    this.baseLayers = new Map();
    this.equipLayers = new Map();   // slot → { image, itemId, rarity }
    this.imgCache = new Map();
    this.equipCache = new EquipCache(equipmentData);
    this.activeRace = 'human';
    this.baseLoaded = false;
  }

  // 加载种族基础角色图
  async setBase(race) {
    this.activeRace = race;
    this.baseLoaded = false;
    const img = await this._load(`char_${race}`, `assets/characters/${race}.png`);
    this.baseLayers.set('body', img);
    this.baseLoaded = true;
  }

  // 装备层（使用 EquipCache 统一路径）
  async setLayer(slot, itemId) {
    if (!itemId) { this.equipLayers.delete(slot); return; }
    const img = await this.equipCache.getLayer(itemId);
    const data = await this.equipCache.getData(itemId);
    this.equipLayers.set(slot, {
      image: img,
      loaded: !!img,
      itemId: itemId,
      rarity: data?.data?.rarity || 'common'
    });
  }

  removeLayer(slot) { this.equipLayers.delete(slot); }

  // 表情层
  async setExpression(exprId) {
    const img = await this._load(`expr_${exprId}`, `assets/expressions/${exprId}.png`);
    this.expression = { image: img, loaded: !!img };
  }

  // 按 z-order 返回所有图层
  getRenderOrder() {
    const result = [];
    // 基础层
    for (const [key, img] of this.baseLayers) {
      const a = this.anchors[key];
      if (a) result.push({ key, image: img, anchor: a, z: a.z, type: 'base' });
    }
    // 装备层
    for (const [slot, data] of this.equipLayers) {
      const a = this.anchors[slot];
      if (a && data.loaded) result.push({ key: slot, image: data.image, anchor: a, z: a.z, type: 'equip', rarity: data.rarity });
    }
    // 表情层
    if (this.expression?.loaded) {
      const a = this.anchors['expression'];
      if (a) result.push({ key: 'expression', image: this.expression.image, anchor: a, z: a.z, type: 'expr' });
    }
    result.sort((a, b) => a.z - b.z);
    return result;
  }

  // 加载种族动画精灵图
  async loadRaceSprites(race) {
    const key = 'sprites_' + race;
    return this._load(key, `assets/animations/${race}_sprites.png`);
  }

  getBaseImage() { return this.baseLayers.get('body'); }

  async _load(key, src) {
    if (this.imgCache.has(key)) return this.imgCache.get(key);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.imgCache.set(key, img); resolve(img); };
      img.onerror = () => { resolve(null); };
      img.src = src;
    });
  }

  clear() {
    this.baseLayers.clear();
    this.equipLayers.clear();
    this.expression = null;
  }
}
