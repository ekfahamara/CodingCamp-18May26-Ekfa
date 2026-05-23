/* ============================================================
   Life Dashboard — app.js
   Vanilla JS · Local Storage · No dependencies
   ============================================================ */

'use strict';

/* ── Utility helpers ─────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

/** Zero-pad a number to 2 digits */
function pad(n) {
  return String(n).padStart(2, '0');
}

/** Clamp a number between min and max */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/* ============================================================
   TOAST — lightweight notification
   ============================================================ */

(function initToast() {
  const el = $('toast');
  let timer = null;

  /**
   * Show a toast message.
   * @param {string} msg
   * @param {'success'|'error'|''} type
   * @param {number} duration  ms
   */
  window.showToast = function (msg, type = '', duration = 2800) {
    el.textContent = msg;
    el.className   = 'toast' + (type ? ` toast-${type}` : '');
    // Force reflow so re-triggering same message still animates
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('show'), duration);
  };
})();

/* ============================================================
   1. THEME — light / dark toggle, persisted in localStorage
   ============================================================ */

(function initTheme() {
  const STORAGE_KEY = 'dashboard_theme';
  const toggleBtn   = $('theme-toggle');
  const html        = document.documentElement;

  /** Apply theme and update button icon */
  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    toggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }

  // Load saved preference, default to dark
  const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
  applyTheme(saved);

  toggleBtn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });
})();

/* ============================================================
   2. GREETING — clock, date, personalised greeting
   ============================================================ */

(function initGreeting() {
  const STORAGE_KEY  = 'dashboard_name';
  const timeEl       = $('current-time');
  const dateEl       = $('current-date');
  const greetEl      = $('greeting-text');
  const nameDisplay  = $('name-display');
  const nameEditBtn  = $('name-edit-btn');
  const nameForm     = $('name-form');
  const nameInput    = $('name-input');
  const nameCancel   = $('name-cancel');

  const GREETINGS = [
    { from:  0, to:  5,  text: 'Burning the midnight oil 🌙' },
    { from:  5, to: 12,  text: 'Good morning ☀️' },
    { from: 12, to: 17,  text: 'Good afternoon 🌤️' },
    { from: 17, to: 21,  text: 'Good evening 🌆' },
    { from: 21, to: 24,  text: 'Good night 🌙' },
  ];

  let userName = localStorage.getItem(STORAGE_KEY) || '';

  /** Build greeting string, optionally with name */
  function greetingText(hour) {
    const match = GREETINGS.find((g) => hour >= g.from && hour < g.to);
    const base  = match ? match.text : 'Hello!';
    if (!userName) return base;
    // Insert name before emoji: "Good morning, Alex ☀️"
    return base.replace(/([\u{1F300}-\u{1FFFF}]|\s*$)/u, `, ${userName} $1`);
  }

  /** Update name display below clock */
  function renderName() {
    if (userName) {
      nameDisplay.textContent = `👤 ${userName}`;
      nameEditBtn.title = 'Change name';
    } else {
      nameDisplay.textContent = 'Set your name';
      nameEditBtn.title = 'Add your name';
    }
  }

  /** Clock tick — runs every second */
  function tick() {
    const now = new Date();
    const h   = now.getHours();
    const m   = now.getMinutes();
    const s   = now.getSeconds();

    timeEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    greetEl.textContent = greetingText(h);
  }

  /* ── Name edit UI ── */
  nameEditBtn.addEventListener('click', () => {
    nameInput.value = userName;
    nameForm.hidden = false;
    nameInput.focus();
    nameInput.select();
  });

  nameCancel.addEventListener('click', () => {
    nameForm.hidden = true;
  });

  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    userName = nameInput.value.trim();
    localStorage.setItem(STORAGE_KEY, userName);
    nameForm.hidden = true;
    renderName();
    tick(); // refresh greeting immediately
  });

  /* ── Init ── */
  renderName();
  tick();
  setInterval(tick, 1000);
})();

/* ============================================================
   3. FOCUS TIMER — customisable Pomodoro with 3 modes
   ============================================================ */

(function initTimer() {
  const STORAGE_KEY = 'dashboard_timer_settings';

  /* Default durations in minutes */
  const DEFAULTS = { focus: 25, 'short-break': 5, 'long-break': 15 };

  const displayEl    = $('timer-display');
  const labelEl      = $('timer-label');
  const startBtn     = $('timer-start');
  const stopBtn      = $('timer-stop');
  const resetBtn     = $('timer-reset');
  const settingsBtn  = $('timer-settings-btn');
  const settingsPanel= $('timer-settings');
  const setFocus     = $('set-focus');
  const setShort     = $('set-short-break');
  const setLong      = $('set-long-break');
  const saveSettings = $('settings-save');
  const cancelSettings=$('settings-cancel');
  const tabs         = document.querySelectorAll('.timer-tab');

  let durations  = { ...DEFAULTS };   // active durations (minutes)
  let mode       = 'focus';           // current mode key
  let remaining  = 0;                 // seconds left
  let intervalId = null;
  let running    = false;

  /* ── Load saved settings ── */
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) durations = { ...DEFAULTS, ...saved };
    } catch { /* ignore */ }
  }

  function saveSettingsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(durations));
  }

  /** Seconds for current mode */
  function totalSeconds() {
    return durations[mode] * 60;
  }

  /* ── Render display ── */
  function render() {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    displayEl.textContent = `${pad(m)}:${pad(s)}`;

    displayEl.classList.toggle('running', running);
    displayEl.classList.toggle('done',    remaining === 0 && !running);

    startBtn.disabled = running || remaining === 0;
    stopBtn.disabled  = !running;
  }

  /** Switch to a mode and reset timer */
  function setMode(newMode) {
    if (running) {
      clearInterval(intervalId);
      running = false;
    }
    mode      = newMode;
    remaining = totalSeconds();
    labelEl.textContent = 'Ready to focus?';

    // Update tab active state
    tabs.forEach((t) => {
      const isActive = t.dataset.mode === mode;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });

    render();
  }

  /* ── Tick ── */
  function tick() {
    if (remaining <= 0) {
      clearInterval(intervalId);
      running = false;
      labelEl.textContent = '🎉 Session complete! Take a break.';
      render();
      return;
    }
    remaining--;
    render();
  }

  /* ── Controls ── */
  startBtn.addEventListener('click', () => {
    if (running || remaining === 0) return;
    running    = true;
    labelEl.textContent = '⏳ Stay focused…';
    intervalId = setInterval(tick, 1000);
    render();
  });

  stopBtn.addEventListener('click', () => {
    if (!running) return;
    clearInterval(intervalId);
    running = false;
    labelEl.textContent = '⏸ Paused. Resume when ready.';
    render();
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(intervalId);
    running   = false;
    remaining = totalSeconds();
    labelEl.textContent = 'Ready to focus?';
    render();
  });

  /* ── Mode tabs ── */
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  /* ── Settings panel ── */
  settingsBtn.addEventListener('click', () => {
    // Populate inputs with current values
    setFocus.value = durations['focus'];
    setShort.value = durations['short-break'];
    setLong.value  = durations['long-break'];
    settingsPanel.hidden = !settingsPanel.hidden;
  });

  cancelSettings.addEventListener('click', () => {
    settingsPanel.hidden = true;
  });

  saveSettings.addEventListener('click', () => {
    // Validate: must be positive integers within allowed range
    const f = parseInt(setFocus.value, 10);
    const s = parseInt(setShort.value, 10);
    const l = parseInt(setLong.value,  10);

    if (isNaN(f) || isNaN(s) || isNaN(l) || f < 1 || s < 1 || l < 1) {
      showToast('All durations must be at least 1 minute.', 'error');
      return;
    }

    durations['focus']       = clamp(f, 1, 120);
    durations['short-break'] = clamp(s, 1, 60);
    durations['long-break']  = clamp(l, 1, 120);

    saveSettingsToStorage();
    settingsPanel.hidden = true;

    // Reset current mode with new duration
    setMode(mode);
    showToast('Timer settings saved ✓', 'success');
  });

  /* ── Init ── */
  loadSettings();
  setMode('focus');
})();

/* ============================================================
   4. TO-DO LIST — add, edit, delete, done, duplicate guard, sort
   ============================================================ */

(function initTodo() {
  const STORAGE_KEY      = 'dashboard_todos';
  const SORT_STORAGE_KEY = 'dashboard_todo_sort';

  const form       = $('todo-form');
  const input      = $('todo-input');
  const listEl     = $('todo-list');
  const emptyEl    = $('todo-empty');
  const sortSelect = $('sort-select');

  // Modal elements
  const overlay      = $('modal-overlay');
  const modalInput   = $('modal-input');
  const modalSave    = $('modal-save');
  const modalCancel  = $('modal-cancel');

  let tasks     = [];
  let editingId = null;

  /* ── Storage ── */
  function load() {
    try { tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { tasks = []; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  /* ── Duplicate check (case-insensitive) ── */
  function isDuplicate(text, excludeId = null) {
    const norm = text.trim().toLowerCase();
    return tasks.some((t) => t.id !== excludeId && t.text.toLowerCase() === norm);
  }

  /* ── Sort helper — returns sorted copy, never mutates tasks[] ── */
  function getSorted() {
    const order = sortSelect.value;
    const copy  = [...tasks];

    switch (order) {
      case 'newest':
        return copy.sort((a, b) => b.id - a.id);
      case 'oldest':
        return copy.sort((a, b) => a.id - b.id);
      case 'az':
        return copy.sort((a, b) => a.text.localeCompare(b.text));
      case 'za':
        return copy.sort((a, b) => b.text.localeCompare(a.text));
      case 'done-first':
        return copy.sort((a, b) => Number(b.done) - Number(a.done));
      case 'undone-first':
        return copy.sort((a, b) => Number(a.done) - Number(b.done));
      default:
        return copy;
    }
  }

  /* ── Render ── */
  function render() {
    listEl.innerHTML = '';
    const sorted = getSorted();

    if (sorted.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    sorted.forEach((task) => {
      const li = document.createElement('li');
      li.className  = `todo-item${task.done ? ' done' : ''}`;
      li.dataset.id = task.id;

      // Checkbox
      const cb = document.createElement('input');
      cb.type      = 'checkbox';
      cb.className = 'todo-checkbox';
      cb.checked   = task.done;
      cb.setAttribute('aria-label', `Mark "${task.text}" as done`);
      cb.addEventListener('change', () => toggleDone(task.id));

      // Text
      const span = document.createElement('span');
      span.className   = 'todo-text';
      span.textContent = task.text;

      // Action buttons
      const actions = document.createElement('div');
      actions.className = 'todo-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon';
      editBtn.title     = 'Edit task';
      editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => openEdit(task.id));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon';
      delBtn.title     = 'Delete task';
      delBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', () => deleteTask(task.id));

      actions.append(editBtn, delBtn);
      li.append(cb, span, actions);
      listEl.appendChild(li);
    });
  }

  /* ── CRUD ── */
  function addTask(text) {
    // Duplicate guard
    if (isDuplicate(text)) {
      showToast(`"${text.trim()}" already exists.`, 'error');
      return;
    }
    tasks.push({ id: Date.now(), text: text.trim(), done: false });
    save();
    render();
  }

  function toggleDone(id) {
    const task = tasks.find((t) => t.id === id);
    if (task) { task.done = !task.done; save(); render(); }
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    save();
    render();
  }

  /* ── Edit modal ── */
  function openEdit(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    editingId        = id;
    modalInput.value = task.text;
    overlay.hidden   = false;
    modalInput.focus();
    modalInput.select();
  }

  function closeModal() {
    overlay.hidden   = true;
    editingId        = null;
    modalInput.value = '';
  }

  function saveEdit() {
    const text = modalInput.value.trim();
    if (!text) return;

    // Duplicate guard — exclude the task being edited
    if (isDuplicate(text, editingId)) {
      showToast(`"${text}" already exists.`, 'error');
      return;
    }

    const task = tasks.find((t) => t.id === editingId);
    if (task) { task.text = text; save(); render(); }
    closeModal();
  }

  /* ── Events ── */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addTask(text);
    input.value = '';
    input.focus();
  });

  // Sort change — re-render immediately, persist preference
  sortSelect.addEventListener('change', () => {
    localStorage.setItem(SORT_STORAGE_KEY, sortSelect.value);
    render();
  });

  modalSave.addEventListener('click', saveEdit);
  modalCancel.addEventListener('click', closeModal);

  modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  saveEdit();
    if (e.key === 'Escape') closeModal();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  /* ── Init ── */
  load();
  // Restore saved sort preference
  const savedSort = localStorage.getItem(SORT_STORAGE_KEY);
  if (savedSort) sortSelect.value = savedSort;
  render();
})();

/* ============================================================
   5. QUICK LINKS — add, open, delete, persisted
   ============================================================ */

(function initLinks() {
  const STORAGE_KEY = 'dashboard_links';

  const form      = $('link-form');
  const nameInput = $('link-name');
  const urlInput  = $('link-url');
  const gridEl    = $('links-grid');
  const emptyEl   = $('links-empty');

  let links = [];

  /* ── Storage ── */
  function load() {
    try { links = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { links = []; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }

  /** Google favicon proxy */
  function faviconUrl(url) {
    try {
      const origin = new URL(url).origin;
      return `https://www.google.com/s2/favicons?sz=16&domain_url=${encodeURIComponent(origin)}`;
    } catch { return null; }
  }

  /* ── Render ── */
  function render() {
    gridEl.innerHTML = '';

    if (links.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    links.forEach((link) => {
      const chip = document.createElement('a');
      chip.className = 'link-chip';
      chip.href      = link.url;
      chip.target    = '_blank';
      chip.rel       = 'noopener noreferrer';
      chip.setAttribute('aria-label', `Open ${link.name}`);

      // Favicon
      const favicon = faviconUrl(link.url);
      if (favicon) {
        const img    = document.createElement('img');
        img.src      = favicon;
        img.width    = 14;
        img.height   = 14;
        img.alt      = '';
        img.style.borderRadius = '2px';
        img.onerror  = () => img.remove();
        chip.appendChild(img);
      }

      // Label
      const label       = document.createElement('span');
      label.textContent = link.name;
      chip.appendChild(label);

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.className   = 'link-delete';
      delBtn.title       = `Remove ${link.name}`;
      delBtn.setAttribute('aria-label', `Remove link: ${link.name}`);
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteLink(link.id);
      });

      chip.appendChild(delBtn);
      gridEl.appendChild(chip);
    });
  }

  /* ── CRUD ── */
  function addLink(name, url) {
    // Ensure protocol present
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    links.push({ id: Date.now(), name: name.trim(), url: finalUrl });
    save();
    render();
  }

  function deleteLink(id) {
    links = links.filter((l) => l.id !== id);
    save();
    render();
  }

  /* ── Events ── */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const url  = urlInput.value.trim();
    if (!name || !url) return;
    addLink(name, url);
    nameInput.value = '';
    urlInput.value  = '';
    nameInput.focus();
  });

  /* ── Init ── */
  load();
  render();
})();
