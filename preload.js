const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Database Actions
  dbLoad: () => ipcRenderer.invoke('db:load'),
  dbSave: (data) => ipcRenderer.invoke('db:save', data),
  dbGetPath: () => ipcRenderer.invoke('db:getPath'),
  dbGetBackupsDir: () => ipcRenderer.invoke('db:getBackupsDir'),
  dbRestoreBackup: (index) => ipcRenderer.invoke('db:restoreBackup', index),
  
  // OS Shell Actions
  shellOpen: (target) => ipcRenderer.invoke('shell:open', target),
  shellShowItem: (target) => ipcRenderer.invoke('shell:showItem', target),
  
  // Window Manipulation
  appMinimize: () => ipcRenderer.invoke('app:minimize'),
  appMaximize: () => ipcRenderer.invoke('app:maximize'),
  appClose: () => ipcRenderer.invoke('app:close'),
  
  // App Startup Settings
  appSetStartup: (enable) => ipcRenderer.invoke('app:setStartup', enable),
  appGetStartup: () => ipcRenderer.invoke('app:getStartup'),
  
  // Native Notifications
  showNotification: (title, body, tag) => ipcRenderer.invoke('notification:show', { title, body, tag }),
  
  // Listeners for global shortcut actions triggered in main process
  onCommandPalette: (callback) => {
    ipcRenderer.removeAllListeners('shortcut:commandPalette');
    ipcRenderer.on('shortcut:commandPalette', () => callback());
  },
  onQuickNote: (callback) => {
    ipcRenderer.removeAllListeners('shortcut:quickNote');
    ipcRenderer.on('shortcut:quickNote', () => callback());
  },
  onToggleConsole: (callback) => {
    ipcRenderer.removeAllListeners('shortcut:toggleConsole');
    ipcRenderer.on('shortcut:toggleConsole', () => callback());
  }
});
