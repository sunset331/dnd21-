const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (data) => ipcRenderer.invoke('settings:save', data),
  mergeSettings: (partial) => ipcRenderer.invoke('settings:merge', partial),
  setAlwaysOnTop: (on) => ipcRenderer.send('window:set-always-on-top', on),
  setOpacity: (val) => ipcRenderer.send('window:set-opacity', val),
  setScale: (val) => ipcRenderer.send('window:set-scale', val),
  getCursorNear: () => ipcRenderer.invoke('ghost:cursor-near'),
  toggleVisibility: () => ipcRenderer.send('window:toggle-vis'),
  quitApp: () => ipcRenderer.send('app:quit'),
  onTrayAction: (callback) => {
    ipcRenderer.on('tray:stage1', () => callback('stage1'));
    ipcRenderer.on('tray:stage2', () => callback('stage2'));
    ipcRenderer.on('tray:mute', () => callback('mute'));
    ipcRenderer.on('tray:settings', () => callback('settings'));
  },
});
