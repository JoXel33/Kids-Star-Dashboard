import {
  isBlockElapsed,
  isValidDate,
  isValidTime,
  isValidHour,
  AGENDA_START_HOUR,
  AGENDA_END_HOUR,
} from '../lib/time.js';

function appError(code, status = 400) {
  const e = new Error(code);
  e.code = code;
  e.status = status;
  return e;
}

export function createAgendaService(db) {
  const stmts = {
    getStar: db.prepare(`SELECT earned FROM day_stars WHERE child_id = ? AND date = ?`),
    getAgenda: db.prepare(`SELECT hour, activity FROM agenda_entries WHERE child_id = ? AND date = ? ORDER BY hour`),
    upsertEntry: db.prepare(`
      INSERT INTO agenda_entries (child_id, date, hour, activity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (child_id, date, hour) DO UPDATE SET activity = excluded.activity
    `),
  };

  return {
    getDay(childId, date) {
      if (!isValidDate(date)) throw appError('invalid_input', 400);
      const starRow = stmts.getStar.get(childId, date);
      const entries = stmts.getAgenda.all(childId, date);
      const map = new Map(entries.map((e) => [e.hour, e.activity]));
      const agenda = [];
      for (let h = AGENDA_START_HOUR; h < AGENDA_END_HOUR; h++) {
        agenda.push({ hour: h, activity: map.get(h) || '' });
      }
      return {
        date,
        star: { earned: !!(starRow && starRow.earned) },
        agenda,
      };
    },

    saveAgendaEntry(childId, date, hour, activity, clientDate, clientTime) {
      if (
        !isValidDate(date) ||
        !isValidHour(hour) ||
        !isValidDate(clientDate) ||
        !isValidTime(clientTime)
      ) {
        throw appError('invalid_input', 400);
      }
      if (typeof activity !== 'string' || activity.length > 200) {
        throw appError('invalid_input', 400);
      }
      if (isBlockElapsed(date, hour, clientDate, clientTime)) {
        throw appError('block_elapsed', 422);
      }
      stmts.upsertEntry.run(childId, date, hour, activity);
      return { hour, activity };
    },
  };
}
