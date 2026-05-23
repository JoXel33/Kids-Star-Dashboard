import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, applySchema } from '../../src/db/index.js';
import { createApp } from '../../src/app.js';

describe('US1 — Plan and journal the daily agenda', () => {
  test('full flow: save activity, switch date, elapsed locked, persistence', async () => {
    const db = openDb(':memory:');
    applySchema(db);
    const app = createApp(db, { serverSecret: 'us1-test' });

    const setupRes = await request(app)
      .post('/api/children')
      .send({ name: 'Sam', accessCode: 'sealion', recoveryAnswer: 'Maple', createdDate: '2026-05-23' });
    const token = setupRes.body.sessionToken;
    const auth = { Authorization: `Bearer ${token}` };

    // Save an upcoming activity on today
    await request(app).put('/api/days/2026-05-23/agenda/15').set(auth)
      .send({ activity: 'Spelling', clientDate: '2026-05-23', clientTime: '14:00' })
      .expect(200);

    // Verify
    const get1 = await request(app).get('/api/days/2026-05-23').set(auth).expect(200);
    assert.equal(get1.body.day.agenda.find((e) => e.hour === 15).activity, 'Spelling');

    // Plan ahead on a future date
    await request(app).put('/api/days/2026-05-30/agenda/10').set(auth)
      .send({ activity: 'Park', clientDate: '2026-05-23', clientTime: '14:00' })
      .expect(200);

    // Switch to the future date: agenda shows the plan; today's data unchanged
    const future = await request(app).get('/api/days/2026-05-30').set(auth).expect(200);
    assert.equal(future.body.day.agenda.find((e) => e.hour === 10).activity, 'Park');
    const todayAgain = await request(app).get('/api/days/2026-05-23').set(auth).expect(200);
    assert.equal(todayAgain.body.day.agenda.find((e) => e.hour === 15).activity, 'Spelling');

    // Past dates: GET returns read-only data; saving is rejected
    const pastGet = await request(app).get('/api/days/2026-05-22').set(auth).expect(200);
    assert.equal(pastGet.body.day.agenda.length, 14);
    const pastSave = await request(app).put('/api/days/2026-05-22/agenda/10').set(auth)
      .send({ activity: 'too late', clientDate: '2026-05-23', clientTime: '14:00' });
    assert.equal(pastSave.status, 422);
    assert.equal(pastSave.body.error.code, 'block_elapsed');

    // Persistence: open a fresh app on the same DB, log in, the activity is still there
    const app2 = createApp(db, { serverSecret: 'us1-test' });
    const login = await request(app2).post('/api/sessions').send({ accessCode: 'sealion' }).expect(200);
    const get2 = await request(app2).get('/api/days/2026-05-23')
      .set('Authorization', `Bearer ${login.body.sessionToken}`).expect(200);
    assert.equal(get2.body.day.agenda.find((e) => e.hour === 15).activity, 'Spelling');
  });
});
