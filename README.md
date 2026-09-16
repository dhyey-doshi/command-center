# Command Center

> **A high-octane, local-first personal command center and productivity dashboard built with Electron, vanilla web standards, and a raw Neo-Brutalist design language.**

![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)
![Electron](https://img.shields.io/badge/electron-^31.3.1-47848F.svg)
![Architecture](https://img.shields.io/badge/architecture-Local--First-orange.svg)

---

## Overview

**Command Center** is a fast, keyboard-centric productivity hub that unifies your daily workflow into a single, high-contrast dashboard. It replaces bloated, slow productivity tools with an uncompromising **Neo-Brutalist** aesthetic—bold slab borders, flat hard drop-shadows, electric neon accents, and instantaneous local response times.

Every piece of data is stored strictly on your local disk with automatic rotating backups. No cloud logins, no subscription paywalls, and zero latency.

---

## Features

- ⚡ **Global Command Palette (`Ctrl+Space`)**  
  Quickly search across bookmarks, tasks, notes, and system commands from anywhere in your operating system.

- 🗂️ **Universal Resource Library**  
  Index and organize websites, local directories, documents, PDF files, Notion pages, and Obsidian vaults. Launch files or folders directly in your native OS file manager with drag-and-drop support.

- ✅ **Task Management & Subtasks**  
  Create and track actionable tasks with priorities (`Low`, `Medium`, `High`), due dates, and nested subtasks. Fast inline entry, status filters, and instant undo actions.

- 📝 **Markdown Notes & Scratchpad**  
  Instant note-taking with tag indexing, full-text search, and automatic background saving. Includes a fast global quick-note capture modal (`Ctrl+Shift+Z`).

- ⏰ **Timeline Reminders & Native Notifications**  
  Schedule time-sensitive alerts with native desktop notifications. Configure configurable quiet hours and startup reminders.

- 💻 **Integrated Hacker Console (`Shift+\``)**  
  A drop-down terminal drawer offering CLI-style commands (`help`, `tasks`, `notes`, `open`, `status`, `clear`, etc.) for power users.

- 🔒 **Local-First & Privacy-Centric**  
  Your data stays on your device. Database entries are stored in your operating system's standard user data directory with an automated 5-slot rotating backup engine.

---

## Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Space</kbd> | Toggle Command Palette / Quick Search |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Open Global Quick Note Capture |
| <kbd>Shift</kbd> + <kbd>`</kbd> | Toggle Console Drawer |
| <kbd>Esc</kbd> | Close active modal or drawer |
| <kbd>Enter</kbd> (in Task Input) | Rapid task creation |

*All shortcuts can be customized from the **Settings** view.*

---

## Tech Stack

- **Runtime:** [Electron](https://www.electronjs.org/)
- **Frontend:** Pure HTML5, Modern CSS3 (CSS Variables, Flexbox, CSS Grid), Vanilla JavaScript (ES6+)
- **Storage:** Local JSON database with rotating snapshot backups
- **IPC Architecture:** Secure `contextBridge` preload script with isolated renderer context

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0 or higher recommended)
- [npm](https://www.npmjs.com/) (bundled with Node.js)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dhyey-doshi/command-center.git
   cd command-center
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

---

## Running in Background (Windows)

A lightweight VBScript launcher (`launch_hidden.vbs`) is provided for Windows users who want to launch Command Center silently in the background without keeping a terminal window open:

```cmd
wscript launch_hidden.vbs
```

You can also enable **Launch on Startup** and **Close to System Tray** directly inside the app's Settings panel.

---

## Project Structure

```text
command-center/
├── main.js                 # Electron main process (lifecycle, IPC, shortcuts, tray)
├── preload.js              # Secure IPC contextBridge bridge
├── database.js             # Local JSON database & rotating backup manager
├── launch_hidden.vbs       # Portable Windows background launcher
├── launch_test.js          # Cross-platform launch test runner
├── icon.ico                # Windows taskbar & tray icon
├── icon.png                # macOS / Linux taskbar & tray icon
├── package.json            # Project manifest and scripts
├── DESIGN.md               # Neo-Brutalist design tokens and specification
└── renderer/
    ├── index.html          # Main application UI layout
    ├── index.css           # Neo-Brutalist theme stylesheet
    ├── renderer.js         # Core application logic and view controllers
    └── icons.js            # Scalable SVG icon set
```

---

## Customization & Theming

Command Center follows the Neo-Brutalist Dark design specification defined in [`DESIGN.md`](./DESIGN.md). All colors, typography, borders, and offset shadows are configured via CSS custom properties in `renderer/index.css`.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Author

**Dhyey Doshi**  
- GitHub: [@dhyey-doshi](https://github.com/dhyey-doshi)  
- Email: [dhyeydev178@gmail.com](mailto:dhyeydev178@gmail.com)
