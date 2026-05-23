import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, applySchema } from '../../src/db/index.js';
import { createApp } from '../../src/app.js';

describe('US2 — earn and track stars', () => {
  test('toggle, 21:30 lock counts today, past star is read-only', async () => {
    const db = openDb(':memory:');
    applySchema(db);
    const app = createApp(db, { serverSecret: 'us2' });
    const setup = await request(app).post('/api/children')
      .send({ name: 'Mia', accessCode: 'mer', recoveryAnswer: 'oak', createdDate: '2026-05-15' });
    const auth = { Authorization: `Bearer ${setup.body.sessionToken}` };

    // Earn 5 past stars (2026-05-15..19)
    for (let i = 0; i < 5; i++) {
      const dt = new Date(Date.UTC(2026, 4, 15 + i));
      const date = dt.toISOString().slice(0, 10);
      await request(app).put(`/api/days/${date}/star`).set(auth)
        .send({ earned: true, clientDate: date, clientTime: '20:00' })
        .expect(200);
    }

    // Today = 2026-05-23, 12:00 — wallet shows the 5 past stars
    let wallet = await request(app).get('/api/wallet?clientDate=2026-05-23&clientTime=12:00')
      .set(auth).expect(200);
    assert.equal(wallet.body.wallet.starsCollected, 5);
    assert.equal(wallet.body.wallet.starBalance, 5);

    // Toggle today at 18:00 — not yet counted
    await request(app).put('/api/days/2026-05-23/star').set(auth)
      .send({ earned: true, clientDate: '2026-05-23', clientTime: '18:00' }).expect(200);
    wallet = await request(app).get('/api/wallet?clientDate=2026-05-23&clientTime=18:00')
      .set(auth).expect(200);
    assert.equal(wallet.body.wallet.starsCollected, 5);

    // At 21:30 the star is counted
    wallet = await request(app).get('/api/wallet?clientDate=2026-05-23&clientTime=21:30')
      .set(auth).expect(200);
    assert.equal(wallet.body.wallet.starsCollected, 6);

    // Past-date star is read-only — server rejects edits
    const reject = await request(app).put('/api/days/2026-05-15/star').set(auth)
      .send({ earned: false, clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(reject.status, 422);
    assert.equal(reject.body.error.code, 'star_not_today');

    // GET /api/days exposes star status for any date (read-only display)
    const day15 = await request(app).get('/api/days/2026-05-15').set(auth).expect(200);
    assert.equal(day15.body.day.star.earned, true);
  });
});
