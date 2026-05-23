import { api } from '../api.js';
import { getState, setState, subscribe } from '../state.js';
import { isStarLocked, nowTime, todayDate } from '../time.js';
import { reloadWallet } from '../refresh.js';

export function mountStar(container) {
  let lastHtml = '';

  async function setStar(earned) {
    const { selectedDate } = getState();
    const today = todayDate();
    try {
      await api.setStar(selectedDate, earned, today, nowTime());
      // Refetch the day as the authoritative source (handles the race where
      // the user clicked before the initial loadDay completed).
      const res = await api.getDay(selectedDate);
      setState({ day: res.day });
      reloadWallet();
    } catch (e) {
      alert(e.message || 'Could not update star.');
    }
  }

  function render() {
    const { selectedDate, day } = getState();
    const today = todayDate();
    const locked = isStarLocked(selectedDate, today, nowTime());
    const earned = !!(day && day.star && day.star.earned);
    const html = `
      <div class="card-title">Today's Star</div>
      <div class="star-toggle">
        <button class="star-btn ${earned ? 'on' : 'off'}" ${locked ? 'disabled' : ''} aria-label="${earned ? 'Star earned' : 'Tap to earn star'}">
          ${earned ? '⭐' : '☆'}
        </button>
        <div class="star-status">
          ${earned ? 'Star earned!' : 'No star yet'}
          ${locked ? `<span class="lock-note"> ${selectedDate === today ? '(locked at 21:30)' : '(view only)'}</span>` : ''}
        </div>
      </div>
    `;
    if (html === lastHtml) return;
    lastHtml = html;
    container.innerHTML = html;
    if (!locked) {
      container.querySelector('.star-btn').addEventListener('click', () => setStar(!earned));
    }
  }

  render();
  subscribe(render);
}
