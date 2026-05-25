const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Save/Load (multi-slot)
  saveGame: (data, slot) => ipcRenderer.invoke('save-game', data, slot),
  loadGame: (slot) => ipcRenderer.invoke('load-game', slot),
  getSaveSlots: () => ipcRenderer.invoke('get-save-slots'),
  deleteSave: (slot) => ipcRenderer.invoke('delete-save', slot),

  // Panel window
  openPanel: () => ipcRenderer.send('open-panel'),

  // Notifications
  onActivityTick: (callback) => ipcRenderer.on('activity-tick', (_, ops) => callback(ops)),
  removeActivityListener: () => ipcRenderer.removeAllListeners('activity-tick'),

  // Consumable sync: panel → pet
  sendConsumableEffect: (effect) => ipcRenderer.send('consumable-effect', effect),
  onConsumableEffect: (callback) => ipcRenderer.on('consumable-effect', (_, effect) => callback(effect)),
  removeConsumableListener: () => ipcRenderer.removeAllListeners('consumable-effect'),

  // Tray
  onTrayAutoToggle: (callback) => ipcRenderer.on('tray-auto-toggle', (_, checked) => callback(checked)),

  // Settings
  saveWindowPosition: () => ipcRenderer.invoke('save-window-position'),
  getActivityRate: () => ipcRenderer.invoke('get-activity-rate'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // System
  getAppVersion: () => ipcRenderer.invoke('get-version')
});
