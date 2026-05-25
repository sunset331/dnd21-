// save-manager.js — 多槽位存档管理

export class SaveManager {
  constructor() {
    this.saveVersion = 1;
    this.activeSlot = parseInt(localStorage.getItem('dnd-pet-slot') || '1');
  }

  setSlot(n) {
    this.activeSlot = n;
    localStorage.setItem('dnd-pet-slot', String(n));
  }

  async save(character, shopState = {}, slot) {
    const n = slot || this.activeSlot;
    const data = {
      version: this.saveVersion,
      character: character.toJSON(),
      shop: shopState,
      meta: { updatedAt: new Date().toISOString() }
    };
    const result = await window.electronAPI.saveGame(data, n);
    if (result.success) this.setSlot(n);
    return result;
  }

  async load(character, slot) {
    const n = slot || this.activeSlot;
    const result = await window.electronAPI.loadGame(n);
    if (!result.success) return null;
    if (result.data?.character) character.fromJSON(result.data.character);
    this.setSlot(result.slot || n);
    return {
      character: result.data?.character,
      shop: result.data?.shop || {},
      meta: result.data?.meta || {},
      fromBackup: result.fromBackup || false,
      slot: this.activeSlot
    };
  }

  async hasSave(slot) {
    const n = slot || this.activeSlot;
    const result = await window.electronAPI.loadGame(n);
    return result.success;
  }

  async getSlots() {
    return await window.electronAPI.getSaveSlots();
  }

  async deleteSlot(slot) {
    return await window.electronAPI.deleteSave(slot);
  }
}

