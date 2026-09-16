// State Management
let DB = {
  settings: {},
  resources: [],
  tasks: [],
  notes: [],
  scratchpad: [],
  reminders: [],
  history: []
};

let activeView = 'home';
let activeCategory = ''; // Library category filter ('', 'college', 'development', 'personal', 'favorites')
let activeTaskFilter = 'today'; // Tasks list filter ('today', 'upcoming', 'all', 'completed')
let selectedNoteId = null;
let lastCompletedTask = null;
let undoTimer = null;
let consoleHistory = [];
let consoleHistoryIndex = -1;
let systemStatus = 'active'; // active, offline

// App Initialization
async function init() {
  try {
    // Load database from IPC
    DB = await window.api.dbLoad();
    
    // Set up status dot
    updateStatusDot();
    window.addEventListener('online', updateStatusDot);
    window.addEventListener('offline', updateStatusDot);

    // Setup Startup Reminders check
    checkStartupReminders();

    // Render initial views
    renderAll();
    
    // Bind Event Listeners
    bindEvents();
    
    // Auto-save loop for Notes (when active)
    setInterval(autosaveActiveNote, 2000);
    
    // Query data locations for settings display
    const dbPath = await window.api.dbGetPath();
    const backupsPath = await window.api.dbGetBackupsDir();
    const isAutostart = await window.api.appGetStartup();
    
    document.getElementById('setting-db-path').value = dbPath;
    document.getElementById('setting-backups-path').value = backupsPath;
    document.getElementById('setting-startup').checked = isAutostart;
    
    // Initial console welcome greeting
    logToConsole('So D, what\'s on your mind today?', 'welcome');
    
  } catch (err) {
    console.error("Initialization failed:", err);
    logToConsole(`System initialization error: ${err.message}`, 'error');
  }
}

// Render Operations
function renderAll() {
  window.Icons.renderIcons();
  renderSidebar();
  renderGreeting();
  renderQuickAccess();
  renderHomeRecent();
  renderHomeTasks();
  renderHomeReminders();
  renderLibraryCategories();
  renderLibraryItems();
  renderTasksItems();
  renderNotesItems();
  renderRemindersTimeline();
  renderSettingsUI();
}

function updateStatusDot() {
  const dot = document.getElementById('app-status-dot');
  if (navigator.onLine) {
    dot.className = 'titlebar-status-dot';
    dot.title = 'App online · Database healthy';
    systemStatus = 'active';
  } else {
    dot.className = 'titlebar-status-dot offline';
    dot.title = 'App offline · Local operational mode';
    systemStatus = 'offline';
  }
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindEvents() {
  // Titlebar controls
  document.getElementById('window-minimize').addEventListener('click', () => window.api.appMinimize());
  document.getElementById('window-maximize').addEventListener('click', () => window.api.appMaximize());
  document.getElementById('window-close').addEventListener('click', () => window.api.appClose());

  // Sidebar navigation
  document.querySelectorAll('.sidebar .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      switchView(target);
    });
  });

  // Home search focus trigger
  document.getElementById('home-search-trigger').addEventListener('click', () => {
    openModal('palette-backdrop');
    setTimeout(() => document.getElementById('palette-input').focus(), 100);
  });

  // View toggles for Quick Access
  document.getElementById('qa-comfortable').addEventListener('click', () => {
    document.getElementById('qa-comfortable').classList.add('active');
    document.getElementById('qa-compact').classList.remove('active');
    document.getElementById('home-quick-access').className = 'quick-access-content comfortable';
    renderQuickAccess();
  });
  
  document.getElementById('qa-compact').addEventListener('click', () => {
    document.getElementById('qa-comfortable').classList.remove('active');
    document.getElementById('qa-compact').classList.add('active');
    document.getElementById('home-quick-access').className = 'quick-access-content compact';
    renderQuickAccess();
  });

  // Console Drawer open/close
  document.getElementById('console-launcher').addEventListener('click', toggleConsoleDrawer);
  document.getElementById('console-close-btn').addEventListener('click', closeConsoleDrawer);
  document.getElementById('console-clear-btn').addEventListener('click', () => {
    document.getElementById('console-output').innerHTML = '';
  });

  // Console command submission
  document.getElementById('console-input').addEventListener('keydown', handleConsoleInput);

  // Command Palette query submission
  document.getElementById('palette-input').addEventListener('input', handlePaletteQuery);
  document.getElementById('palette-input').addEventListener('keydown', handlePaletteKeydowns);

  // Quick Note text area keydown
  document.getElementById('quick-note-text').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      saveQuickNote();
    }
  });
  document.getElementById('quick-note-close').addEventListener('click', () => closeModal('quick-note-backdrop'));

  // Modals closing on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  // Detail panel backdrop close trigger
  document.getElementById('detail-backdrop').addEventListener('click', closeDetailPanel);

  // Add Resource Modal triggers
  document.getElementById('btn-add-resource').addEventListener('click', () => {
    document.getElementById('resource-form').reset();
    document.getElementById('resource-modal-title').textContent = "Add Resource";
    document.getElementById('btn-resource-submit').textContent = "Add";
    openModal('resource-modal-backdrop');
  });
  document.getElementById('btn-resource-cancel').addEventListener('click', () => closeModal('resource-modal-backdrop'));
  document.getElementById('resource-modal-close').addEventListener('click', () => closeModal('resource-modal-backdrop'));
  document.getElementById('resource-form').addEventListener('submit', handleResourceSubmit);

  // Drag and Drop files into Library view
  const dropZone = document.getElementById('library-drop-zone');
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (activeView === 'library') dropZone.classList.add('active');
  });
  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
  });
  window.addEventListener('drop', handleFileDrop);

  // Add Task Modal triggers
  document.getElementById('btn-add-task-modal').addEventListener('click', () => {
    document.getElementById('task-form').reset();
    document.getElementById('task-modal-title').textContent = "Create Task";
    document.getElementById('btn-task-submit').textContent = "Create";
    openModal('task-modal-backdrop');
  });
  document.getElementById('btn-task-cancel').addEventListener('click', () => closeModal('task-modal-backdrop'));
  document.getElementById('task-modal-close').addEventListener('click', () => closeModal('task-modal-backdrop'));
  document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);

  // Inline add task trigger
  document.getElementById('task-inline-add').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const text = e.target.value.trim();
      if (text) {
        createTaskInline(text);
        e.target.value = '';
      }
    }
  });

  // Task list filters switching
  document.querySelectorAll('.task-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.task-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTaskFilter = btn.getAttribute('data-filter');
      renderTasksItems();
    });
  });

  // Undo task button trigger
  document.getElementById('btn-undo-task').addEventListener('click', undoCompleteTask);

  // Notes View operations
  document.getElementById('btn-new-note').addEventListener('click', createNewNote);
  document.getElementById('notes-search-input').addEventListener('input', renderNotesItems);
  document.getElementById('btn-toggle-edit-mode').addEventListener('click', toggleNoteEditMode);
  document.getElementById('btn-toggle-focus').addEventListener('click', toggleFocusMode);
  document.getElementById('btn-delete-note').addEventListener('click', deleteActiveNote);

  // Inline add scratchpad entry
  document.getElementById('scratchpad-inline-add').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const text = e.target.value.trim();
      if (text) {
        createScratchEntry(text);
        e.target.value = '';
      }
    }
  });

  // Add Reminder Modal triggers
  document.getElementById('btn-add-reminder-modal').addEventListener('click', () => {
    document.getElementById('reminder-form').reset();
    document.getElementById('reminder-modal-title').textContent = "Create Reminder";
    document.getElementById('btn-reminder-submit').textContent = "Create";
    document.getElementById('rem-time-group').style.display = 'block';
    openModal('reminder-modal-backdrop');
  });
  document.getElementById('btn-reminder-cancel').addEventListener('click', () => closeModal('reminder-modal-backdrop'));
  document.getElementById('reminder-modal-close').addEventListener('click', () => closeModal('reminder-modal-backdrop'));
  document.getElementById('rem-type').addEventListener('change', (e) => {
    const val = e.target.value;
    const timeGroup = document.getElementById('rem-time-group');
    if (val.startsWith('startup')) {
      timeGroup.style.display = 'none';
      document.getElementById('rem-time').removeAttribute('required');
    } else {
      timeGroup.style.display = 'block';
      document.getElementById('rem-time').setAttribute('required', 'true');
    }
  });
  document.getElementById('reminder-form').addEventListener('submit', handleReminderSubmit);

  // Settings screen inputs toggling
  document.getElementById('setting-startup').addEventListener('change', async (e) => {
    const isEnabled = await window.api.appSetStartup(e.target.checked);
    e.target.checked = isEnabled;
  });
  document.getElementById('setting-start-min').addEventListener('change', e => {
    DB.settings.startMinimized = e.target.checked;
    saveDatabase();
  });
  document.getElementById('setting-close-tray').addEventListener('change', e => {
    DB.settings.closeToTray = e.target.checked;
    saveDatabase();
  });
  document.getElementById('setting-greeting').addEventListener('input', e => {
    DB.settings.personalizedGreeting = e.target.value || "So D, what's on your mind today?";
    saveDatabase();
  });
  document.getElementById('setting-quiet-enabled').addEventListener('change', e => {
    DB.settings.quietHours = DB.settings.quietHours || {};
    DB.settings.quietHours.enabled = e.target.checked;
    document.getElementById('quiet-hours-range').style.display = e.target.checked ? 'grid' : 'none';
    saveDatabase();
  });
  document.getElementById('setting-quiet-start').addEventListener('change', e => {
    DB.settings.quietHours.start = e.target.value;
    saveDatabase();
  });
  document.getElementById('setting-quiet-end').addEventListener('change', e => {
    DB.settings.quietHours.end = e.target.value;
    saveDatabase();
  });

  // Settings files buttons
  document.getElementById('btn-open-db-dir').addEventListener('click', async () => {
    const dbPath = await window.api.dbGetPath();
    const folder = dbPath.substring(0, dbPath.lastIndexOf('\\'));
    window.api.shellOpen(folder);
  });
  document.getElementById('btn-trigger-backup').addEventListener('click', () => {
    saveDatabase();
    logToConsole('Backup successfully forced and saved.', 'success');
    alert('Backup created successfully in backups folder.');
  });
  document.getElementById('btn-restore-panel-trigger').addEventListener('click', toggleRestoreBackupsPanel);

  // Global IPC shortcut triggers routed through main process
  window.api.onCommandPalette(() => {
    openModal('palette-backdrop');
    setTimeout(() => {
      const input = document.getElementById('palette-input');
      input.value = '';
      input.focus();
      handlePaletteQuery();
    }, 100);
  });

  window.api.onQuickNote(() => {
    openModal('quick-note-backdrop');
    setTimeout(() => {
      const input = document.getElementById('quick-note-text');
      input.value = '';
      input.focus();
    }, 100);
  });

  window.api.onToggleConsole(() => {
    toggleConsoleDrawer();
  });
}

// -------------------------------------------------------------
// STATE OPERATIONS
// -------------------------------------------------------------
async function saveDatabase() {
  await window.api.dbSave(DB);
}

function switchView(viewName) {
  activeView = viewName;
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
  });
  document.querySelectorAll('.sidebar .nav-item').forEach(b => {
    b.classList.remove('active');
    if (b.getAttribute('data-target') === viewName) {
      b.classList.add('active');
    }
  });
  const viewEl = document.getElementById(`view-${viewName}`);
  if (viewEl) {
    viewEl.classList.add('active');
  }
  
  // Un-focus notes Focus mode if navigating away
  if (viewName !== 'notes') {
    document.body.classList.remove('focus-mode');
  }

  renderAll();
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function closeDetailPanel() {
  document.getElementById('detail-backdrop').style.display = 'none';
  document.getElementById('detail-panel').classList.remove('active');
}

function openDetailPanel(html) {
  const panel = document.getElementById('detail-panel');
  panel.innerHTML = html;
  document.getElementById('detail-backdrop').style.display = 'block';
  panel.classList.add('active');
  
  // Re-bind click event on panel close button
  const closeBtn = panel.querySelector('.detail-close');
  if (closeBtn) closeBtn.addEventListener('click', closeDetailPanel);
}

// -------------------------------------------------------------
// HOME VIEW LOGIC
// -------------------------------------------------------------
function renderGreeting() {
  const hours = new Date().getHours();
  let text = "Welcome back, D.";
  
  if (hours < 12) {
    text = "Good morning, D.";
  } else if (hours < 18) {
    text = "Good afternoon, D.";
  } else {
    text = "Good evening, D.";
  }
  
  document.getElementById('home-greeting').textContent = text;
}

function renderSidebar() {
  document.querySelectorAll('.sidebar .nav-item').forEach(b => {
    b.classList.remove('active');
    if (b.getAttribute('data-target') === activeView) {
      b.classList.add('active');
    }
  });
}

function renderQuickAccess() {
  const container = document.getElementById('home-quick-access');
  container.innerHTML = '';
  
  // Favorites from resources list
  const favorites = DB.resources.filter(r => r.favorite);
  
  if (favorites.length === 0) {
    container.innerHTML = `<div class="empty-state">No favorite resources yet. Mark a resource as favorite in Library.<br><button onclick="switchView('library')">Open Library</button></div>`;
    return;
  }
  
  const isComfortable = container.classList.contains('comfortable');
  
  favorites.forEach(res => {
    if (isComfortable) {
      const el = document.createElement('div');
      el.className = 'quick-item-comfortable';
      el.innerHTML = `
        <div data-icon="${res.type || 'file'}"></div>
        <div class="name" title="${res.name}">${res.name}</div>
      `;
      el.addEventListener('click', () => openResource(res));
      container.appendChild(el);
    } else {
      const el = document.createElement('span');
      el.className = 'quick-item-compact';
      el.innerHTML = `<span data-icon="${res.type || 'file'}"></span> ${res.name}`;
      el.addEventListener('click', () => openResource(res));
      container.appendChild(el);
    }
  });
  
  window.Icons.renderIcons();
}

function renderHomeRecent() {
  const container = document.getElementById('home-recent');
  container.innerHTML = '';
  
  const recent = [...DB.resources]
    .filter(r => r.lastOpened)
    .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened))
    .slice(0, 4);
    
  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:0;">No recently opened resources.</div>`;
    return;
  }
  
  recent.forEach(res => {
    const el = document.createElement('span');
    el.className = 'quick-item-compact';
    el.innerHTML = `<span data-icon="${res.type || 'file'}"></span> ${res.name}`;
    el.addEventListener('click', () => openResource(res));
    container.appendChild(el);
  });
  
  window.Icons.renderIcons();
}

function renderHomeTasks() {
  const container = document.getElementById('home-tasks');
  container.innerHTML = '';
  
  // Fetch active tasks for today (either due today or no due date)
  const activeTasks = DB.tasks.filter(t => !t.completed);
  
  if (activeTasks.length === 0) {
    container.innerHTML = `<div class="empty-state">Nothing waiting for you.</div>`;
    document.getElementById('home-tasks-more').style.display = 'none';
    return;
  }
  
  const showCount = 3;
  const sliced = activeTasks.slice(0, showCount);
  
  sliced.forEach(task => {
    const el = document.createElement('div');
    el.className = 'home-list-item';
    
    let metaText = task.project || 'General';
    if (task.dueDate) {
      const formattedDate = new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
      metaText += ` · ${formattedDate}`;
    }
    
    el.innerHTML = `
      <div class="check-circle" onclick="event.stopPropagation(); completeTask('${task.id}')"></div>
      <div class="item-details">
        <span class="title">${task.title}</span>
        <span class="meta">${metaText}</span>
      </div>
    `;
    el.addEventListener('click', () => showTaskDetails(task.id));
    container.appendChild(el);
  });
  
  const moreCount = activeTasks.length - showCount;
  const moreLink = document.getElementById('home-tasks-more');
  if (moreCount > 0) {
    moreLink.textContent = `+ ${moreCount} more`;
    moreLink.style.display = 'inline-block';
    moreLink.onclick = () => switchView('tasks');
  } else {
    moreLink.style.display = 'none';
  }
}

function renderHomeReminders() {
  const container = document.getElementById('home-reminders');
  container.innerHTML = '';
  
  const activeReminders = DB.reminders.filter(r => !r.completed);
  
  if (activeReminders.length === 0) {
    container.innerHTML = `<div class="empty-state">You're clear.</div>`;
    document.getElementById('home-reminders-more').style.display = 'none';
    return;
  }
  
  const showCount = 3;
  const sliced = activeReminders.slice(0, showCount);
  
  sliced.forEach(rem => {
    const el = document.createElement('div');
    el.className = 'home-list-item';
    
    let timeLabel = 'Startup';
    if (rem.type === 'time') {
      const d = new Date(rem.trigger);
      timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    el.innerHTML = `
      <div class="time">${timeLabel}</div>
      <div class="item-details">
        <span class="title">${rem.message}</span>
      </div>
    `;
    el.addEventListener('click', () => switchView('reminders'));
    container.appendChild(el);
  });
  
  const moreCount = activeReminders.length - showCount;
  const moreLink = document.getElementById('home-reminders-more');
  if (moreCount > 0) {
    moreLink.textContent = `+ ${moreCount} more`;
    moreLink.style.display = 'inline-block';
    moreLink.onclick = () => switchView('reminders');
  } else {
    moreLink.style.display = 'none';
  }
}

// -------------------------------------------------------------
// RESOURCE LIBRARY LOGIC
// -------------------------------------------------------------
function renderLibraryCategories() {
  const container = document.getElementById('library-category-list');
  container.innerHTML = '';
  
  const categories = [
    { id: '', name: 'ALL' },
    { id: 'favorites', name: 'FAVORITES' },
    { id: 'college', name: 'COLLEGE' },
    { id: 'development', name: 'DEVELOPMENT' },
    { id: 'personal', name: 'PERSONAL' }
  ];
  
  categories.forEach(cat => {
    const el = document.createElement('div');
    el.className = `lib-nav-item ${activeCategory === cat.id ? 'active' : ''}`;
    el.textContent = cat.name;
    el.addEventListener('click', () => {
      activeCategory = cat.id;
      renderLibraryCategories();
      renderLibraryItems();
    });
    container.appendChild(el);
  });
}

function renderLibraryItems() {
  const container = document.getElementById('library-items-list');
  container.innerHTML = '';
  
  const query = document.getElementById('library-search-input').value.toLowerCase();
  
  let list = DB.resources;
  
  // Filter by category
  if (activeCategory === 'favorites') {
    list = list.filter(r => r.favorite);
  } else if (activeCategory !== '') {
    list = list.filter(r => r.categories && r.categories.includes(activeCategory));
  }
  
  // Filter by search query
  if (query) {
    list = list.filter(r => 
      r.name.toLowerCase().includes(query) || 
      (r.target && r.target.toLowerCase().includes(query)) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(query)))
    );
  }
  
  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--color-text-muted);">No resources found. Click Add to create references.</td></tr>`;
    return;
  }
  
  list.forEach(res => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="resource-row-icon"><span data-icon="${res.type || 'file'}"></span></td>
      <td><span style="font-weight: 500;">${res.name}</span></td>
      <td class="resource-location-col" title="${res.target}">${res.target}</td>
      <td style="text-align: center; color: var(--color-accent);" onclick="event.stopPropagation(); toggleFavoriteResource('${res.id}')">
        <span data-icon="${res.favorite ? 'starFilled' : 'star'}"></span>
      </td>
    `;
    tr.addEventListener('click', () => showResourceDetails(res.id));
    container.appendChild(tr);
  });
  
  window.Icons.renderIcons();
}

async function openResource(res) {
  // Update timestamp
  res.lastOpened = new Date().toISOString();
  saveDatabase();
  
  logToConsole(`Opening resource: ${res.name}`, 'info');
  const ok = await window.api.shellOpen(res.target);
  if (!ok) {
    logToConsole(`Error opening resource at target location: ${res.target}`, 'error');
    alert(`Could not open resource.\nThe file no longer exists at: ${res.target}\nOr target URL is invalid.`);
  }
  renderAll();
}

function toggleFavoriteResource(id) {
  const res = DB.resources.find(r => r.id === id);
  if (res) {
    res.favorite = !res.favorite;
    saveDatabase();
    renderAll();
  }
}

function handleResourceSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('res-name').value.trim();
  const type = document.getElementById('res-type').value;
  const target = document.getElementById('res-target').value.trim();
  const category = document.getElementById('res-category').value;
  const rawTags = document.getElementById('res-tags').value;
  
  const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const categories = category ? [category] : [];
  
  const resource = {
    id: 'res-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    name,
    type,
    target,
    categories,
    tags,
    favorite: false,
    lastOpened: null
  };
  
  DB.resources.push(resource);
  saveDatabase();
  closeModal('resource-modal-backdrop');
  renderAll();
  logToConsole(`Resource reference created: ${name}`, 'success');
}

function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('library-drop-zone').classList.remove('active');
  
  if (activeView !== 'library') return;
  
  const files = e.dataTransfer.files;
  if (files.length === 0) return;
  
  const file = files[0];
  const name = file.name;
  const path = file.path; // Available in Electron file objects
  
  // Auto-detect type
  let type = 'file';
  if (name.endsWith('.pdf')) type = 'pdf';
  // Note: Electron file handles directory details differently, but path checker works
  
  // Open Resource addition modal with populated files details
  document.getElementById('res-name').value = name;
  document.getElementById('res-type').value = type;
  document.getElementById('res-target').value = path;
  document.getElementById('resource-modal-title').textContent = "Confirm Dropped Resource";
  document.getElementById('btn-resource-submit').textContent = "Add to Library";
  
  openModal('resource-modal-backdrop');
}

function showResourceDetails(id) {
  const res = DB.resources.find(r => r.id === id);
  if (!res) return;
  
  let formattedDate = 'Never';
  if (res.lastOpened) {
    formattedDate = new Date(res.lastOpened).toLocaleString();
  }
  
  const relatedTasks = DB.tasks.filter(t => t.linkedResources && t.linkedResources.includes(id));
  const relatedNotes = DB.notes.filter(n => n.linkedResources && n.linkedResources.includes(id));

  let relatedHtml = '';
  if (relatedTasks.length > 0) {
    relatedHtml += `<div class="detail-label">Related Tasks</div>`;
    relatedTasks.forEach(t => {
      relatedHtml += `<div style="font-size:12px; margin-bottom:4px;">○ ${t.title}</div>`;
    });
  }
  if (relatedNotes.length > 0) {
    relatedHtml += `<div class="detail-label" style="margin-top:12px;">Related Notes</div>`;
    relatedNotes.forEach(n => {
      relatedHtml += `<div style="font-size:12px; margin-bottom:4px;">📝 ${n.title}</div>`;
    });
  }

  const html = `
    <div class="detail-header">
      <div class="detail-title" style="text-transform: uppercase;">${res.name}</div>
      <button class="detail-close" style="font-size:18px;">&times;</button>
    </div>
    
    <div class="detail-divider"></div>
    
    <div class="detail-field">
      <span class="detail-label">Type</span>
      <span class="detail-value" style="text-transform: capitalize;">${res.type}</span>
    </div>
    
    <div class="detail-field">
      <span class="detail-label">Location / Target</span>
      <span class="detail-value" style="font-family: var(--font-mono); font-size:12px; word-break: break-all;">${res.target}</span>
    </div>

    <div class="detail-field">
      <span class="detail-label">Categories</span>
      <span class="detail-value">${res.categories && res.categories.length > 0 ? res.categories.join(', ') : 'None'}</span>
    </div>

    <div class="detail-field">
      <span class="detail-label">Tags</span>
      <span class="detail-value">${res.tags && res.tags.length > 0 ? res.tags.join(', ') : 'None'}</span>
    </div>

    <div class="detail-field">
      <span class="detail-label">Last Opened</span>
      <span class="detail-value">${formattedDate}</span>
    </div>
    
    <div class="detail-divider"></div>
    
    ${relatedHtml}

    <div class="detail-divider"></div>

    <div style="display:flex; flex-direction:column; gap:12px;">
      <button class="btn-primary" style="justify-content:center; height:38px;" onclick="openResourceById('${res.id}')">OPEN RESOURCE</button>
      <button class="btn-secondary" style="color: var(--color-console-error); border-color: var(--color-border);" onclick="deleteResourceById('${res.id}')">Remove reference from Library</button>
    </div>
  `;
  openDetailPanel(html);
}

function openResourceById(id) {
  const res = DB.resources.find(r => r.id === id);
  if (res) {
    closeDetailPanel();
    openResource(res);
  }
}

function deleteResourceById(id) {
  const res = DB.resources.find(r => r.id === id);
  if (res && confirm(`Are you sure you want to remove "${res.name}" reference?\nThis will NOT delete the actual file or folder on your computer.`)) {
    DB.resources = DB.resources.filter(r => r.id !== id);
    saveDatabase();
    closeDetailPanel();
    renderAll();
    logToConsole(`Resource reference removed: ${res.name}`, 'info');
  }
}

// -------------------------------------------------------------
// TASKS LOGIC
// -------------------------------------------------------------
function renderTasksItems() {
  const container = document.getElementById('tasks-items-list');
  container.innerHTML = '';
  
  let list = DB.tasks;
  
  // Filter switching
  if (activeTaskFilter === 'today') {
    list = list.filter(t => !t.completed); // Incomplete
    // sorted with priorities
  } else if (activeTaskFilter === 'upcoming') {
    list = list.filter(t => !t.completed && t.dueDate);
  } else if (activeTaskFilter === 'completed') {
    list = list.filter(t => t.completed);
  } else {
    // 'all' includes incomplete
    list = list.filter(t => !t.completed);
  }
  
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">Nothing waiting for you.</div>`;
    return;
  }
  
  list.forEach(task => {
    const el = document.createElement('div');
    el.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    let metaText = task.project || 'General';
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      metaText += ` · Due ${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
    
    el.innerHTML = `
      <div class="priority-badge priority-${task.priority || 'normal'}" title="${task.priority} priority"></div>
      <div class="check-circle" onclick="event.stopPropagation(); completeTask('${task.id}')"></div>
      <div class="task-body-content">
        <div class="task-title-row">
          <span class="task-title">${task.title}</span>
        </div>
        <div class="task-meta">${metaText}</div>
      </div>
    `;
    el.addEventListener('click', () => showTaskDetails(task.id));
    container.appendChild(el);
  });
}

function createTaskInline(title) {
  const task = {
    id: 'task-' + Date.now(),
    title,
    description: '',
    dueDate: null,
    priority: 'normal',
    project: '',
    completed: false,
    completedAt: null,
    linkedResources: [],
    linkedNotes: []
  };
  
  DB.tasks.push(task);
  saveDatabase();
  renderAll();
  logToConsole(`Task created: ${title}`, 'success');
}

function handleTaskSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('task-title-input').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const priority = document.getElementById('task-priority').value;
  const dueDate = document.getElementById('task-due').value || null;
  const project = document.getElementById('task-project').value.trim();
  const remind = document.getElementById('task-remind').value;
  
  const id = 'task-' + Date.now();
  const task = {
    id,
    title,
    description,
    dueDate,
    priority,
    project,
    completed: false,
    completedAt: null,
    linkedResources: [],
    linkedNotes: []
  };
  
  DB.tasks.push(task);
  
  if (remind === 'due' && dueDate) {
    // Create associated reminder object
    const reminder = {
      id: 'rem-' + Date.now(),
      message: `Task: ${title}`,
      type: 'time',
      trigger: dueDate,
      completed: false,
      linkedTaskId: id
    };
    DB.reminders.push(reminder);
  }
  
  saveDatabase();
  closeModal('task-modal-backdrop');
  renderAll();
  logToConsole(`Task created: ${title}`, 'success');
}

function completeTask(id) {
  const task = DB.tasks.find(t => t.id === id);
  if (task) {
    task.completed = true;
    task.completedAt = new Date().toISOString();
    
    // Auto-complete associated reminder if any
    const relatedRem = DB.reminders.find(r => r.linkedTaskId === id);
    if (relatedRem) relatedRem.completed = true;

    lastCompletedTask = id;
    saveDatabase();
    
    // Show undo banner
    const banner = document.getElementById('undo-banner');
    document.getElementById('undo-banner-text').textContent = `"${task.title}" completed.`;
    banner.style.display = 'flex';
    
    // Auto-hide undo banner after 4 seconds
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
      banner.style.display = 'none';
      lastCompletedTask = null;
    }, 4000);
    
    renderAll();
    logToConsole(`✓ Task completed: ${task.title}`, 'success');
  }
}

function undoCompleteTask() {
  if (lastCompletedTask) {
    const task = DB.tasks.find(t => t.id === lastCompletedTask);
    if (task) {
      task.completed = false;
      task.completedAt = null;
      
      const relatedRem = DB.reminders.find(r => r.linkedTaskId === lastCompletedTask);
      if (relatedRem) relatedRem.completed = false;

      saveDatabase();
      document.getElementById('undo-banner').style.display = 'none';
      lastCompletedTask = null;
      renderAll();
      logToConsole(`Undo complete: ${task.title}`, 'info');
    }
  }
}

function showTaskDetails(id) {
  const task = DB.tasks.find(t => t.id === id);
  if (!task) return;
  
  let dueLabel = 'No due date';
  if (task.dueDate) {
    dueLabel = new Date(task.dueDate).toLocaleString();
  }
  
  const relatedRem = DB.reminders.find(r => r.linkedTaskId === id);

  const html = `
    <div class="detail-header">
      <div class="detail-title">${task.title}</div>
      <button class="detail-close" style="font-size:18px;">&times;</button>
    </div>
    
    <div class="detail-divider"></div>
    
    <div class="detail-field">
      <span class="detail-label">Status</span>
      <span class="detail-value">${task.completed ? 'Completed' : 'Active'}</span>
    </div>

    <div class="detail-field">
      <span class="detail-label">Due Date</span>
      <span class="detail-value">${dueLabel}</span>
    </div>

    <div class="detail-field">
      <span class="detail-label">Priority</span>
      <span class="detail-value" style="text-transform: capitalize; color: var(--color-accent);">${task.priority}</span>
    </div>

    <div class="detail-field">
      <span class="detail-label">Project</span>
      <span class="detail-value">${task.project || 'General'}</span>
    </div>

    <div class="detail-field">
      <span class="detail-label">Description</span>
      <span class="detail-value" style="white-space: pre-wrap; font-size:12px;">${task.description || 'No description provided.'}</span>
    </div>

    ${relatedRem ? `
      <div class="detail-field">
        <span class="detail-label">Associated Reminder</span>
        <span class="detail-value">🔔 Scheduled</span>
      </div>
    ` : ''}

    <div class="detail-divider"></div>

    <div style="display:flex; flex-direction:column; gap:12px;">
      ${!task.completed ? `<button class="btn-primary" style="justify-content:center; height:38px;" onclick="completeTaskById('${task.id}')">MARK COMPLETED</button>` : ''}
      <button class="btn-secondary" style="color: var(--color-console-error); border-color: var(--color-border);" onclick="deleteTaskById('${task.id}')">Delete Task</button>
    </div>
  `;
  openDetailPanel(html);
}

function completeTaskById(id) {
  closeDetailPanel();
  completeTask(id);
}

function deleteTaskById(id) {
  const task = DB.tasks.find(t => t.id === id);
  if (task && confirm(`Delete task: "${task.title}"?`)) {
    DB.tasks = DB.tasks.filter(t => t.id !== id);
    // Delete associated reminder
    DB.reminders = DB.reminders.filter(r => r.linkedTaskId !== id);
    saveDatabase();
    closeDetailPanel();
    renderAll();
    logToConsole(`Task deleted: ${task.title}`, 'info');
  }
}

// -------------------------------------------------------------
// NOTES & SCRATCH LOGIC
// -------------------------------------------------------------
function renderNotesItems() {
  const container = document.getElementById('notes-items-list');
  container.innerHTML = '';
  
  const query = document.getElementById('notes-search-input').value.toLowerCase();
  
  let list = DB.notes || [];
  
  if (query) {
    list = list.filter(n => 
      n.title.toLowerCase().includes(query) || 
      n.content.toLowerCase().includes(query)
    );
  }
  
  // Sort modified time descending
  list.sort((a,b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">No notes found.</div>`;
    // If no notes, clear editor inputs
    clearEditor();
    return;
  }
  
  list.forEach(note => {
    const el = document.createElement('div');
    el.className = `note-item ${selectedNoteId === note.id ? 'active' : ''}`;
    el.innerHTML = `
      <div class="note-item-title">${note.title || 'Untitled Note'}</div>
      <div class="note-item-preview">${note.content.substring(0, 40) || 'Empty note...'}</div>
    `;
    el.addEventListener('click', () => selectNote(note.id));
    container.appendChild(el);
  });
  
  // Auto-select first note if none selected
  if (!selectedNoteId && list.length > 0) {
    selectNote(list[0].id);
  }
  
  renderScratchEntries();
}

function clearEditor() {
  document.getElementById('note-edit-title').value = '';
  document.getElementById('note-edit-title').setAttribute('readonly', 'true');
  document.getElementById('note-edit-content').value = '';
  document.getElementById('note-preview-content').innerHTML = '<i>Start with a thought.</i>';
  selectedNoteId = null;
}

function selectNote(id) {
  selectedNoteId = id;
  const note = DB.notes.find(n => n.id === id);
  if (!note) return;
  
  // Mark active in sidebar list
  document.querySelectorAll('.note-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Render Editor fields
  const titleInput = document.getElementById('note-edit-title');
  titleInput.value = note.title;
  titleInput.removeAttribute('readonly'); // Allow edits
  
  const textarea = document.getElementById('note-edit-content');
  textarea.value = note.content;
  
  const preview = document.getElementById('note-preview-content');
  preview.innerHTML = parseMarkdown(note.content);
  
  // Update state active styling
  renderNotesItems();
}

function createNewNote() {
  const note = {
    id: 'note-' + Date.now(),
    title: 'Untitled Note',
    content: '',
    modifiedAt: new Date().toISOString(),
    linkedResources: [],
    linkedTasks: []
  };
  
  DB.notes = DB.notes || [];
  DB.notes.push(note);
  saveDatabase();
  
  // Navigate & select new note
  selectedNoteId = note.id;
  renderNotesItems();
  selectNote(note.id);
  
  // Put edit focus on title
  setTimeout(() => {
    const title = document.getElementById('note-edit-title');
    title.focus();
    title.select();
  }, 100);
}

function toggleNoteEditMode() {
  const textarea = document.getElementById('note-edit-content');
  const preview = document.getElementById('note-preview-content');
  const btn = document.getElementById('btn-toggle-edit-mode');
  
  if (textarea.style.display === 'none') {
    // Switch to Raw Editor
    textarea.style.display = 'block';
    preview.style.display = 'none';
    btn.textContent = "Preview Mode";
    textarea.focus();
  } else {
    // Switch to HTML Live Preview
    textarea.style.display = 'none';
    preview.style.display = 'block';
    btn.textContent = "Edit Mode";
    preview.innerHTML = parseMarkdown(textarea.value);
    
    // Save immediate
    autosaveActiveNote(true);
  }
}

function toggleFocusMode() {
  const isFocus = document.body.classList.toggle('focus-mode');
  const btn = document.getElementById('btn-toggle-focus');
  btn.textContent = isFocus ? "Exit Focus" : "Focus";
  
  // If focus mode entered, force edit mode ON to let the user write
  const textarea = document.getElementById('note-edit-content');
  const preview = document.getElementById('note-preview-content');
  const btnEdit = document.getElementById('btn-toggle-edit-mode');
  
  if (isFocus) {
    textarea.style.display = 'block';
    preview.style.display = 'none';
    btnEdit.textContent = "Preview Mode";
    textarea.focus();
  }
}

function deleteActiveNote() {
  if (!selectedNoteId) return;
  const note = DB.notes.find(n => n.id === selectedNoteId);
  if (note && confirm(`Are you sure you want to delete note "${note.title}"?`)) {
    DB.notes = DB.notes.filter(n => n.id !== selectedNoteId);
    saveDatabase();
    selectedNoteId = null;
    renderNotesItems();
    logToConsole(`Note deleted: ${note.title}`, 'info');
  }
}

function autosaveActiveNote(force = false) {
  if (!selectedNoteId || activeView !== 'notes') return;
  
  const title = document.getElementById('note-edit-title').value.trim();
  const textarea = document.getElementById('note-edit-content');
  let content = textarea.value;
  
  // If currently displaying preview, grab value from text container (though textarea has it synced)
  const note = DB.notes.find(n => n.id === selectedNoteId);
  if (!note) return;
  
  // Only save if there was a modification
  if (note.title !== title || note.content !== content || force) {
    note.title = title || 'Untitled Note';
    note.content = content;
    note.modifiedAt = new Date().toISOString();
    
    // Save changes
    saveDatabase();
    // Render list sidebar to reflect updated previews/titles
    const searchVal = document.getElementById('notes-search-input').value;
    if (!searchVal) {
      // Don't redraw list fully on typing to prevent scroll jumps, just update active preview text
      const listEl = document.querySelector(`.note-item.active .note-item-title`);
      if (listEl) listEl.textContent = note.title;
      const previewEl = document.querySelector(`.note-item.active .note-item-preview`);
      if (previewEl) previewEl.textContent = content.substring(0, 40);
    } else {
      renderNotesItems();
    }
  }
}

function saveQuickNote() {
  const content = document.getElementById('quick-note-text').value.trim();
  if (!content) {
    closeModal('quick-note-backdrop');
    return;
  }
  
  const d = new Date();
  const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const title = `Quick Note - ${dateStr}`;
  
  const note = {
    id: 'note-' + Date.now(),
    title,
    content,
    modifiedAt: new Date().toISOString(),
    linkedResources: [],
    linkedTasks: []
  };
  
  DB.notes = DB.notes || [];
  DB.notes.push(note);
  saveDatabase();
  
  closeModal('quick-note-backdrop');
  logToConsole(`📝 Quick Note saved successfully.`, 'success');
  
  if (activeView === 'notes') {
    renderNotesItems();
    selectNote(note.id);
  }
}

// Custom Markdown Parser Function
function parseMarkdown(text) {
  if (!text) return '<i>No content yet. Start writing...</i>';
  // Escape HTML to prevent injection
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gm, '<pre><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="#" class="md-link" data-url="$2">$1</a>');
  
  // Lists
  html = html.replace(/^\s*\-\s(.*$)/gim, '<ul><li>$1</li></ul>');
  html = html.replace(/^\s*\*\s(.*$)/gim, '<ul><li>$1</li></ul>');
  html = html.replace(/^\s*\d+\.\s(.*$)/gim, '<ol><li>$1</li></ol>');
  
  // Clean up nested lists
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/<\/ol>\s*<ol>/g, '');
  
  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p>');
  // Line breaks (single newlines)
  html = html.replace(/\n/g, '<br>');
  
  // Wrap with p
  html = '<p>' + html + '</p>';
  
  // Inject click handlers for links inside main process
  setTimeout(() => {
    document.querySelectorAll('.md-link').forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        window.api.shellOpen(link.getAttribute('data-url'));
      };
    });
  }, 100);

  return html;
}

// -------------------------------------------------------------
// SCRATCHPAD LOGIC
// -------------------------------------------------------------
function renderScratchEntries() {
  const container = document.getElementById('scratchpad-items-list');
  container.innerHTML = '';
  
  const pad = DB.scratchpad || [];
  
  if (pad.length === 0) {
    container.innerHTML = `<div class="empty-state">Scratchpad is clear. Capture quick, unstructured thoughts here.</div>`;
    return;
  }
  
  // Sort descending
  const sorted = [...pad].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  sorted.forEach(item => {
    const el = document.createElement('div');
    el.className = 'scratch-item';
    
    const d = new Date(item.createdAt);
    const timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    el.innerHTML = `
      <div class="scratch-time">${timeLabel}</div>
      <div style="color: var(--color-text-primary); max-width:85%; word-break:break-all;">${item.content}</div>
      <div class="scratch-actions">
        <button class="scratch-action-btn" onclick="promoteScratch('${item.id}')" title="Promote to note"><span data-icon="arrowUpRight"></span></button>
        <button class="scratch-action-btn" onclick="deleteScratch('${item.id}')" title="Delete scratch"><span data-icon="trash"></span></button>
      </div>
    `;
    container.appendChild(el);
  });
  
  window.Icons.renderIcons();
}

function createScratchEntry(content) {
  const item = {
    id: 'scratch-' + Date.now(),
    content,
    createdAt: new Date().toISOString()
  };
  
  DB.scratchpad = DB.scratchpad || [];
  DB.scratchpad.push(item);
  saveDatabase();
  renderNotesItems();
}

function deleteScratch(id) {
  DB.scratchpad = DB.scratchpad.filter(item => item.id !== id);
  saveDatabase();
  renderNotesItems();
}

function promoteScratch(id) {
  const item = DB.scratchpad.find(s => s.id === id);
  if (!item) return;
  
  const title = prompt("Enter a title to promote this scratch entry to a Note:", "New Note Idea");
  if (title === null) return; // cancel
  
  const note = {
    id: 'note-' + Date.now(),
    title: title.trim() || 'Promoted Note',
    content: item.content,
    modifiedAt: new Date().toISOString(),
    linkedResources: [],
    linkedTasks: []
  };
  
  DB.notes = DB.notes || [];
  DB.notes.push(note);
  
  // Remove from scratch
  DB.scratchpad = DB.scratchpad.filter(s => s.id !== id);
  
  saveDatabase();
  selectedNoteId = note.id;
  renderNotesItems();
  selectNote(note.id);
  logToConsole(`Scratch entry promoted to Note: ${note.title}`, 'success');
}

// -------------------------------------------------------------
// REMINDERS TIMELINE LOGIC
// -------------------------------------------------------------
function renderRemindersTimeline() {
  const container = document.getElementById('reminders-timeline-list');
  container.innerHTML = '';
  
  const active = DB.reminders.filter(r => !r.completed);
  const completed = DB.reminders.filter(r => r.completed);
  
  // Categorize Active
  const todayList = [];
  const tomorrowList = [];
  const upcomingList = [];
  const startupList = [];
  
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const tomorrowEnd = new Date(todayEnd.getTime() + (24*60*60*1000));
  
  active.forEach(rem => {
    if (rem.type.startsWith('startup')) {
      startupList.push(rem);
    } else {
      const trig = new Date(rem.trigger);
      if (trig <= todayEnd) {
        todayList.push(rem);
      } else if (trig <= tomorrowEnd) {
        tomorrowList.push(rem);
      } else {
        upcomingList.push(rem);
      }
    }
  });
  
  // Sort lists chronologically
  todayList.sort((a,b) => new Date(a.trigger) - new Date(b.trigger));
  tomorrowList.sort((a,b) => new Date(a.trigger) - new Date(b.trigger));
  upcomingList.sort((a,b) => new Date(a.trigger) - new Date(b.trigger));
  
  // Timeline building
  if (active.length === 0 && completed.length === 0) {
    container.innerHTML = `<div class="empty-state">No reminders set. Click Add to create alerts.</div>`;
    return;
  }
  
  // 1. TODAY
  if (todayList.length > 0) {
    renderTimelineGroup(container, 'TODAY', todayList);
  }
  
  // 2. TOMORROW
  if (tomorrowList.length > 0) {
    renderTimelineGroup(container, 'TOMORROW', tomorrowList);
  }
  
  // 3. UPCOMING
  if (upcomingList.length > 0) {
    renderTimelineGroup(container, 'UPCOMING', upcomingList);
  }
  
  // 4. STARTUP
  if (startupList.length > 0) {
    renderTimelineGroup(container, 'STARTUP', startupList);
  }
  
  // 5. HISTORY (completed)
  if (completed.length > 0) {
    const sortedHistory = [...completed].sort((a,b) => new Date(b.trigger) - new Date(a.trigger)).slice(0, 5);
    renderTimelineGroup(container, 'HISTORY (RECENT)', sortedHistory, true);
  }
  
  window.Icons.renderIcons();
}

function renderTimelineGroup(container, title, list, isHistory = false) {
  const group = document.createElement('div');
  group.className = 'timeline-group';
  
  const header = document.createElement('h2');
  header.textContent = title;
  group.appendChild(header);
  
  list.forEach(rem => {
    const row = document.createElement('div');
    row.className = 'reminder-row';
    
    let timeText = 'Startup';
    if (rem.type === 'time') {
      const d = new Date(rem.trigger);
      timeText = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (title === 'UPCOMING' || isHistory) {
        timeText = d.toLocaleDateString([], {month:'short', day:'numeric'}) + ' ' + timeText;
      }
    }
    
    let actionsHtml = '';
    if (!isHistory) {
      actionsHtml = `
        <div class="reminder-actions">
          <button class="reminder-btn" onclick="dismissReminder('${rem.id}')">Dismiss</button>
          <button class="reminder-btn" onclick="snoozeReminder('${rem.id}')">Snooze</button>
        </div>
      `;
    } else {
      actionsHtml = `<span style="font-size:11px; color:var(--color-text-muted);">✓ Actioned</span>`;
    }
    
    row.innerHTML = `
      <div class="reminder-row-time">${timeText}</div>
      <div class="reminder-row-msg">${rem.message}</div>
      ${actionsHtml}
    `;
    group.appendChild(row);
  });
  
  container.appendChild(group);
}

function handleReminderSubmit(e) {
  e.preventDefault();
  const message = document.getElementById('rem-msg').value.trim();
  const type = document.getElementById('rem-type').value;
  const trigger = document.getElementById('rem-time').value || null;
  
  const reminder = {
    id: 'rem-' + Date.now(),
    message,
    type,
    trigger: type.startsWith('startup') ? null : trigger,
    completed: false,
    linkedTaskId: null
  };
  
  DB.reminders.push(reminder);
  saveDatabase();
  closeModal('reminder-modal-backdrop');
  renderAll();
  logToConsole(`Reminder set: ${message}`, 'success');
}

function dismissReminder(id) {
  const rem = DB.reminders.find(r => r.id === id);
  if (rem) {
    rem.completed = true;
    saveDatabase();
    renderAll();
    logToConsole(`Reminder dismissed: ${rem.message}`, 'info');
  }
}

function snoozeReminder(id) {
  const rem = DB.reminders.find(r => r.id === id);
  if (rem && rem.type === 'time') {
    // Snooze default: add 10 minutes
    const originalTime = new Date(rem.trigger);
    const newTime = new Date(originalTime.getTime() + (10 * 60 * 1000));
    
    rem.trigger = newTime.toISOString();
    saveDatabase();
    renderAll();
    logToConsole(`Reminder snoozed for 10m: ${rem.message}`, 'info');
  }
}

// Startup alerts runner
function checkStartupReminders() {
  const startupAlerts = DB.reminders.filter(r => !r.completed && r.type.startsWith('startup'));
  if (startupAlerts.length > 0) {
    startupAlerts.forEach(rem => {
      // Trigger a native notification
      window.api.showNotification('Startup Reminder', rem.message, rem.id);
      
      // If one-shot next startup, clear it
      if (rem.type === 'startup-next') {
        rem.completed = true;
      }
    });
    saveDatabase();
  }
}

// Background scheduler checker (poller for standard timed reminders)
setInterval(() => {
  const now = new Date();
  let changed = false;
  
  DB.reminders.filter(r => !r.completed && r.type === 'time').forEach(rem => {
    const triggerTime = new Date(rem.trigger);
    if (triggerTime <= now) {
      // Alarm!
      window.api.showNotification('Reminder Triggered', rem.message, rem.id);
      rem.completed = true;
      changed = true;
      logToConsole(`🔔 Alarm triggered: ${rem.message}`, 'info');
    }
  });
  
  if (changed) {
    saveDatabase();
    renderAll();
  }
}, 5000); // Check every 5 seconds

// -------------------------------------------------------------
// SETTINGS LOGIC & BACKUPS
// -------------------------------------------------------------
function renderSettingsUI() {
  const greetingInput = document.getElementById('setting-greeting');
  greetingInput.value = DB.settings.personalizedGreeting || '';
  
  const closeTray = DB.settings.closeToTray !== false;
  document.getElementById('setting-close-tray').checked = closeTray;

  const startMin = DB.settings.startMinimized || false;
  document.getElementById('setting-start-min').checked = startMin;

  const quietHours = DB.settings.quietHours || { enabled: false, start: '23:00', end: '07:00' };
  document.getElementById('setting-quiet-enabled').checked = quietHours.enabled;
  document.getElementById('quiet-hours-range').style.display = quietHours.enabled ? 'grid' : 'none';
  document.getElementById('setting-quiet-start').value = quietHours.start;
  document.getElementById('setting-quiet-end').value = quietHours.end;
  
  // Load shortcuts labels
  const shortcuts = DB.settings.shortcuts || {
    commandCenter: 'Ctrl+Space',
    console: 'Shift+`',
    quickNote: 'Ctrl+Shift+Z'
  };
  document.getElementById('shortcut-palette').value = shortcuts.commandCenter;
  document.getElementById('shortcut-note').value = shortcuts.quickNote;
  document.getElementById('shortcut-console').value = shortcuts.console;
}

async function toggleRestoreBackupsPanel() {
  const panel = document.getElementById('restore-backups-list');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    
    // Fetch list backups
    const container = document.getElementById('backups-items-container');
    container.innerHTML = `<div style="font-size:12px; color:var(--color-text-muted);">Scanning backups...</div>`;
    
    try {
      const backupsDir = await window.api.dbGetBackupsDir();
      container.innerHTML = '';
      
      // Electron database.js shifting handles rotating backup naming (backup_0.json is latest)
      // Check backups availability
      for (let i = 0; i < 5; i++) {
        const item = document.createElement('div');
        item.className = 'reminder-row';
        item.style.cursor = 'pointer';
        item.innerHTML = `
          <div class="reminder-row-time">Slot ${i}</div>
          <div class="reminder-row-msg" style="color:var(--color-text-secondary);">Rotational Backup Slot #${i} (backup_${i}.json)</div>
          <button class="reminder-btn" onclick="restoreBackupSlot(${i})">Restore</button>
        `;
        container.appendChild(item);
      }
    } catch (e) {
      container.innerHTML = `<div style="color:var(--color-console-error); font-size:12px;">Failed scanning backups directory.</div>`;
    }
  } else {
    panel.style.display = 'none';
  }
}

async function restoreBackupSlot(index) {
  if (confirm(`Are you sure you want to RESTORE Slot #${index}?\nThis will overwrite your current active database.`)) {
    try {
      DB = await window.api.dbRestoreBackup(index);
      renderAll();
      alert(`Database successfully restored to slot #${index}!`);
      logToConsole(`Database restored to slot #${index}`, 'success');
    } catch (e) {
      alert(`Failed to restore backup slot ${index}.\nIt may not exist yet.`);
    }
  }
}

// -------------------------------------------------------------
// PERSONALIZED CONSOLE LOGIC
// -------------------------------------------------------------
function toggleConsoleDrawer() {
  const panel = document.getElementById('console-panel');
  panel.classList.toggle('active');
  if (panel.classList.contains('active')) {
    setTimeout(() => document.getElementById('console-input').focus(), 100);
  }
}

function closeConsoleDrawer() {
  document.getElementById('console-panel').classList.remove('active');
}

function logToConsole(text, type = '') {
  const output = document.getElementById('console-output');
  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

// -------------------------------------------------------------
// COMMAND REGISTRY (single source of truth for dispatch,
// autocomplete, and /help). Add a command here and it is wired
// into all three automatically.
// -------------------------------------------------------------
const COMMANDS = [
  {
    name: '/open', args: '<name>', group: 'Navigation',
    summary: 'Open file, folder, link, or app',
    detail: 'OPEN RESOURCE\nOpens a registered file/folder/URL in your default app.\nUsage: /open <resource_name>',
    run: (a) => executeOpen(a),
    complete: (p) => DB.resources
      .filter(r => r.name.toLowerCase().startsWith(p.toLowerCase()))
      .map(r => `"${r.name}"`)
  },
  {
    name: '/search', aliases: ['/s'], args: '<query>', group: 'Navigation',
    summary: 'Query across index',
    detail: 'SEARCH\nSearches across resources, tags, tasks, and notes.\nUsage: /search <query>',
    run: (a) => executeSearch(a)
  },
  {
    name: '/recent', args: '', group: 'Navigation',
    summary: 'Display recently loaded targets',
    run: () => {
      logToConsole('RECENTLY OPENED RESOURCES:', 'info');
      const recent = [...DB.resources].filter(r => r.lastOpened).sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened)).slice(0, 5);
      if (recent.length === 0) logToConsole('  No history found.', 'info');
      recent.forEach(r => logToConsole(`  ${r.name} (${r.type})`, ''));
    }
  },
  {
    name: '/tasks', args: '', group: 'Tasks & Notes',
    summary: "List today's pending tasks",
    run: () => {
      logToConsole('TODAY\'S ACTIVE TASKS:', 'info');
      const activeTasks = DB.tasks.filter(t => !t.completed);
      if (activeTasks.length === 0) logToConsole('  Nothing waiting for you.', 'success');
      activeTasks.forEach(t => logToConsole(`  ○ [${t.priority}] ${t.title} (${t.project || 'General'})`, ''));
    }
  },
  {
    name: '/addtask', aliases: ['/at'], args: '<title> [project <name>]', group: 'Tasks & Notes',
    summary: 'Create task inline',
    detail: 'ADD TASK\nCreates a task.\nUsage: /addtask <title> [project <name>]',
    run: (a) => executeAddTask(a)
  },
  {
    name: '/donetask', args: '<task_title>', group: 'Tasks & Notes',
    summary: 'Resolve/complete task',
    detail: 'COMPLETE TASK\nMarks a task completed.\nUsage: /donetask <task_title>',
    run: (a) => executeDoneTask(a),
    complete: (p) => DB.tasks
      .filter(t => !t.completed && t.title.toLowerCase().startsWith(p.toLowerCase()))
      .map(t => `"${t.title}"`)
  },
  {
    name: '/notes', args: '', group: 'Tasks & Notes',
    summary: 'List notes index',
    run: () => {
      logToConsole('RECENT NOTES:', 'info');
      const notes = DB.notes || [];
      notes.slice(0, 5).forEach(n => logToConsole(`  📝 ${n.title}`, ''));
    }
  },
  {
    name: '/note', args: '[title]', group: 'Tasks & Notes',
    summary: 'Create or open a note document',
    detail: 'OPEN NOTE\nOpens note by title or creates one.\nUsage: /note [title]',
    run: (a) => executeNote(a),
    complete: (p) => (DB.notes || [])
      .filter(n => n.title.toLowerCase().startsWith(p.toLowerCase()))
      .map(n => `"${n.title}"`)
  },
  {
    name: '/reminders', args: '', group: 'Reminders & Settings',
    summary: 'Display upcoming alerts',
    run: () => {
      logToConsole('UPCOMING REMINDERS:', 'info');
      DB.reminders.filter(r => !r.completed).forEach(r => {
        const sched = r.type === 'time' ? new Date(r.trigger).toLocaleString() : 'Startup';
        logToConsole(`  🔔 ${r.message} (${sched})`, '');
      });
    }
  },
  {
    name: '/setreminder', args: '<message> <today|tomorrow|startup|HH:MM|YYYY-MM-DD [HH:MM]>', group: 'Reminders & Settings',
    summary: 'Schedule alerts',
    detail: 'SET REMINDER\nSets a reminder. Quote the message if it has spaces.\nUsage: /setreminder "<message>" <today|tomorrow|startup|HH:MM|YYYY-MM-DD [HH:MM]>',
    run: (a) => executeSetReminder(a)
  },
  {
    name: '/clear', args: '', group: 'Reminders & Settings',
    summary: 'Clear terminal outputs',
    run: () => { document.getElementById('console-output').innerHTML = ''; }
  },
  {
    name: '/history', args: '', group: 'Reminders & Settings',
    summary: 'Show recent command history',
    run: () => {
      logToConsole('COMMAND HISTORY:', 'info');
      (DB.history || []).slice(-10).forEach(h => logToConsole(`  ${h.command}`, ''));
    }
  },
  {
    name: '/settings', args: '', group: 'Reminders & Settings',
    summary: 'Route to settings configuration',
    run: () => { switchView('settings'); logToConsole('Switched to Settings.', 'success'); }
  },
  {
    name: '/help', args: '[command]', group: 'Reminders & Settings',
    summary: 'Show command overview or detail',
    run: (a) => executeHelp(a)
  }
];

// name/alias -> command object
const COMMAND_BY_NAME = {};
COMMANDS.forEach(c => {
  COMMAND_BY_NAME[c.name] = c;
  (c.aliases || []).forEach(a => { COMMAND_BY_NAME[a] = c; });
});
// Flat list of all invokable tokens (names + aliases) for autocomplete
const ALL_COMMANDS = Object.keys(COMMAND_BY_NAME);

// Levenshtein edit distance for typo-tolerant "did you mean"
function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

// Nearest command name to a mistyped token (within a small distance)
function closestCommand(cmd) {
  let best = null, bestDist = Infinity;
  ALL_COMMANDS.forEach(name => {
    const d = editDistance(cmd, name);
    if (d < bestDist) { bestDist = d; best = name; }
  });
  return bestDist <= 3 ? best : null;
}

// Tab-cycle state
let tabMatches = [];
let tabIndex = -1;

function handleConsoleInput(e) {
  const input = e.target;
  const val = input.value.trim();

  // 1. Enter Execution
  if (e.key === 'Enter') {
    if (!val) return;
    
    // Log user command
    logToConsole(`> ${input.value}`, 'user-cmd');
    
    // Add to history (skip consecutive duplicates, cap at 200 entries)
    DB.history = DB.history || [];
    const last = DB.history[DB.history.length - 1];
    if (!last || last.command !== input.value) {
      DB.history.push({ timestamp: new Date().toISOString(), command: input.value });
      if (DB.history.length > 200) DB.history = DB.history.slice(-200);
      saveDatabase();
    }
    consoleHistory = DB.history.map(h => h.command);
    consoleHistoryIndex = -1;
    
    // Execute command
    executeCommand(input.value);
    input.value = '';
    return;
  }

  // 2. History Navigation Up/Down
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (consoleHistory.length === 0) return;
    if (consoleHistoryIndex === -1) {
      consoleHistoryIndex = consoleHistory.length - 1;
    } else if (consoleHistoryIndex > 0) {
      consoleHistoryIndex--;
    }
    input.value = consoleHistory[consoleHistoryIndex];
    return;
  }
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (consoleHistory.length === 0) return;
    if (consoleHistoryIndex !== -1 && consoleHistoryIndex < consoleHistory.length - 1) {
      consoleHistoryIndex++;
      input.value = consoleHistory[consoleHistoryIndex];
    } else {
      consoleHistoryIndex = -1;
      input.value = '';
    }
    return;
  }

  // 3. Autocomplete (Tab) — cycles through matches on repeated presses
  if (e.key === 'Tab') {
    e.preventDefault();
    const parts = input.value.split(' ');

    // Continue an active cycle if the field still shows the last suggestion
    if (tabMatches.length > 0 && input.value === tabMatches[tabIndex]) {
      tabIndex = (tabIndex + 1) % tabMatches.length;
      input.value = tabMatches[tabIndex];
      return;
    }

    let matches = [];
    if (parts.length === 1 && parts[0].startsWith('/')) {
      // Command-name completion (names + aliases)
      const prefix = parts[0].toLowerCase();
      matches = ALL_COMMANDS.filter(c => c.startsWith(prefix));
    } else if (parts[0].startsWith('/')) {
      // Argument completion, delegated to the command's own completer
      const entry = COMMAND_BY_NAME[parts[0].toLowerCase()];
      if (entry && entry.complete) {
        const argPrefix = parts.slice(1).join(' ').replace(/^"|"$/g, '');
        matches = entry.complete(argPrefix).map(s => `${entry.name} ${s}`);
      }
    }

    if (matches.length > 0) {
      tabMatches = matches;
      tabIndex = 0;
      input.value = matches[0];
    } else {
      tabMatches = [];
      tabIndex = -1;
    }
    return;
  }

  // Any other key ends an active Tab cycle
  tabMatches = [];
  tabIndex = -1;
}

function executeCommand(inputStr) {
  const parts = inputStr.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const rawArgs = inputStr.trim().substring(parts[0].length).trim();

  // Non-command strings default to search
  if (!cmd.startsWith('/')) {
    executeSearch(inputStr.trim());
    return;
  }

  const entry = COMMAND_BY_NAME[cmd];
  if (entry) {
    entry.run(rawArgs);
    return;
  }

  // Unknown command — offer the closest match
  logToConsole(`Unknown command: ${cmd}`, 'error');
  const suggestion = closestCommand(cmd);
  if (suggestion) {
    logToConsole(`Did you mean: ${suggestion} ?`, 'interactive');
  }
  logToConsole('Type /help for instructions.', 'info');
}

// Subcommands executers
function executeHelp(arg) {
  if (arg) {
    const lookup = '/' + arg.toLowerCase().replace(/^\//, '');
    const entry = COMMAND_BY_NAME[lookup];
    if (entry) {
      logToConsole(entry.detail || `${entry.name} ${entry.args}\n${entry.summary}`.trim(), 'welcome');
    } else {
      logToConsole(`No detailed help for: ${arg}`, 'error');
    }
    return;
  }

  logToConsole('COMMAND OVERVIEW:', 'welcome');
  const groups = [];
  COMMANDS.forEach(c => {
    if (!groups.includes(c.group)) groups.push(c.group);
  });
  groups.forEach(group => {
    logToConsole(`  ${group}:`, 'welcome');
    COMMANDS.filter(c => c.group === group).forEach(c => {
      const label = `${c.name} ${c.args}`.trim().padEnd(24);
      logToConsole(`    ${label} - ${c.summary}`, '');
    });
  });
  logToConsole('Type "/help <command>" for detailed arguments.', 'info');
}

function executeOpen(arg) {
  if (!arg) {
    logToConsole('Error: /open expects a resource name. Usage: /open <name>', 'error');
    return;
  }
  
  // Clean double quotes if passed (e.g. /open "DBMS Project")
  const targetName = arg.replace(/^"|"$/g, '').trim().toLowerCase();
  
  const res = DB.resources.find(r => r.name.toLowerCase() === targetName);
  if (res) {
    openResource(res);
  } else {
    logToConsole(`Resource "${arg}" was not found.`, 'error');
    const matches = DB.resources.filter(r => r.name.toLowerCase().startsWith(targetName.substring(0, 4)));
    if (matches.length > 0) {
      logToConsole(`Did you mean:\n  /open "${matches[0].name}"`, 'interactive');
    }
  }
}

function executeSearch(query) {
  if (!query) {
    logToConsole('Usage: /search <query>', 'info');
    return;
  }
  
  logToConsole(`Searching for "${query}"...`, 'info');
  const term = query.toLowerCase();
  
  const files = DB.resources.filter(r => r.name.toLowerCase().includes(term) || (r.target && r.target.toLowerCase().includes(term)));
  const tasks = DB.tasks.filter(t => t.title.toLowerCase().includes(term) || (t.description && t.description.toLowerCase().includes(term)));
  const notes = DB.notes.filter(n => n.title.toLowerCase().includes(term) || (n.content && n.content.toLowerCase().includes(term)));
  const reminders = DB.reminders.filter(r => r.message.toLowerCase().includes(term));
  
  let totalFound = 0;
  
  if (files.length > 0) {
    logToConsole('FILES & RESOURCES:', 'welcome');
    files.forEach(f => logToConsole(`  ${f.name} (${f.type}) -> /open "${f.name}"`, ''));
    totalFound += files.length;
  }
  if (tasks.length > 0) {
    logToConsole('TASKS:', 'welcome');
    tasks.forEach(t => logToConsole(`  [${t.completed ? '✓' : '○'}] ${t.title} (${t.project || 'General'})`, ''));
    totalFound += tasks.length;
  }
  if (notes.length > 0) {
    logToConsole('NOTES:', 'welcome');
    notes.forEach(n => logToConsole(`  📝 ${n.title}`, ''));
    totalFound += notes.length;
  }
  if (reminders.length > 0) {
    logToConsole('REMINDERS:', 'welcome');
    reminders.forEach(r => logToConsole(`  🔔 ${r.message}`, ''));
    totalFound += reminders.length;
  }
  
  if (totalFound === 0) {
    logToConsole('No matching items found.', 'error');
  }
}

function executeAddTask(arg) {
  if (!arg) {
    logToConsole('Error: /addtask expects task text. Usage: /addtask <title> [project <project>]', 'error');
    return;
  }
  
  // Basic parsing for project parameter
  let title = arg;
  let project = '';
  
  const projIdx = arg.toLowerCase().indexOf('project ');
  if (projIdx !== -1) {
    title = arg.substring(0, projIdx).trim();
    project = arg.substring(projIdx + 8).replace(/^"|"$/g, '').trim();
  }
  
  const task = {
    id: 'task-' + Date.now(),
    title,
    description: '',
    dueDate: null,
    priority: 'normal',
    project,
    completed: false,
    completedAt: null,
    linkedResources: [],
    linkedNotes: []
  };
  
  DB.tasks.push(task);
  saveDatabase();
  renderAll();
  logToConsole('✓ Task created successfully', 'success');
  logToConsole(`  Title: ${title}`, '');
  if (project) logToConsole(`  Project: ${project}`, '');
}

function executeDoneTask(arg) {
  if (!arg) {
    logToConsole('Usage: /donetask <task_title>', 'info');
    return;
  }
  const term = arg.trim().replace(/^"|"$/g, '').toLowerCase();
  const matches = DB.tasks.filter(t => !t.completed && t.title.toLowerCase().includes(term));

  if (matches.length === 0) {
    logToConsole(`No pending task matches title: ${arg}`, 'error');
  } else if (matches.length === 1) {
    completeTask(matches[0].id);
  } else {
    logToConsole(`Multiple pending tasks match "${arg}". Be more specific:`, 'interactive');
    matches.forEach(t => logToConsole(`  ○ ${t.title} (${t.project || 'General'})`, ''));
  }
}

function executeNote(arg) {
  const noteTitle = arg ? arg.replace(/^"|"$/g, '').trim() : '';
  switchView('notes');
  
  if (!noteTitle) {
    createNewNote();
    return;
  }
  
  const note = DB.notes.find(n => n.title.toLowerCase() === noteTitle.toLowerCase());
  if (note) {
    selectNote(note.id);
    logToConsole(`Opened Note: ${note.title}`, 'success');
  } else {
    // Create new with this title
    const newNote = {
      id: 'note-' + Date.now(),
      title: noteTitle,
      content: '',
      modifiedAt: new Date().toISOString(),
      linkedResources: [],
      linkedTasks: []
    };
    DB.notes.push(newNote);
    saveDatabase();
    selectedNoteId = newNote.id;
    renderNotesItems();
    selectNote(newNote.id);
    logToConsole(`Note created: ${noteTitle}`, 'success');
  }
}

function executeSetReminder(arg) {
  if (!arg) {
    logToConsole('Usage: /setreminder <message> <tomorrow|startup|YYYY-MM-DD HH:MM>', 'info');
    return;
  }
  
  // Parse message inside quotes, or split
  let msg = '';
  let schedPart = '';
  
  if (arg.startsWith('"')) {
    const nextQuote = arg.indexOf('"', 1);
    if (nextQuote !== -1) {
      msg = arg.substring(1, nextQuote).trim();
      schedPart = arg.substring(nextQuote + 1).trim();
    }
  } else {
    // split last word as schedule if not quoted
    const idx = arg.lastIndexOf(' ');
    if (idx !== -1) {
      msg = arg.substring(0, idx).trim();
      schedPart = arg.substring(idx + 1).trim();
    }
  }
  
  if (!msg || !schedPart) {
    logToConsole('Invalid parameters. Type /help setreminder for docs.', 'error');
    return;
  }
  
  const triggerType = schedPart.toLowerCase();

  let type = 'time';
  let trigger = null;

  if (triggerType === 'startup') {
    type = 'startup-every';
  } else if (triggerType === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0); // 8 AM tomorrow
    trigger = d.toISOString();
  } else if (triggerType === 'today') {
    const d = new Date();
    d.setHours(8, 0, 0, 0); // 8 AM today
    trigger = d.toISOString();
  } else if (/^\d{1,2}:\d{2}$/.test(schedPart)) {
    // Bare HH:MM -> today at that time, or tomorrow if already past
    const [h, m] = schedPart.split(':').map(Number);
    if (h > 23 || m > 59) {
      logToConsole(`Invalid time: ${schedPart}. Hours 0-23, minutes 0-59.`, 'error');
      return;
    }
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    trigger = d.toISOString();
  } else {
    // Full date (optionally with time), e.g. YYYY-MM-DD or YYYY-MM-DD HH:MM
    const d = new Date(schedPart);
    if (isNaN(d.getTime())) {
      logToConsole(`Invalid time: ${schedPart}. Expected: today, tomorrow, startup, HH:MM, or YYYY-MM-DD [HH:MM]`, 'error');
      return;
    }
    trigger = d.toISOString();
  }
  
  const reminder = {
    id: 'rem-' + Date.now(),
    message: msg,
    type,
    trigger,
    completed: false,
    linkedTaskId: null
  };
  
  DB.reminders.push(reminder);
  saveDatabase();
  renderAll();
  logToConsole('✓ Reminder created successfully', 'success');
}

// -------------------------------------------------------------
// PALETTE OVERLAY LOGIC
// -------------------------------------------------------------
function handlePaletteQuery() {
  const container = document.getElementById('palette-results');
  container.innerHTML = '';
  
  const query = document.getElementById('palette-input').value.trim().toLowerCase();
  
  let files = DB.resources;
  let tasks = DB.tasks.filter(t => !t.completed);
  let notes = DB.notes || [];
  
  if (query) {
    files = files.filter(f => f.name.toLowerCase().includes(query));
    tasks = tasks.filter(t => t.title.toLowerCase().includes(query));
    notes = notes.filter(n => n.title.toLowerCase().includes(query));
  } else {
    // Show default recent items
    files = files.slice(0, 3);
    tasks = tasks.slice(0, 3);
    notes = notes.slice(0, 3);
  }
  
  let selectedSet = false;
  
  // 1. Files / Resources
  if (files.length > 0) {
    const head = document.createElement('div');
    head.className = 'palette-group-title';
    head.textContent = 'Files & Resources';
    container.appendChild(head);
    
    files.forEach(f => {
      const item = document.createElement('div');
      item.className = 'palette-result-item';
      if (!selectedSet) { item.classList.add('selected'); selectedSet = true; }
      item.innerHTML = `<span data-icon="${f.type || 'file'}"></span> <span>${f.name}</span>`;
      item.addEventListener('click', () => {
        closeModal('palette-backdrop');
        openResource(f);
      });
      container.appendChild(item);
    });
  }
  
  // 2. Tasks
  if (tasks.length > 0) {
    const head = document.createElement('div');
    head.className = 'palette-group-title';
    head.textContent = 'Tasks';
    container.appendChild(head);
    
    tasks.forEach(t => {
      const item = document.createElement('div');
      item.className = 'palette-result-item';
      if (!selectedSet) { item.classList.add('selected'); selectedSet = true; }
      item.innerHTML = `<span data-icon="tasks"></span> <span>${t.title}</span>`;
      item.addEventListener('click', () => {
        closeModal('palette-backdrop');
        switchView('tasks');
        showTaskDetails(t.id);
      });
      container.appendChild(item);
    });
  }

  // 3. Notes
  if (notes.length > 0) {
    const head = document.createElement('div');
    head.className = 'palette-group-title';
    head.textContent = 'Notes';
    container.appendChild(head);
    
    notes.forEach(n => {
      const item = document.createElement('div');
      item.className = 'palette-result-item';
      if (!selectedSet) { item.classList.add('selected'); selectedSet = true; }
      item.innerHTML = `<span data-icon="notes"></span> <span>${n.title}</span>`;
      item.addEventListener('click', () => {
        closeModal('palette-backdrop');
        switchView('notes');
        selectNote(n.id);
      });
      container.appendChild(item);
    });
  }
  
  if (!selectedSet) {
    container.innerHTML = `<div style="text-align:center; padding: 24px; font-size:12px; color:var(--color-text-muted);">No matching resources found.</div>`;
  }
  
  window.Icons.renderIcons();
}

function handlePaletteKeydowns(e) {
  // Arrow navigate results inside Command Palette
  const items = document.querySelectorAll('.palette-result-item');
  if (items.length === 0) return;
  
  let activeIndex = -1;
  items.forEach((item, idx) => {
    if (item.classList.contains('selected')) activeIndex = idx;
  });
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (activeIndex !== -1) items[activeIndex].classList.remove('selected');
    activeIndex = (activeIndex + 1) % items.length;
    items[activeIndex].classList.add('selected');
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (activeIndex !== -1) items[activeIndex].classList.remove('selected');
    activeIndex = (activeIndex - 1 + items.length) % items.length;
    items[activeIndex].classList.add('selected');
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeIndex !== -1) {
      items[activeIndex].click();
    }
  } else if (e.key === 'Escape') {
    closeModal('palette-backdrop');
  }
}

// Global window event triggers for Palette closing / shortcuts
window.addEventListener('keydown', e => {
  // Distraction free escape
  if (e.key === 'Escape') {
    closeDetailPanel();
    document.body.classList.remove('focus-mode');
    document.getElementById('btn-toggle-focus').textContent = "Focus";
    closeConsoleDrawer();
  }
  
  // Note edit focus mode shortcut: Ctrl+Shift+Enter
  if (e.key === 'Enter' && e.ctrlKey && e.shiftKey) {
    if (activeView === 'notes') {
      e.preventDefault();
      toggleFocusMode();
    }
  }
});

// Run Init
window.onload = init;
