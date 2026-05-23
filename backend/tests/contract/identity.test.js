import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, applySchema } from '../../src/db/index.js';
import { createApp } from '../../src/app.js';

function makeApp() {
  const db = openDb(':memory:');
  applySchema(db);
  const app = createApp(db, { serverSecret: 'test-secret' });
  return { app, db };
}

const today = '2026-05-23';

describe('POST /api/children — first-use setup', () => {
  test('201 returns sessionToken + child on valid input', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/children')
      .send({ name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today });
    assert.equal(res.status, 201);
    assert.ok(res.body.sessionToken);
    assert.equal(res.body.child.name, 'Mia');
    assert.equal(res.body.child.createdDate, today);
  });

  test('409 access_code_taken on duplicate (case/space-insensitive)', async () => {
    const { app } = makeApp();
    await request(app)
      .post('/api/children')
      .send({ name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'a', createdDate: today });
    const res = await request(app)
      .post('/api/children')
      .send({ name: 'Lee', accessCode: ' BLUEFISH ', recoveryAnswer: 'b', createdDate: today });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'access_code_taken');
  });

  test('400 invalid_input on missing fields', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/children').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'invalid_input');
  });
});

describe('POST /api/sessions — login', () => {
  test('200 returns sessionToken + child for valid code', async () => {
    const { app } = makeApp();
    await request(app)
      .post('/api/children')
      .send({ name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today });
    const res = await request(app).post('/api/sessions').send({ accessCode: 'BlueFish' });
    assert.equal(res.status, 200);
    assert.ok(res.body.sessionToken);
    assert.equal(res.body.child.name, 'Mia');
  });

  test('401 invalid_access_code for unknown code', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/sessions').send({ accessCode: 'nope' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'invalid_access_code');
  });
});

describe('POST /api/recovery', () => {
  test('200 recovers with name + answer + new code; new code logs in', async () => {
    const { app } = makeApp();
    await request(app)
      .post('/api/children')
      .send({ name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today });
    const res = await request(app)
      .post('/api/recovery')
      .send({ name: 'Mia', recoveryAnswer: 'oak park', newAccessCode: 'pinkshell' });
    assert.equal(res.status, 200);
    assert.ok(res.body.sessionToken);
    const login = await request(app).post('/api/sessions').send({ accessCode: 'pinkshell' });
    assert.equal(login.status, 200);
  });

  test('401 recovery_no_match for wrong answer', async () => {
    const { app } = makeApp();
    await request(app)
      .post('/api/children')
      .send({ name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today });
    const res = await request(app)
      .post('/api/recovery')
      .send({ name: 'Mia', recoveryAnswer: 'wrong', newAccessCode: 'pinkshell' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'recovery_no_match');
  });

  test('409 recovery_ambiguous when two children match name+answer', async () => {
    const { app } = makeApp();
    await request(app).post('/api/children').send({ name: 'Mia', accessCode: 'a1', recoveryAnswer: 'Oak Park', createdDate: today });
    await request(app).post('/api/children').send({ name: 'Mia', accessCode: 'a2', recoveryAnswer: 'Oak Park', createdDate: today });
    const res = await request(app).post('/api/recovery')
      .send({ name: 'Mia', recoveryAnswer: 'Oak Park', newAccessCode: 'a3' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'recovery_ambiguous');
  });
});

describe('/api/children/me — authenticated', () => {
  async function withChild() {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/children')
      .send({ name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today });
    return { app, token: res.body.sessionToken };
  }

  test('GET 200 returns profile', async () => {
    const { app, token } = await withChild();
    const res = await request(app).get('/api/children/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.child.name, 'Mia');
  });

  test('GET 401 without token', async () => {
    const { app } = await withChild();
    const res = await request(app).get('/api/children/me');
    assert.equal(res.status, 401);
  });

  test('PATCH updates the name', async () => {
    const { app, token } = await withChild();
    const res = await request(app)
      .patch('/api/children/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mia Rose' });
    assert.equal(res.status, 200);
    assert.equal(res.body.child.name, 'Mia Rose');
  });

  test('DELETE returns 204 and invalidates the token', async () => {
    const { app, token } = await withChild();
    const del = await request(app).delete('/api/children/me').set('Authorization', `Bearer ${token}`);
    assert.equal(del.status, 204);
    const get = await request(app).get('/api/children/me').set('Authorization', `Bearer ${token}`);
    assert.equal(get.status, 401);
  });
});
