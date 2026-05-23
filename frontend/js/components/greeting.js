import { getState, subscribe } from '../state.js';
import { timeOfDayGreeting } from '../time.js';

export function mountGreeting(container) {
  function render() {
    const { child } = getState();
    const greet = timeOfDayGreeting();
    const name = (child && child.name) ? child.name : 'friend';
    container.innerHTML = `
      <div class="hello">${escapeHtml(greet)}, <span class="name">${escapeHtml(name)}</span> ✨</div>
    `;
  }
  render();
  subscribe(render);
  // Re-render every 5 minutes so the greeting follows the time of day.
  setInterval(render, 5 * 60 * 1000);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}
