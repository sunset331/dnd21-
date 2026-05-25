// main.js — DND 桌宠入口（模块化）
const { app } = require('electron');
const path = require('path');

const wm = require('./src/main/window-manager');
const sm = require('./src/main/save-manager');
const at = require('./src/main/activity-tracker');
const tm = require('./src/main/tray-manager');
const ipc = require('./src/main/ipc-router');

const CONFIG = {
  petWidth: 480,
  petHeight: 380,
  opsPerMinute: 30,
  activityCheckMs: 3000,
  savePath: path.join(app.getPath('userData'), 'saves'),
  maxSlots: 3
};

// 初始化所有模块
wm.init(CONFIG.savePath);
sm.init(CONFIG.savePath, CONFIG.maxSlots);
sm.registerSaveIPC();

at.init(() => wm.getPetWindow(), CONFIG);
tm.init(() => wm.getPetWindow(), () => wm.createPanelWindow(), () => at.stop());
ipc.init(() => wm.getPetWindow(), () => wm.createPanelWindow(), CONFIG.savePath, CONFIG);
ipc.register();

// 生命周期
app.whenReady().then(() => {
  wm.createPetWindow();
  wm.restoreWindowPosition();
  tm.create();
  at.start();
});

app.on('window-all-closed', () => { at.stop(); app.quit(); });
app.on('before-quit', () => at.stop());
app.on('activate', () => { wm.createPetWindow(); });
