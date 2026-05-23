import { api, clearToken } from '../api.js';

export function mountSettings() {
  if (document.querySelector('.settings-fab')) return;

  const btn = document.createElement('button');
  btn.className = 'settings-fab';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Settings');
  btn.textContent = '⚙';
  document.body.appendChild(btn);
  btn.addEventListener('click', openModal);
}

function openModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">Settings</h2>
      <p class="modal-warn">
        <strong>Delete my data</strong> removes your name, agenda, stars, and rewards
        <strong>forever</strong>. This can't be undone.
      </p>
      <div class="modal-actions">
        <button id="modal-close">Close</button>
        <button id="modal-delete" class="danger">Delete my data</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function close() { modal.remove(); }
  modal.addEventListener('click', (ev) => { if (ev.target === modal) close(); });
  modal.querySelector('#modal-close').addEventListener('click', close);
  modal.querySelector('#modal-delete').addEventListener('click', async () => {
    if (!confirm("Really delete everything? You'll start fresh.")) return;
    try {
      await api.deleteMe();
      clearToken();
      location.reload();
    } catch (e) {
      alert(e.message || 'Could not delete.');
    }
  });
}
