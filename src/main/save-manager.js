// save-manager.js — 多槽位存档 IPC
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let SAVE_PATH, MAX_SLOTS;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per save file

function init(savePath, maxSlots = 3) {
  SAVE_PATH = savePath;
  MAX_SLOTS = maxSlots;
}

function validSlot(n) {
  return Number.isInteger(n) && n >= 1 && n <= MAX_SLOTS;
}

function validateSaveData(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.version !== 'number') return false;
  if (!data.character || typeof data.character !== 'object') return false;
  return true;
}

function ensureDir() {
  if (!fs.existsSync(SAVE_PATH)) fs.mkdirSync(SAVE_PATH, { recursive: true });
}
function slotPath(n) { return path.join(SAVE_PATH, `slot_${n}.json`); }
function indexPath() { return path.join(SAVE_PATH, 'index.json'); }

function readIndex() {
  ensureDir();
  const ip = indexPath();
  if (!fs.existsSync(ip)) return { activeSlot: 1, slots: {} };
  return JSON.parse(fs.readFileSync(ip, 'utf-8'));
}
function writeIndex(idx) {
  fs.writeFileSync(indexPath(), JSON.stringify(idx, null, 2), 'utf-8');
}

function registerSaveIPC() {
  ipcMain.handle('save-game', (_, data, slot) => {
    try {
      const n = slot || 1;
      if (!validSlot(n)) return { success: false, error: 'invalid slot' };
      if (!validateSaveData(data)) return { success: false, error: 'invalid save data' };

      const json = JSON.stringify(data, null, 2);
      if (Buffer.byteLength(json, 'utf-8') > MAX_FILE_SIZE) {
        return { success: false, error: 'save data too large' };
      }

      ensureDir();
      const sp = slotPath(n);
      if (fs.existsSync(sp)) {
        const bak = slotPath(n) + '.bak';
        fs.copyFileSync(sp, bak);
      }
      fs.writeFileSync(sp, json, 'utf-8');
      const idx = readIndex();
      idx.activeSlot = n;
      idx.slots[n] = { updatedAt: new Date().toISOString(), name: data?.character?.name || '未知' };
      writeIndex(idx);
      return { success: true, slot: n };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('load-game', (_, slot) => {
    try {
      ensureDir();
      const n = validSlot(slot) ? slot : (readIndex().activeSlot || 1);
      const sp = slotPath(n);
      if (!fs.existsSync(sp)) return { success: false, reason: 'no-save', slot: n };
      const data = JSON.parse(fs.readFileSync(sp, 'utf-8'));
      return { success: true, data, slot: n };
    } catch (e) {
      const bak = slotPath(slot || 1) + '.bak';
      if (fs.existsSync(bak)) {
        try {
          const data = JSON.parse(fs.readFileSync(bak, 'utf-8'));
          return { success: true, data, fromBackup: true };
        } catch (_) {}
      }
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-save-slots', () => {
    try {
      const idx = readIndex();
      const slots = [];
      for (let i = 1; i <= MAX_SLOTS; i++) {
        const sp = slotPath(i);
        const info = idx.slots[i] || {};
        slots.push({
          id: i, active: idx.activeSlot === i,
          exists: fs.existsSync(sp),
          name: info.name || null, updatedAt: info.updatedAt || null
        });
      }
      return { success: true, slots };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('delete-save', (_, slot) => {
    try {
      if (!validSlot(slot)) return { success: false, error: 'invalid slot' };
      const sp = slotPath(slot);
      if (fs.existsSync(sp)) fs.unlinkSync(sp);
      const bak = sp + '.bak';
      if (fs.existsSync(bak)) fs.unlinkSync(bak);
      const idx = readIndex();
      delete idx.slots[slot];
      if (idx.activeSlot === slot) idx.activeSlot = 1;
      writeIndex(idx);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });
}

module.exports = { init, registerSaveIPC };
