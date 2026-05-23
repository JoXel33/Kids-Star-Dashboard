export const STAR_LOCK_HHMM = '21:30';
export const AGENDA_START_HOUR = 7;
export const AGENDA_END_HOUR = 21;       // exclusive; last block is 20:00–21:00
export const AGENDA_BLOCK_COUNT = 14;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function isValidDate(s) { return typeof s === 'string' && DATE_RE.test(s); }
export function isValidTime(s) { return typeof s === 'string' && TIME_RE.test(s); }

export function isValidHour(h) {
  return Number.isInteger(h) && h >= AGENDA_START_HOUR && h < AGENDA_END_HOUR;
}

export function isBlockElapsed(date, hour, clientDate, clientTime) {
  if (date < clientDate) return true;
  if (date > clientDate) return false;
  const blockEnd = `${String(hour + 1).padStart(2, '0')}:00`;
  return clientTime >= blockEnd;
}

export function isCountedDay(date, clientDate, clientTime) {
  if (date < clientDate) return true;
  if (date > clientDate) return false;
  return clientTime >= STAR_LOCK_HHMM;
}

export function canToggleStar(date, clientDate, clientTime) {
  if (date !== clientDate) return { ok: false, code: 'star_not_today' };
  if (clientTime >= STAR_LOCK_HHMM) return { ok: false, code: 'star_locked' };
  return { ok: true };
}
