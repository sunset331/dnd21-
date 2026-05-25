// ipc-router.js — 其余 IPC 路由
const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');

let petWindowRef, createPanelFn, savePath, configRef;

function init(getPetWindow, createPanelWindow, sp, cfg) {
  petWindowRef = getPetWindow;
  createPanelFn = createPanelWindow;
  savePath = sp;
  configRef = cfg;
}

function ensureDir() {
  if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });
}

function register() {
  ipcMain.on('open-panel', () => createPanelFn());

  ipcMain.on('consumable-effect', (_, effect) => {
    const pw = petWindowRef();
    if (pw && !pw.isDestroyed()) {
      pw.webContents.send('consumable-effect', effect);
    }
  });

  ipcMain.handle('get-version', () => app.getVersion());

  ipcMain.handle('save-window-position', () => {
    const pw = petWindowRef();
    if (!pw || pw.isDestroyed()) return { success: false };
    const [x, y] = pw.getPosition();
    const posPath = path.join(savePath, 'window-position.json');
    try {
      ensureDir();
      fs.writeFileSync(posPath, JSON.stringify({ x, y }), 'utf-8');
      return { success: true };
    } catch (e) { return { success: false }; }
  });

  ipcMain.handle('get-activity-rate', () => {
    const ratePath = path.join(savePath, 'settings.json');
    try {
      if (fs.existsSync(ratePath)) {
        const settings = JSON.parse(fs.readFileSync(ratePath, 'utf-8'));
        return settings.activityRate || configRef.opsPerMinute;
      }
    } catch (_) {}
    return configRef.opsPerMinute;
  });

  ipcMain.handle('save-settings', (_, settings) => {
    const ratePath = path.join(savePath, 'settings.json');
    try {
      ensureDir();
      let existing = {};
      if (fs.existsSync(ratePath)) {
        existing = JSON.parse(fs.readFileSync(ratePath, 'utf-8'));
      }
      Object.assign(existing, settings);
      fs.writeFileSync(ratePath, JSON.stringify(existing), 'utf-8');
      if (settings.activityRate) {
        configRef.opsPerMinute = settings.activityRate;
      }
      return { success: true };
    } catch (e) { return { success: false }; }
  });
}

module.exports = { init, register };
