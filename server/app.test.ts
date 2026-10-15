import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import request from 'supertest'
import { createApp } from './app.js'
import { openDatabase } from './database.js'

let db: ReturnType<typeof openDatabase>
let app: ReturnType<typeof createApp>
const headers = { 'X-Tracker-Request': '1', 'Content-Type': 'application/json' }
const application = { company: 'Research Lab', role: 'Research Scientist', appliedOn: '2026-10-14', salary: 95000, currency: 'EUR', jobListingText: 'We are looking for a research scientist.' }
const interview = { stage: 'Research presentation', date: '2026-10-20', time: '14:30', questions: 'How did you validate your research?', notes: 'Discuss the control group.' }

beforeEach(() => {
  db = openDatabase(':memory:')
  app = createApp(db)
})
afterEach(() => db.close())

test('application create, read, update, and delete preserve all supplied fields', async () => {
  const created = await request(app).post('/api/applications').set(headers).send(application).expect(201)
  const id = created.body.id
  assert.equal(created.body.salary, 95000)
  assert.equal(created.body.status, 'Applied')
  const list = await request(app).get('/api/applications').expect(200)
  assert.equal(list.body.length, 1)
  const updated = await request(app).put(`/api/applications/${id}`).set(headers).send({ ...application, status: 'Interviewing', stage: 'Research presentation', notes: 'Prepare slides', followUpOn: '2026-10-18' }).expect(200)
  assert.equal(updated.body.status, 'Interviewing')
  assert.equal(updated.body.notes, 'Prepare slides')
  const detail = await request(app).get(`/api/applications/${id}`).expect(200)
  assert.equal(detail.body.followUpOn, '2026-10-18')
  await request(app).delete(`/api/applications/${id}`).set(headers).expect(204)
  await request(app).get(`/api/applications/${id}`).expect(404)
})

test('multiple interviews keep their own questions and cascade on application deletion', async () => {
  const created = await request(app).post('/api/applications').set(headers).send(application)
  const path = `/api/applications/${created.body.id}`
  const first = await request(app).post(`${path}/interviews`).set(headers).send(interview).expect(201)
  await request(app).post(`${path}/interviews`).set(headers).send({ ...interview, stage: 'Final round', questions: 'What would you work on next?' }).expect(201)
  const detail = await request(app).get(path)
  assert.equal(detail.body.interviews.length, 2)
  assert.equal(detail.body.interviews[1].questions, interview.questions)
  await request(app).put(`${path}/interviews/${first.body.id}`).set(headers).send({ ...interview, outcome: 'Passed' }).expect(200)
  const all = await request(app).get('/api/interviews')
  assert.equal(all.body[0].outcome, 'Passed')
  await request(app).delete(path).set(headers).expect(204)
  assert.equal((await request(app).get('/api/interviews')).body.length, 0)
})

test('interview ownership is checked for edits and deletion', async () => {
  const first = await request(app).post('/api/applications').set(headers).send(application)
  const second = await request(app).post('/api/applications').set(headers).send(application)
  const round = await request(app).post(`/api/applications/${first.body.id}/interviews`).set(headers).send(interview)
  const wrongPath = `/api/applications/${second.body.id}/interviews/${round.body.id}`
  await request(app).put(wrongPath).set(headers).send(interview).expect(404)
  await request(app).delete(wrongPath).set(headers).expect(404)
  await request(app).delete(`/api/applications/${first.body.id}/interviews/${round.body.id}`).set(headers).expect(204)
})

test('invalid fields, impossible dates, unsafe URLs and malformed requests are rejected', async () => {
  for (const invalid of [{ company: ' ' }, { salary: -1 }, { appliedOn: '2026-02-30' }, { jobUrl: 'javascript:alert(1)' }, { status: 'Unknown' }, { contactEmail: 'bad email' }, { currency: 'CHF' }, { surprise: 'field' }]) {
    await request(app).post('/api/applications').set(headers).send({ ...application, ...invalid }).expect(400)
  }
  await request(app).post('/api/applications').set(headers).send({ ...application, jobListingText: '', jobListingScreenshot: '' }).expect(400)
  await request(app).post('/api/applications').set(headers).send({ ...application, jobListingText: '', jobListingScreenshot: 'data:image/png;base64,aGVsbG8=' }).expect(201)
  await request(app).post('/api/applications').set(headers).send({ ...application, jobListingText: '', jobListingScreenshot: 'data:image/svg+xml;base64,aGVsbG8=' }).expect(400)
  await request(app).post('/api/applications').set(headers).send('{').expect(400)
  await request(app).post('/api/applications').set(headers).send({ ...application, notes: 'x'.repeat(9_000_000) }).expect(413)
  await request(app).get('/api/applications/1oops').expect(404)
  await request(app).post('/api/applications/999/interviews').set(headers).send(interview).expect(404)
  const created = await request(app).post('/api/applications').set(headers).send(application)
  await request(app).post(`/api/applications/${created.body.id}/interviews`).set(headers).send({ ...interview, time: '25:99' }).expect(400)
})

test('browser cross-site requests and foreign hosts cannot access local data', async () => {
  await request(app).post('/api/applications').send(application).expect(403)
  await request(app).delete('/api/applications/1').expect(403)
  await request(app).get('/api/applications').set('Host', 'attacker.example').expect(403)
  await request(app).get('/api/applications').set('Sec-Fetch-Site', 'cross-site').expect(403)
  const response = await request(app).get('/api/applications').expect(200)
  assert.equal(response.headers['cache-control'], 'no-store')
})

test('CSV escapes spreadsheet formulas and includes interview notes', async () => {
  const created = await request(app).post('/api/applications').set(headers).send({ ...application, company: '=DANGEROUS()', notes: 'Line one, quoted "text"\nLine two' })
  await request(app).post(`/api/applications/${created.body.id}/interviews`).set(headers).send(interview)
  const exported = await request(app).get('/api/export/applications.csv').expect(200)
  assert.match(exported.text, /'=DANGEROUS\(\)/)
  assert.match(exported.text, /""text""/)
  const rounds = await request(app).get('/api/export/interviews.csv').expect(200)
  assert.match(rounds.text, /How did you validate your research/)
  await request(app).get('/api/export/unknown.csv').expect(404)
})

test('supported salary currencies are accepted and listing archive survives reopen', async () => {
  for (const currency of ['USD', 'GBP', 'EUR']) {
    const created = await request(app).post('/api/applications').set(headers).send({ ...application, currency })
    assert.equal(created.body.currency, currency)
  }
  const directory = mkdtempSync(join(tmpdir(), 'listing-test-'))
  const filename = join(directory, 'data.sqlite')
  let disk = openDatabase(filename)
  try {
    const created = await request(createApp(disk)).post('/api/applications').set(headers).send({ ...application, jobListingText: 'Archived listing text', jobListingScreenshot: 'data:image/png;base64,aGVsbG8=' }).expect(201)
    disk.close()
    disk = openDatabase(filename)
    const saved = await request(createApp(disk)).get(`/api/applications/${created.body.id}`).expect(200)
    assert.equal(saved.body.jobListingText, 'Archived listing text')
    assert.equal(saved.body.jobListingScreenshot, 'data:image/png;base64,aGVsbG8=')
  } finally {
    disk.close()
    rmSync(directory, { recursive: true, force: true })
  }
})

test('records survive closing and reopening the SQLite file', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'tracker-test-'))
  const filename = join(directory, 'data.sqlite')
  let disk = openDatabase(filename)
  try {
    const diskApp = createApp(disk)
    const created = await request(diskApp).post('/api/applications').set(headers).send(application).expect(201)
    await request(diskApp).post(`/api/applications/${created.body.id}/interviews`).set(headers).send(interview).expect(201)
    disk.close()
    disk = openDatabase(filename)
    const response = await request(createApp(disk)).get(`/api/applications/${created.body.id}`).expect(200)
    assert.equal(response.body.company, application.company)
    assert.equal(response.body.interviews[0].questions, interview.questions)
  } finally {
    disk.close()
    rmSync(directory, { recursive: true, force: true })
  }
})

test('database backup downloads a SQLite file', async () => {
  await request(app).post('/api/applications').set(headers).send(application)
  const response = await request(app).get('/api/backup').expect(200)
  assert.match(response.headers['content-disposition'], /job-tracker.sqlite/)
  assert.equal(response.body.subarray(0, 15).toString(), 'SQLite format 3')
})