import { api } from '../api.js';
import { getState, setState, subscribe } from '../state.js';
import { isBlockElapsed, nowTime, AGENDA_START_HOUR, AGENDA_END_HOUR } from '../time.js';

const HOURS = Array.from({ length: AGENDA_END_HOUR - AGENDA_START_HOUR }, (_, i) => AGENDA_START_HOUR + i);

let editingHour = null;

export function mountAgenda(container) {
  let lastKey = '';

  function render() {
    const { selectedDate, day, today } = getState();
    const time = nowTime();
    const key = `${selectedDate}|${today}|${time}|${editingHour}|${JSON.stringify(day?.agenda || [])}`;
    if (key === lastKey) return;
    lastKey = key;
    container.innerHTML = `
      <div class="card-title">Agenda — ${formatHeader(selectedDate, today)}</div>
      <div class="agenda-list" id="agenda-list"></div>
    `;
    const list = container.querySelector('#agenda-list');
    const map = new Map((day?.agenda || []).map((e) => [e.hour, e.activity]));

    for (const h of HOURS) {
      const elapsed = isBlockElapsed(selectedDate, h, today, time);
      const activity = map.get(h) || '';
      const row = document.createElement('div');
      row.className = 'agenda-row' + (elapsed ? ' elapsed' : '');
      row.dataset.hour = String(h);
      const timeLabel = `${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00`;
      if (elapsed) {
        row.innerHTML = `
          <span class="time">${timeLabel}</span>
          <span class="activity">${activity ? escapeHtml(activity) : '<em style="color:#a0a0b0">(no entry)</em>'}</span>
          <span class="elapsed-tag">elapsed</span>`;
      } else if (editingHour === h) {
        row.innerHTML = `
          <span class="time">${timeLabel}</span>
          <span class="activity"><input type="text" maxlength="200" value="${escapeAttr(activity)}" /></span>
          <button class="save-btn">Save</button>`;
        const input = row.querySelector('input');
        setTimeout(() => { input.focus(); input.select(); }, 0);
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); saveRow(h, input.value); }
          else if (ev.key === 'Escape') { editingHour = null; render(); }
        });
        row.querySelector('.save-btn').addEventListener('click', () => saveRow(h, input.value));
      } else {
        row.innerHTML = `
          <span class="time">${timeLabel}</span>
          <button class="activity activity-clickable" type="button" aria-label="Edit activity for ${timeLabel}">${activity ? escapeHtml(activity) : '<em>(tap to add)</em>'}</button>`;
        row.querySelector('.activity-clickable').addEventListener('click', () => { editingHour = h; render(); });
      }
      list.appendChild(row);
    }

    // Scroll to current hour (today) or first non-elapsed block.
    let scrollTarget = null;
    if (selectedDate === today) {
      const currentHour = Number(time.split(':')[0]);
      scrollTarget = list.querySelector(`.agenda-row[data-hour="${currentHour}"]`);
    }
    if (!scrollTarget) scrollTarget = list.querySelector('.agenda-row:not(.elapsed)');
    if (scrollTarget) scrollTarget.scrollIntoView({ block: 'start' });
  }

  async function saveRow(hour, activity) {
    const { selectedDate, today } = getState();
    try {
      const res = await api.saveAgenda(selectedDate, hour, {
        activity: String(activity ?? ''),
        clientDate: today,
        clientTime: nowTime(),
      });
      const day = getState().day || { date: selectedDate, star: { earned: false }, agenda: [] };
      const idx = day.agenda.findIndex((e) => e.hour === hour);
      if (idx >= 0) day.agenda[idx] = res.entry; else day.agenda.push(res.entry);
      day.agenda.sort((a, b) => a.hour - b.hour);
      editingHour = null;
      setState({ day });
    } catch (e) {
      alert(e.message || 'Could not save.');
    }
  }

  render();
  subscribe(render);
}

function formatHeader(selectedDate, today) {
  if (!selectedDate) return '';
  if (selectedDate === today) return 'Today';
  const [y, m, d] = selectedDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}
function escapeAttr(s) { return escapeHtml(s); }
