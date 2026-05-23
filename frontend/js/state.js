const state = {
  child: null,            // { id, name, createdDate } | null
  selectedDate: null,     // 'YYYY-MM-DD'
  today: null,            // 'YYYY-MM-DD'
  day: null,              // { date, star, agenda } | null — server data for selectedDate
  loading: false,
  error: null,
};

const listeners = new Set();

export function getState() { return state; }
export function setState(patch) { Object.assign(state, patch); emit(); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) try { fn(state); } catch (e) { console.error(e); } }
