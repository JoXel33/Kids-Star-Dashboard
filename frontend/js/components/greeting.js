import { api } from '../api.js';
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
    } else {
      const display = name || 'friend';
      const html = `
        <div class="hello">
          ${escapeHtml(greet)},
          <span class="name" title="Click to change your name">${escapeHtml(display)}</span> ✨
        </div>
      `;
      if (html === lastHtml) return;
      lastHtml = html;
      container.innerHTML = html;
      container.querySelector('.name').addEventListener('click', () => { editing = true; render(); });
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
