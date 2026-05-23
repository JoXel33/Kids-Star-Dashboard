// Browser local clock is the source of truth (research §4).

export const STAR_LOCK_HHMM = '21:30';
export const AGENDA_START_HOUR = 7;
export const AGENDA_END_HOUR = 21;       // exclusive; last block is 20:00–21:00
export const AGENDA_BLOCK_COUNT = 14;

export function todayDate(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nowTime(now = new Date()) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function timeOfDayGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function isBlockElapsed(date, hour, today, time) {
  if (date < today) return true;
  if (date > today) return false;
  const blockEnd = `${String(hour + 1).padStart(2, '0')}:00`;
  return time >= blockEnd;
}

export function isStarLocked(date, today, time) {
  if (date !== today) return true;
  return time >= STAR_LOCK_HHMM;
}

export function isCountedDay(date, today, time) {
  if (date < today) return true;
  if (date > today) return false;
  return time >= STAR_LOCK_HHMM;
}
