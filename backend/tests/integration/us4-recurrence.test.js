import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, applySchema } from '../../src/db/index.js';
import { createApp } from '../../src/app.js';

const today = '2026-06-07';
const noon = '12:00';

function makeApp() {
  const db = openDb(':memory:');
  applySchema(db);
  const app = createApp(db, { serverSecret: 'test-secret' });
  return { app, db };
}

// Wraps the db so we can inject a failure at the Nth fan-out write.
function makeAppWithFailureInjection() {
  const db = openDb(':memory:');
  applySchema(db);

  const state = { failAt: null, runCount: 0 };
  const originalPrepare = db.prepare.bind(db);
  db.prepare = (sql) => {
    const stmt = originalPrepare(sql);
    if (/INSERT\s+INTO\s+agenda_entries.*ON\s+CONFLICT/is.test(sql)) {
      const originalRun = stmt.run.bind(stmt);
      stmt.run = (...args) => {
        if (state.failAt !== null) {
          state.runCount += 1;
          if (state.runCount > state.failAt) throw new Error('simulated db error');
        }
        return originalRun(...args);
      };
    }
    return stmt;
  };

  const app = createApp(db, { serverSecret: 'test-secret' });
  return {
    app,
    db,
    failAfter(n) { state.failAt = n; state.runCount = 0; },
    disableFailures() { state.failAt = null; },
  };
}

async function setupChildWithSource(app, { date = today, hour = 14, activity = 'Activity A' } = {}) {
  const createRes = await request(app).post('/api/children').send({
    name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today,
  });
  const token = createRes.body.sessionToken;
  await request(app).put(`/api/days/${date}/agenda/${hour}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ activity, clientDate: today, clientTime: noon });
  return token;
}

function get(app, token, date) {
  return request(app).get(`/api/days/${date}`).set('Authorization', `Bearer ${token}`);
}

describe('US1 — Apply a daily recurrence (integration)', () => {
  test('apply Daily through a 3-day Until creates entries on each target date', async () => {
    const { app } = makeApp();
    const token = await setupChildWithSource(app, { activity: 'Math homework' });
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });
    assert.equal(res.status, 200);
    assert.equal(res.body.created, 3);
    assert.deepEqual(res.body.dates, ['2026-06-08', '2026-06-09', '2026-06-10']);

    for (const d of ['2026-06-08', '2026-06-09', '2026-06-10']) {
      const day = await get(app, token, d);
      const row = day.body.day.agenda.find((e) => e.hour === 14);
      assert.equal(row.activity, 'Math homework', `expected Math homework on ${d}`);
    }
  });

  test('overwrite (FR-013): collision in a future slot is replaced with source activity', async () => {
    const { app } = makeApp();
    const token = await setupChildWithSource(app, { activity: 'Math homework' });
    // Pre-populate 2026-06-09 with a different activity.
    await request(app).put('/api/days/2026-06-09/agenda/14')
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'Pre-existing', clientDate: today, clientTime: noon });

    await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });

    const day = await get(app, token, '2026-06-09');
    assert.equal(day.body.day.agenda.find((e) => e.hour === 14).activity, 'Math homework');
  });

  test('FR-014: source row and all (≤ sourceDate) rows untouched', async () => {
    const { app, db } = makeApp();
    const token = await setupChildWithSource(app, { activity: 'Source activity' });
    // Pre-populate yesterday with a sentinel activity. Bypasses the API because
    // saveAgendaEntry refuses past-date writes.
    db.prepare(
      `INSERT INTO agenda_entries (child_id, date, hour, activity) VALUES (?, ?, ?, ?)
       ON CONFLICT (child_id, date, hour) DO UPDATE SET activity = excluded.activity`,
    ).run(1, '2026-06-06', 14, 'Yesterday sentinel');

    await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });

    const sourceDay = await get(app, token, today);
    assert.equal(sourceDay.body.day.agenda.find((e) => e.hour === 14).activity, 'Source activity');
    const yesterday = await get(app, token, '2026-06-06');
    assert.equal(yesterday.body.day.agenda.find((e) => e.hour === 14).activity, 'Yesterday sentinel');
  });

  test('FR-015: editing one generated copy does not affect siblings', async () => {
    const { app } = makeApp();
    const token = await setupChildWithSource(app, { activity: 'Daily routine' });
    await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });

    // Edit one generated copy.
    await request(app).put('/api/days/2026-06-09/agenda/14')
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'Reading instead', clientDate: today, clientTime: noon });

    const d08 = await get(app, token, '2026-06-08');
    const d09 = await get(app, token, '2026-06-09');
    const d10 = await get(app, token, '2026-06-10');
    const src = await get(app, token, today);
    assert.equal(d08.body.day.agenda.find((e) => e.hour === 14).activity, 'Daily routine');
    assert.equal(d09.body.day.agenda.find((e) => e.hour === 14).activity, 'Reading instead');
    assert.equal(d10.body.day.agenda.find((e) => e.hour === 14).activity, 'Daily routine');
    assert.equal(src.body.day.agenda.find((e) => e.hour === 14).activity, 'Daily routine');
  });

  test('Clarification Q1: re-apply with a shorter Until leaves the tail untouched', async () => {
    const { app } = makeApp();
    const token = await setupChildWithSource(app, { activity: 'Activity A' });
    // Apply through 2026-06-15 → writes 8 entries (08–15).
    await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-15', clientDate: today, clientTime: noon });
    // Update source to Activity B and re-apply with a shorter Until.
    await request(app).put(`/api/days/${today}/agenda/14`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'Activity B', clientDate: today, clientTime: noon });
    await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });

    // Inside new range (08–10): Activity B (overwrite).
    for (const d of ['2026-06-08', '2026-06-09', '2026-06-10']) {
      const day = await get(app, token, d);
      assert.equal(day.body.day.agenda.find((e) => e.hour === 14).activity, 'Activity B', `Activity B on ${d}`);
    }
    // Outside new range (11–15): Activity A retained (Q1 — tail not deleted).
    for (const d of ['2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15']) {
      const day = await get(app, token, d);
      assert.equal(day.body.day.agenda.find((e) => e.hour === 14).activity, 'Activity A', `Activity A on ${d}`);
    }
  });

  test('Clarification Q2 / SC-008: failure injection mid-fan-out leaves zero new entries', async () => {
    // We use a fresh app for each N to isolate state.
    for (const failAt of [0, 1, 2]) {
      const harness = makeAppWithFailureInjection();
      const { app } = harness;
      const token = await setupChildWithSource(app, { activity: 'Source activity' });
      harness.failAfter(failAt);

      const res = await request(app)
        .post(`/api/days/${today}/agenda/14/recurrence`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });
      assert.equal(res.status, 500, `expected 500 when failAt=${failAt}`);

      harness.disableFailures();
      // Source row unchanged.
      const sourceDay = await get(app, token, today);
      assert.equal(sourceDay.body.day.agenda.find((e) => e.hour === 14).activity, 'Source activity');
      // No new entries on any target date.
      for (const d of ['2026-06-08', '2026-06-09', '2026-06-10']) {
        const day = await get(app, token, d);
        const row = day.body.day.agenda.find((e) => e.hour === 14);
        assert.equal(row.activity, '', `no rollback leak on ${d} when failAt=${failAt}`);
      }
    }
  });
});
