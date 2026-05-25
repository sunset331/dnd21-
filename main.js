const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let tray;
let isQuitting = false;
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// ─── Settings helpers ───
function readSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return {};
}

function writeSettings(data) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) { /* ignore */ }
}

// ─── Tray icon generator (programmatic 16x16 purple dice) ───
function createTrayIcon() {
  // Draw a simple purple diamond "die" icon in raw BGRA
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Diamond shape: |x-8| + |y-8| <= 7
      const dist = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      if (dist <= 7) {
        const t = dist / 7; // 0 at center, 1 at edge
        buf[i]     = Math.round(60  + t * 40);   // B: deep purple edge
        buf[i + 1] = Math.round(20  + t * 10);   // G: dark
        buf[i + 2] = Math.round(150 - t * 60);   // R: bright center
        buf[i + 3] = 255;                         // A: opaque
      } else {
        buf[i] = buf[i + 1] = buf[i + 2] = 0;
        buf[i + 3] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

// ─── Tray menu ───
function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: '显示桌宠', click: () => { if (win) win.show(); } },
    { label: '隐藏桌宠', click: () => { if (win) win.hide(); } },
    { type: 'separator' },
    { label: '开始冒险 (Stage 1)', click: () => { if (win) win.webContents.send('tray:stage1'); } },
    { label: '投掷命运骰 (Stage 2)', click: () => { if (win) win.webContents.send('tray:stage2'); } },
    { type: 'separator' },
    { label: '静音/取消静音', click: () => { if (win) win.webContents.send('tray:mute'); } },
    { label: '打开设置', click: () => { if (win) win.webContents.send('tray:settings'); } },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } },
  ]);
}

// ─── Window ───
function createWindow() {
  const saved = readSettings();
  const winOpts = (saved && saved.window) || {};

  // DPI-aware base size
  const dpiScale = screen.getPrimaryDisplay().scaleFactor || 1;
  const baseW = Math.round(180 * dpiScale);
  const baseH = Math.round(390 * dpiScale);

  win = new BrowserWindow({
    width: baseW,
    height: baseH,
    useContentSize: true,
    x: winOpts.lastX,
    y: winOpts.lastY,
    transparent: true,
    frame: false,
    alwaysOnTop: winOpts.alwaysOnTop !== false,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    opacity: winOpts.opacity != null ? winOpts.opacity : 1.0,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  win.setAlwaysOnTop(true, 'floating');

  // Close → hide to tray (unless quitting)
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    } else {
      // Save position on real close
      const [x, y] = win.getPosition();
      const current = readSettings();
      if (!current.window) current.window = {};
      current.window.lastX = x;
      current.window.lastY = y;
      writeSettings(current);
    }
  });

  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// ─── Tray ───
function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('DND 21面骰子');
  tray.setContextMenu(buildTrayMenu());
  tray.on('double-click', () => {
    if (win) {
      win.isVisible() ? win.hide() : win.show();
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  IPC
// ═══════════════════════════════════════════════════════════

ipcMain.handle('settings:get', () => readSettings());
ipcMain.handle('settings:save', (_event, data) => writeSettings(data));

// Atomic merge: prevents race when achievements + log save simultaneously
ipcMain.handle('settings:merge', (_event, partial) => {
  const current = readSettings();
  for (const key of Object.keys(partial || {})) {
    if (partial[key] && typeof partial[key] === 'object' && !Array.isArray(partial[key])) {
      current[key] = { ...(current[key] || {}), ...partial[key] };
    } else {
      current[key] = partial[key];
    }
  }
  return writeSettings(current);
});

ipcMain.on('window:set-always-on-top', (_event, on) => {
  if (win) win.setAlwaysOnTop(on, 'floating');
});

ipcMain.on('window:set-opacity', (_event, val) => {
  if (win) win.setOpacity(val);
});

ipcMain.on('window:set-scale', (_event, val) => {
  if (win) {
    const s = screen.getPrimaryDisplay().scaleFactor || 1;
    win.setSize(Math.round(180 * s * val), Math.round(390 * s * val));
  }
});

// Ghost mode: check if cursor is near the window
ipcMain.handle('ghost:cursor-near', () => {
  if (!win || !win.isVisible()) return false;
  try {
    const cursor = screen.getCursorScreenPoint();
    const [wx, wy] = win.getPosition();
    const [ww, wh] = win.getSize();
    const margin = 60; // px — "near" threshold
    const inX = cursor.x >= wx - margin && cursor.x <= wx + ww + margin;
    const inY = cursor.y >= wy - margin && cursor.y <= wy + wh + margin;
    return inX && inY;
  } catch (e) { return true; }
});

// Toggle window visibility
ipcMain.on('window:toggle-vis', () => {
  if (win) win.isVisible() ? win.hide() : win.show();
});

// Quit app
ipcMain.on('app:quit', () => { isQuitting = true; app.quit(); });

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('before-quit', () => { isQuitting = true; });
