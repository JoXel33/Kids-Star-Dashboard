import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, applySchema } from '../../src/db/index.js';
import { createApp } from '../../src/app.js';

const today = '2026-06-07';
const noon = '12:00';

function makeApp(overrides = {}) {
  const db = openDb(':memory:');
  applySchema(db);
  const app = createApp(db, { serverSecret: 'test-secret', ...overrides });
  return { app, db };
}

async function setupChildWithSource(app, { date = today, hour = 14, activity = 'Math homework' } = {}) {
  // Create child, log in (createChild returns a sessionToken), then save the source
  // activity at (date, hour) so recurrence has something to repeat.
  const createRes = await request(app).post('/api/children').send({
    name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today,
  });
  const token = createRes.body.sessionToken;
  await request(app)
    .put(`/api/days/${date}/agenda/${hour}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ activity, clientDate: today, clientTime: noon });
  return token;
}

// Directly insert an agenda row, bypassing the saveAgendaEntry API's elapsed-block
// guard. Used to set up sources that would otherwise be unreachable (past dates,
// elapsed hours on today).
function insertAgendaDirect(db, childId, date, hour, activity) {
  db.prepare(
    `INSERT INTO agenda_entries (child_id, date, hour, activity) VALUES (?, ?, ?, ?)
     ON CONFLICT (child_id, date, hour) DO UPDATE SET activity = excluded.activity`,
  ).run(childId, date, hour, activity);
}

async function createChildOnly(app) {
  const res = await request(app).post('/api/children').send({
    name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today,
  });
  return res.body.sessionToken;
}

describe('POST /api/days/:date/agenda/:hour/recurrence', () => {
  test('200 happy path (Daily) — returns created + dates sorted ascending', async () => {
    const { app } = makeApp();
    const token = await setupChildWithSource(app);
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.dates, ['2026-06-08', '2026-06-09', '2026-06-10']);
    assert.equal(res.body.created, 3);
  });

  test('401 unauthorized without bearer token', async () => {
    const { app } = makeApp();
    await setupChildWithSource(app);
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });
    assert.equal(res.status, 401);
  });

  test('400 invalid_input on missing body', async () => {
    const { app } = makeApp();
    const token = await setupChildWithSource(app);
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'invalid_input');
  });

  test('400 invalid_input on bad type enum', async () => {
    const { app } = makeApp();
    const token = await setupChildWithSource(app);
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'monthly', until: '2026-06-10', clientDate: today, clientTime: noon });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'invalid_input');
  });

  test('404 source_not_found when no agenda entry exists at (date, hour)', async () => {
    const { app } = makeApp();
    // Set up the child but DO NOT save an activity at hour 14.
    const createRes = await request(app).post('/api/children').send({
      name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today,
    });
    const token = createRes.body.sessionToken;
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'source_not_found');
  });

  test('422 source_empty when the row exists but activity is empty', async () => {
    const { app } = makeApp();
    const createRes = await request(app).post('/api/children').send({
      name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today,
    });
    const token = createRes.body.sessionToken;
    // Save then clear the activity so the row exists with activity === ''.
    await request(app).put(`/api/days/${today}/agenda/14`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: 'tmp', clientDate: today, clientTime: noon });
    await request(app).put(`/api/days/${today}/agenda/14`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activity: '', clientDate: today, clientTime: noon });
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'source_empty');
  });

  test('422 source_elapsed when the source block has already elapsed', async () => {
    const { app, db } = makeApp();
    const token = await createChildOnly(app);
    // Source is today's 08:00–09:00 block; client time 12:00 means it elapsed at 09:00.
    // Cannot reach this state via the API (saveAgendaEntry refuses elapsed blocks),
    // so we insert directly.
    insertAgendaDirect(db, 1, today, 8, 'Math homework');
    const res = await request(app)
      .post(`/api/days/${today}/agenda/8/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'source_elapsed');
  });

  test('422 invalid_until_date for a non-existent calendar date', async () => {
    const { app } = makeApp();
    const token = await setupChildWithSource(app);
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-02-30', clientDate: today, clientTime: noon });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'invalid_until_date');
  });

  test('422 until_not_future when until <= source date', async () => {
    const { app } = makeApp();
    const token = await setupChildWithSource(app);
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: today, clientDate: today, clientTime: noon });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'until_not_future');
  });

  test('422 until_too_far when until > clientDate + 90 days', async () => {
    const { app } = makeApp();
    const token = await setupChildWithSource(app);
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-10-01', clientDate: today, clientTime: noon });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'until_too_far');
  });

  test('200 happy path (Weekly) — 21-day Until from Sunday → 3 Sundays', async () => {
    const { app } = makeApp();
    // 2026-06-07 is a Sunday (per spec US1 AC1).
    const token = await setupChildWithSource(app, { activity: 'Family lunch' });
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'weekly', until: '2026-06-28', clientDate: today, clientTime: noon });
    assert.equal(res.status, 200);
    assert.equal(res.body.created, 3);
    assert.deepEqual(res.body.dates, ['2026-06-14', '2026-06-21', '2026-06-28']);
  });

  test('500 internal when the service throws an unmapped error (stubbed)', async () => {
    const stub = {
      applyRecurrence() {
        const e = new Error('boom');
        // No `.code` / `.status` — the middleware should default to 500.
        throw e;
      },
    };
    const { app } = makeApp({ recurrenceServiceOverride: stub });
    const token = await setupChildWithSource(app);
    const res = await request(app)
      .post(`/api/days/${today}/agenda/14/recurrence`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', until: '2026-06-10', clientDate: today, clientTime: noon });
    assert.equal(res.status, 500);
  });
});
