/* ============================================================
   Life Dashboard — app.js
   Vanilla JS · Local Storage · No dependencies
   ============================================================ */

'use strict';

/* ── Utility ─────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

function pad(n) {
  return String(n).padStart(2, '0');
}

/* ============================================================
   1. GREETING — clock, date, greeting message
   ============================================================ */

(function initGreeting() {
  const timeEl    = $('current-time');
  const dateEl    = $('current-date');
  const greetEl   = $('greeting-text');

  const GREETINGS = [
    { from:  0, to:  5,  text: 'Burning the midnight oil 🌙' },
    { from:  5, to: 12,  text: 'Good morning ☀️' },
    { from: 12, to: 17,  text: 'Good afternoon 🌤️' },
    { from: 17, to: 21,  text: 'Good evening 🌆' },
    { from: 21, to: 24,  text: 'Good night 🌙' },
  ];

  function tick() {
    const now  = new Date();
    const h    = now.getHours();
    const m    = now.getMinutes();
    const s    = now.getSeconds();

    timeEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric',
    });

    const match = GREETINGS.find((g) => h >= g.from && h < g.to);
    greetEl.textContent = match ? match.text : 'Hello!';
  }

  tick();
  setInterval(tick, 1000);
})();

/* ============================================================
   2. FOCUS TIMER — 25-minute Pomodoro-style
   ============================================================ */

(function initTimer() {
  const TOTAL_SECONDS = 25 * 60;

  const displayEl = $('timer-display');
  const labelEl   = $('timer-label');
  const startBtn  = $('timer-start');
  const stopBtn   = $('timer-stop');
  const resetBtn  = $('timer-reset');

  let remaining = TOTAL_SECONDS;
  let intervalId = null;
  let running    = false;

  function render() {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    displayEl.textContent = `${pad(m)}:${pad(s)}`;

    displayEl.classList.toggle('running', running);
    displayEl.classList.toggle('done',    remaining === 0 && !running);

    startBtn.disabled = running || remaining === 0;
    stopBtn.disabled  = !running;
  }

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

  startBtn.addEventListener('click', () => {
    if (running || remaining === 0) return;
    running = true;
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
    running    = false;
    remaining  = TOTAL_SECONDS;
    labelEl.textContent = 'Ready to focus?';
    render();
  });

  render();
})();

/* ============================================================
   3. TO-DO LIST
   ============================================================ */

(function initTodo() {
  const STORAGE_KEY = 'dashboard_todos';

  const form      = $('todo-form');
  const input     = $('todo-input');
  const listEl    = $('todo-list');
  const emptyEl   = $('todo-empty');

  // Modal elements
  const overlay     = $('modal-overlay');
  const modalInput  = $('modal-input');
  const modalSave   = $('modal-save');
  const modalCancel = $('modal-cancel');

  let tasks = [];
  let editingId = null;

  /* ── Storage ── */
  function load() {
    try {
      tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      tasks = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  /* ── Render ── */
  function render() {
    listEl.innerHTML = '';

    if (tasks.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = `todo-item${task.done ? ' done' : ''}`;
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

      // Actions
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
    tasks.push({ id: Date.now(), text: text.trim(), done: false });
    save();
    render();
  }

  function toggleDone(id) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.done = !task.done;
      save();
      render();
    }
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
    editingId = id;
    modalInput.value = task.text;
    overlay.hidden = false;
    modalInput.focus();
    modalInput.select();
  }

  function closeModal() {
    overlay.hidden = true;
    editingId = null;
    modalInput.value = '';
  }

  function saveEdit() {
    const text = modalInput.value.trim();
    if (!text) return;
    const task = tasks.find((t) => t.id === editingId);
    if (task) {
      task.text = text;
      save();
      render();
    }
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

  modalSave.addEventListener('click', saveEdit);
  modalCancel.addEventListener('click', closeModal);

  modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') closeModal();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  /* ── Init ── */
  load();
  render();
})();

/* ============================================================
   4. QUICK LINKS
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
    try {
      links = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      links = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }

  /* ── Favicon helper ── */
  function faviconUrl(url) {
    try {
      const origin = new URL(url).origin;
      return `https://www.google.com/s2/favicons?sz=16&domain_url=${encodeURIComponent(origin)}`;
    } catch {
      return null;
    }
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
        const img = document.createElement('img');
        img.src    = favicon;
        img.width  = 14;
        img.height = 14;
        img.alt    = '';
        img.style.borderRadius = '2px';
        img.onerror = () => img.remove();
        chip.appendChild(img);
      }

      // Label
      const label = document.createElement('span');
      label.textContent = link.name;
      chip.appendChild(label);

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'link-delete';
      delBtn.title     = `Remove ${link.name}`;
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
    // Ensure URL has a protocol
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
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
