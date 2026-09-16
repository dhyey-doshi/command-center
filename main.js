const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const database = require('./database');

// Disable Hardware Acceleration for performance, reliability, and to prevent freeze bugs
app.disableHardwareAcceleration();

let win = null;
let tray = null;
let isQuitting = false;

// Determine cross-platform app icon
const appIconPath = process.platform === 'win32'
  ? path.join(__dirname, 'icon.ico')
  : path.join(__dirname, 'icon.png');

// Load db to inspect settings on start
const db = database.load();
const startMinimized = db.settings?.startMinimized || false;
const closeToTray = db.settings?.closeToTray !== false; // default true

function createWindow() {
  console.log('[MAIN] Creating BrowserWindow...');
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // frameless window
    backgroundColor: '#0B0C0E',
    icon: appIconPath, // Explicit taskbar & window icon
    show: true, // Show immediately to prevent GPU paint lockups
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Track all load events
  win.webContents.on('did-start-loading', () => {
    console.log('[MAIN] webContents did-start-loading');
  });

  win.webContents.on('did-finish-load', () => {
    console.log('[MAIN] webContents did-finish-load');
  });

  win.webContents.on('dom-ready', () => {
    console.log('[MAIN] webContents dom-ready');
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[MAIN] Failed to load URL: ${validatedURL} (Error: ${errorCode} - ${errorDescription})`);
  });

  // Pipe renderer console logs to main process stdout
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const lvl = ['DEBUG', 'INFO', 'WARNING', 'ERROR'][level] || 'LOG';
    console.log(`[RENDERER CONSOLE][${lvl}] ${message} (at ${path.basename(sourceId)}:${line})`);
  });

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.once('ready-to-show', () => {
    console.log('[MAIN] Window ready-to-show event fired.');
    if (startMinimized) {
      console.log('[MAIN] startMinimized is enabled, hiding window.');
      win.hide();
    } else {
      win.focus();
    }
  });

  win.on('close', (e) => {
    if (!isQuitting && closeToTray) {
      e.preventDefault();
      win.hide();
      console.log('[MAIN] Window hidden to tray on close.');
    }
  });

  win.on('closed', () => {
    win = null;
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  console.log('[MAIN] win.loadFile initiated.');
}

function createTray() {
  try {
    console.log(`[MAIN] Loading tray icon from: ${appIconPath}`);
    tray = new Tray(appIconPath);
    tray.setToolTip('Command Center');

    const contextMenu = Menu.buildFromTemplate([
      { label: 'COMMAND CENTER', enabled: false },
      { type: 'separator' },
      { label: 'Open', click: () => { if (win) { win.show(); win.focus(); } } },
      { label: 'Console', click: () => { if (win) { win.show(); win.focus(); win.webContents.send('shortcut:toggleConsole'); } } },
      { label: 'Add Task', click: () => { if (win) { win.show(); win.focus(); win.webContents.send('shortcut:toggleAddTask'); } } },
      { label: 'New Note', click: () => { if (win) { win.show(); win.focus(); win.webContents.send('shortcut:quickNote'); } } },
      { label: 'Add Reminder', click: () => { if (win) { win.show(); win.focus(); win.webContents.send('shortcut:toggleAddReminder'); } } },
      { type: 'separator' },
      { label: 'Settings', click: () => { if (win) { win.show(); win.focus(); win.webContents.send('shortcut:toggleSettings'); } } },
      { type: 'separator' },
      { label: 'Quit', click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    
    tray.on('double-click', () => {
      if (win) {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
        }
      }
    });
    console.log('[MAIN] System tray initialized successfully.');
  } catch (err) {
    console.error('[MAIN] Failed to create system tray:', err);
  }
}

function registerShortcuts() {
  const shortcuts = db.settings?.shortcuts || {
    commandCenter: 'Ctrl+Space',
    console: 'Shift+`',
    quickNote: 'Ctrl+Shift+Z'
  };

  globalShortcut.unregisterAll();

  // 1. Command Palette / Search
  try {
    const success = globalShortcut.register(shortcuts.commandCenter, () => {
      console.log(`[MAIN] Shortcut commandCenter (${shortcuts.commandCenter}) triggered.`);
      if (win) {
        win.show();
        win.focus();
        win.webContents.send('shortcut:commandPalette');
      }
    });
    if (success) {
      console.log(`[MAIN] Shortcut commandCenter (${shortcuts.commandCenter}) registered.`);
    } else {
      console.warn(`[MAIN] Shortcut commandCenter (${shortcuts.commandCenter}) registration failed.`);
    }
  } catch (e) {
    console.error(`Failed to register commandCenter shortcut (${shortcuts.commandCenter}):`, e);
  }

  // 2. Quick Note capture
  try {
    const success = globalShortcut.register(shortcuts.quickNote, () => {
      console.log(`[MAIN] Shortcut quickNote (${shortcuts.quickNote}) triggered.`);
      if (win) {
        win.show();
        win.focus();
        win.webContents.send('shortcut:quickNote');
      }
    });
    if (success) {
      console.log(`[MAIN] Shortcut quickNote (${shortcuts.quickNote}) registered.`);
    } else {
      console.warn(`[MAIN] Shortcut quickNote (${shortcuts.quickNote}) registration failed.`);
    }
  } catch (e) {
    console.error(`Failed to register quickNote shortcut (${shortcuts.quickNote}):`, e);
  }

  // 3. Open Console
  try {
    const success = globalShortcut.register(shortcuts.console, () => {
      console.log(`[MAIN] Shortcut console (${shortcuts.console}) triggered.`);
      if (win) {
        win.show();
        win.focus();
        win.webContents.send('shortcut:toggleConsole');
      }
    });
    if (success) {
      console.log(`[MAIN] Shortcut console (${shortcuts.console}) registered.`);
    } else {
      console.warn(`[MAIN] Shortcut console (${shortcuts.console}) registration failed.`);
    }
  } catch (e) {
    console.error(`Failed to register console shortcut (${shortcuts.console}):`, e);
  }
}

// IPC Handlers
ipcMain.handle('db:load', () => {
  return database.load();
});

ipcMain.handle('db:save', (event, data) => {
  const result = database.save(data);
  if (result) {
    registerShortcuts();
  }
  return result;
});

ipcMain.handle('db:getPath', () => {
  return database.getDbPath();
});

ipcMain.handle('db:getBackupsDir', () => {
  return database.getBackupsDir();
});

ipcMain.handle('db:restoreBackup', (event, index) => {
  const backupsDir = database.getBackupsDir();
  const backupPath = path.join(backupsDir, `backup_${index}.json`);
  if (fs.existsSync(backupPath)) {
    const raw = fs.readFileSync(backupPath, 'utf8');
    const parsed = JSON.parse(raw);
    database.save(parsed);
    registerShortcuts();
    return parsed;
  }
  throw new Error(`Backup at index ${index} does not exist`);
});

function resolveFilePath(target) {
  if (!target) return '';
  let resolved = target.trim();
  // Support ~ / ~/ / ~\ for user home directory
  if (resolved === '~') {
    resolved = os.homedir();
  } else if (resolved.startsWith('~/') || resolved.startsWith('~\\')) {
    resolved = path.join(os.homedir(), resolved.slice(2));
  }
  // Expand Windows %ENV% variables
  resolved = resolved.replace(/%([^%]+)%/g, (_, n) => process.env[n] || `%${n}%`);
  // Expand POSIX $ENV variables
  resolved = resolved.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, n) => process.env[n] || `$${n}`);
  return resolved;
}

ipcMain.handle('shell:open', async (event, target) => {
  if (!target) return false;
  try {
    const trimmed = target.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      await shell.openExternal(trimmed);
      return true;
    } else {
      const resolved = resolveFilePath(trimmed);
      if (fs.existsSync(resolved)) {
        const error = await shell.openPath(resolved);
        if (error) {
          console.error("shell.openPath failed:", error);
          return false;
        }
        return true;
      }
      return false;
    }
  } catch (e) {
    console.error("Shell launch failed:", e);
    return false;
  }
});

ipcMain.handle('shell:showItem', async (event, target) => {
  if (!target) return false;
  try {
    const resolved = resolveFilePath(target);
    if (fs.existsSync(resolved)) {
      shell.showItemInFolder(resolved);
      return true;
    }
    return false;
  } catch (e) {
    console.error("Shell showItem failed:", e);
    return false;
  }
});

ipcMain.handle('app:minimize', () => {
  if (win) win.minimize();
});

ipcMain.handle('app:maximize', () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.handle('app:close', () => {
  if (win) win.close();
});

ipcMain.handle('app:setStartup', (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe'),
    args: ['--hidden']
  });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('app:getStartup', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('notification:show', (event, { title, body, tag }) => {
  const notification = new Notification({
    title: title || 'Command Center',
    body: body,
    silent: false
  });
  
  notification.on('click', () => {
    if (win) {
      win.show();
      win.focus();
    }
  });

  notification.show();
  return true;
});

// App Lifecycle
app.whenReady().then(() => {
  console.log('[MAIN] App is ready. Creating window and tray...');
  createWindow();
  try {
    createTray();
  } catch (err) {
    console.error('[MAIN] Failed to initialize tray:', err);
  }
  try {
    registerShortcuts();
  } catch (err) {
    console.error('[MAIN] Failed to register shortcuts:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
