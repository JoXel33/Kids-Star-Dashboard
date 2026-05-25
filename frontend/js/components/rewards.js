import { api } from '../api.js';
import { getState, setState, subscribe } from '../state.js';
import { todayDate, nowTime } from '../time.js';
import { registerWantsReloader, reloadWallet } from '../refresh.js';

const MAX_WANTS = 3;

let adding = false;
let selectedCost = 0;

export function mountRewards(container) {
  async function reload() {
    try {
      const res = await api.listWants();
      setState({ wants: res.wants });
    } catch (e) {
      console.error('wants reload failed:', e);
    }
  }
  registerWantsReloader(reload);

  let lastHtml = '';

  async function addWant() {
    const descEl = container.querySelector('#new-desc');
    const desc = descEl ? descEl.value.trim() : '';
    if (!desc) { alert('Please enter a description.'); return; }
    if (!selectedCost) { alert('Please pick a cost (1–5 stars).'); return; }
    try {
      await api.addWant(desc, selectedCost);
      adding = false;
      selectedCost = 0;
      await reload();
    } catch (e) {
      alert(e.message || 'Could not add reward.');
    }
  }

  async function removeWant(id) {
    if (!confirm('Remove this reward?')) return;
    try {
      await api.removeWant(id);
      await reload();
    } catch (e) {
      alert(e.message || 'Could not remove reward.');
    }
  }

  async function redeemWant(id) {
    if (!confirm('Redeem this reward?')) return;
    try {
      await api.redeemWant(id, todayDate(), nowTime());
      await reload();
      reloadWallet();
    } catch (e) {
      alert(e.message || 'Could not redeem.');
    }
  }

  function render() {
    const wants = getState().wants || [];
    const wallet = getState().wallet || { starBalance: 0 };
    const canAdd = wants.length < MAX_WANTS;

    const html = `
      <div class="card-title">Your Rewards</div>
      <div class="rewards-list">
        ${wants.length === 0 && !adding ? `<div class="empty-note">No rewards yet — tap below to add one ⭐</div>` : ''}
        ${wants.map((w) => `
          <div class="reward-row" data-id="${w.id}">
            <div class="reward-desc">${escapeHtml(w.description)}</div>
            <div class="reward-cost" aria-label="Cost ${w.cost} stars">${'⭐'.repeat(w.cost)}${'☆'.repeat(5 - w.cost)}</div>
            <div class="reward-actions">
              <button class="redeem-btn" data-action="redeem"
                ${wallet.starBalance >= w.cost ? '' : 'disabled'}
                title="${wallet.starBalance >= w.cost ? 'Spend your stars on this' : 'Not enough stars yet — keep earning!'}">Redeem</button>
              <button class="remove-btn" data-action="remove" aria-label="Remove">✖</button>
            </div>
          </div>
        `).join('')}
      </div>
      ${adding ? `
        <div class="add-want-form">
          <input id="new-desc" maxlength="60" placeholder="What do you want?" />
          <div id="cost-group" class="cost-group" role="group" aria-label="Cost in stars">
            ${[1, 2, 3, 4, 5].map((n) => `<button class="cost-btn ${selectedCost === n ? 'selected' : ''}" data-cost="${n}">${n}⭐</button>`).join('')}
          </div>
          <div class="add-want-actions">
            <button id="add-cancel">Cancel</button>
            <button id="add-confirm">Add</button>
          </div>
        </div>
      ` : canAdd ? `<button class="add-want-btn" id="show-add">＋ Add a reward</button>` : `<div class="empty-note">Max 3 rewards — redeem one to add more.</div>`}
    `;
    if (html === lastHtml) return;
    lastHtml = html;
    container.innerHTML = html;

    if (canAdd && !adding) {
      container.querySelector('#show-add').addEventListener('click', () => { adding = true; selectedCost = 0; render(); });
    }
    if (adding) {
      const costGroup = container.querySelector('#cost-group');
      costGroup.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.cost-btn');
        if (!btn) return;
        selectedCost = Number(btn.dataset.cost);
        for (const b of costGroup.querySelectorAll('.cost-btn')) b.classList.toggle('selected', Number(b.dataset.cost) === selectedCost);
      });
      container.querySelector('#add-cancel').addEventListener('click', () => { adding = false; selectedCost = 0; render(); });
      container.querySelector('#add-confirm').addEventListener('click', addWant);
      const desc = container.querySelector('#new-desc');
      desc.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); addWant(); } });
      setTimeout(() => desc.focus(), 0);
    }

    for (const row of container.querySelectorAll('.reward-row')) {
      const id = Number(row.dataset.id);
      row.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (btn.dataset.action === 'redeem') redeemWant(id);
          else if (btn.dataset.action === 'remove') removeWant(id);
        });
      });
    }
  }

  reload();
  render();
  subscribe(render);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
