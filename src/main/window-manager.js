// window-manager.js — 窗口创建与管理
const { BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let petWindow = null;
let panelWindow = null;

const CONFIG = {
  petWidth: 480,
  petHeight: 380,
  savePath: null  // 由 init 设置
};

function init(savePath) {
  CONFIG.savePath = savePath;
}

function createPetWindow() {
  const { width: screenW } = screen.getPrimaryDisplay().workAreaSize;

  petWindow = new BrowserWindow({
    width: CONFIG.petWidth,
    height: CONFIG.petHeight,
    x: screenW - CONFIG.petWidth - 20,
    y: 60,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.loadFile(path.join(__dirname, '..', '..', 'src', 'pet.html'));
  petWindow.setIgnoreMouseEvents(false);
  petWindow.on('closed', () => { petWindow = null; });

  console.log('[DND-PET] Pet window created at', petWindow.getPosition());
  console.log('[DND-PET] Window size:', petWindow.getSize());
  console.log('[DND-PET] Screen size:', screen.getPrimaryDisplay().workAreaSize);
}

function createPanelWindow() {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.focus();
    return;
  }

  panelWindow = new BrowserWindow({
    width: 520,
    height: 620,
    frame: false,
    resizable: false,
    parent: petWindow,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.loadFile(path.join(__dirname, '..', '..', 'src', 'panel.html'));
  panelWindow.on('closed', () => { panelWindow = null; });
}

function restoreWindowPosition() {
  if (!CONFIG.savePath) return;
  const posPath = path.join(CONFIG.savePath, 'window-position.json');
  try {
    if (fs.existsSync(posPath)) {
      const pos = JSON.parse(fs.readFileSync(posPath, 'utf-8'));
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        if (petWindow) petWindow.setPosition(pos.x, pos.y);
      }
    }
  } catch (_) {}
}

function getPetWindow() { return petWindow; }
function getPanelWindow() { return panelWindow; }

module.exports = { init, createPetWindow, createPanelWindow, restoreWindowPosition, getPetWindow, getPanelWindow };
