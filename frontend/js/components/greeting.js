import { api, clearToken } from '../api.js';
import { getState, setState, subscribe } from '../state.js';
import { timeOfDayGreeting } from '../time.js';

let editing = false;

export function mountGreeting(container) {
  let lastHtml = '';
  function render() {
    const { child } = getState();
    const greet = timeOfDayGreeting();
    const name = (child && child.name) ? child.name : '';
    if (editing) {
      const html = `
        <div class="hello">
          ${escapeHtml(greet)},
          <input class="name-input" type="text" maxlength="40" value="${escapeAttr(name)}" />
          <button class="name-save-btn" type="button">Save</button>
        </div>
        <button class="logout-btn" type="button" title="Log out" aria-label="Log out">🚪</button>
      `;
      if (html === lastHtml) return;
      lastHtml = html;
      container.innerHTML = html;
      const input = container.querySelector('.name-input');
      setTimeout(() => { input.focus(); input.select(); }, 0);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); save(input.value); }
        else if (ev.key === 'Escape') { editing = false; render(); }
      });
      container.querySelector('.name-save-btn').addEventListener('click', () => save(input.value));
      container.querySelector('.logout-btn').addEventListener('click', openLogoutConfirm);
    } else {
      const display = name || 'friend';
      const html = `
        <div class="hello">
          ${escapeHtml(greet)},
          <span class="name" title="Click to change your name">${escapeHtml(display)}</span> ✨
        </div>
        <button class="logout-btn" type="button" title="Log out" aria-label="Log out">🚪</button>
      `;
      if (html === lastHtml) return;
      lastHtml = html;
      container.innerHTML = html;
      container.querySelector('.name').addEventListener('click', () => { editing = true; render(); });
      container.querySelector('.logout-btn').addEventListener('click', openLogoutConfirm);
    }
  }

  async function save(newName) {
    try {
      const res = await api.updateName(newName.trim());
      editing = false;
      setState({ child: res.child });
    } catch (e) {
      alert(e.message || 'Could not save name.');
    }
  }

  render();
  subscribe(render);
  setInterval(render, 5 * 60 * 1000);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}
function escapeAttr(s) { return escapeHtml(s); }

function openLogoutConfirm() {
  if (document.querySelector('.modal-overlay.logout-modal')) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay logout-modal';
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="logout-title">
      <h2 id="logout-title">Log out? 🚪</h2>
      <p class="modal-warn">
        You'll be signed out and another child can log in.
        Your agenda, stars, and rewards stay safe.
      </p>
      <div class="modal-actions">
        <button id="logout-cancel">Stay logged in</button>
        <button id="logout-confirm" class="danger">Log out</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function close() { modal.remove(); }
  modal.addEventListener('click', (ev) => { if (ev.target === modal) close(); });
  modal.querySelector('#logout-cancel').addEventListener('click', close);
  modal.querySelector('#logout-confirm').addEventListener('click', async () => {
    try { await api.logout(); } catch (_e) { /* best effort — clear locally regardless */ }
    clearToken();
    location.reload();
  });
}
