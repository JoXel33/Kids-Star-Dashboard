import { getState, setState, subscribe } from '../state.js';

let viewYear, viewMonth; // 0-based month

export function mountCalendar(container) {
  const today = getState().today;
  const [ty, tm] = today.split('-').map(Number);
  viewYear = ty;
  viewMonth = tm - 1;

  let lastHtml = '';

  function render() {
    const { selectedDate, today } = getState();
    const monthName = new Date(viewYear, viewMonth, 1)
      .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];
    for (const dow of ['S', 'M', 'T', 'W', 'T', 'F', 'S']) {
      cells.push(`<div class="day dow">${dow}</div>`);
    }
    for (let i = firstDow - 1; i >= 0; i--) {
      cells.push(`<div class="day other-month">${daysInPrev - i}</div>`);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const classes = ['day'];
      if (dateStr === today) classes.push('today');
      if (dateStr === selectedDate) classes.push('selected');
      cells.push(`<div class="${classes.join(' ')}" data-date="${dateStr}">${d}</div>`);
    }
    const total = firstDow + daysInMonth;
    const trailing = (7 - (total % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      cells.push(`<div class="day other-month">${i}</div>`);
    }

    const html = `
      <div class="card-title">Calendar</div>
      <div class="calendar-header">
        <button data-nav="prev" aria-label="Previous month">‹</button>
        <div class="month">${escapeHtml(monthName)}</div>
        <button data-nav="next" aria-label="Next month">›</button>
      </div>
      <div class="calendar-grid">${cells.join('')}</div>
    `;
    if (html === lastHtml) return;
    lastHtml = html;
    container.innerHTML = html;
    container.querySelector('[data-nav="prev"]').addEventListener('click', () => {
      viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render();
    });
    container.querySelector('[data-nav="next"]').addEventListener('click', () => {
      viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render();
    });
    for (const el of container.querySelectorAll('.day[data-date]')) {
      el.addEventListener('click', () => setState({ selectedDate: el.dataset.date }));
    }
  }

  render();
  subscribe(render);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}
