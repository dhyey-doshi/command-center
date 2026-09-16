const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Database {
  constructor() {
    // Determine user data path
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'db.json');
    this.backupsDir = path.join(userDataPath, 'backups');
    
    // Ensure directories exist
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }
    
    this.defaultData = {
      settings: {
        runOnStartup: false,
        startMinimized: false,
        closeToTray: true,
        theme: "dark",
        personalizedGreeting: "So D, what's on your mind today?",
        quietHours: { enabled: false, start: "23:00", end: "07:00" },
        shortcuts: {
          commandCenter: "Ctrl+Space",
          console: "Shift+`",
          quickNote: "Ctrl+Shift+Z"
        }
      },
      resources: [],
      tasks: [],
      notes: [],
      scratchpad: [],
      reminders: [],
      history: []
    };
  }

  load() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        this.save(this.defaultData);
        return this.defaultData;
      }
      const raw = fs.readFileSync(this.dbPath, 'utf8');
      const parsed = JSON.parse(raw);
      // Ensure basic keys exist
      return Object.assign({}, this.defaultData, parsed);
    } catch (e) {
      console.error("Failed to load database. Loading defaults.", e);
      return this.defaultData;
    }
  }

  save(data) {
    try {
      const raw = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.dbPath, raw, 'utf8');
      this.createBackup(raw);
      return true;
    } catch (e) {
      console.error("Failed to save database", e);
      return false;
    }
  }

  createBackup(raw) {
    try {
      // Shift existing backups (keep backup_0 to backup_4)
      for (let i = 4; i > 0; i--) {
        const src = path.join(this.backupsDir, `backup_${i-1}.json`);
        const dest = path.join(this.backupsDir, `backup_${i}.json`);
        if (fs.existsSync(src)) {
          if (fs.existsSync(dest)) {
            fs.unlinkSync(dest);
          }
          fs.renameSync(src, dest);
        }
      }
      const firstBackup = path.join(this.backupsDir, 'backup_0.json');
      fs.writeFileSync(firstBackup, raw, 'utf8');
    } catch (e) {
      console.error("Failed to create rotating backup", e);
    }
  }

  getDbPath() {
    return this.dbPath;
  }

  getBackupsDir() {
    return this.backupsDir;
  }
}

module.exports = new Database();
