// tray-manager.js — 系统托盘
const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let petWindowRef = null;
let createPanelFn = null;
let stopActivityFn = null;

function init(getPetWindow, createPanelWindow, stopActivityTracking) {
  petWindowRef = getPetWindow;
  createPanelFn = createPanelWindow;
  stopActivityFn = stopActivityTracking;
}

function create() {
  const iconPath = path.join(__dirname, '..', '..', 'src', 'assets', 'tray_icon.png');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  tray.setToolTip('DND 桌宠 — 挂机冒险中');

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示桌宠', click: () => {
      const pw = petWindowRef();
      if (pw && !pw.isDestroyed()) pw.show();
    }},
    { label: '打开面板', click: () => createPanelFn() },
    { type: 'separator' },
    { label: '自动冒险', type: 'checkbox', checked: false, click: (mi) => {
      const pw = petWindowRef();
      if (pw && !pw.isDestroyed()) {
        pw.webContents.send('tray-auto-toggle', mi.checked);
      }
    }},
    { type: 'separator' },
    { label: '退出', click: () => {
      if (stopActivityFn) stopActivityFn();
      app.quit();
    }}
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    const pw = petWindowRef();
    if (pw && !pw.isDestroyed()) {
      pw.show();
      pw.focus();
    }
  });
}

module.exports = { init, create };
