import express from 'express'
import type { ErrorRequestHandler } from 'express'
import type Database from 'better-sqlite3'
import helmet from 'helmet'
import { stringify } from 'csv-stringify/sync'
import { mkdtemp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ZodError } from 'zod'
import { applicationSchema, interviewSchema } from '../shared/schema.js'
import type { Application, Interview } from '../shared/schema.js'

export function createApp(db: Database.Database, staticDirectory?: string) {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet({ contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } } }))
  app.use((request, response, next) => {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(request.hostname)) {
      response.status(403).json({ error: 'This tracker is only available on localhost.' })
      return
    }
    if (request.path.startsWith('/api')) {
      response.setHeader('Cache-Control', 'no-store')
      if (!['GET', 'HEAD'].includes(request.method) &&
          (request.get('X-Tracker-Request') !== '1' ||
            (['POST', 'PUT', 'PATCH'].includes(request.method) && !request.is('application/json')))) {
        response.status(403).json({ error: 'A same-origin JSON request is required.' })
        return
      }
      if (request.get('Sec-Fetch-Site') === 'cross-site') {
        response.status(403).json({ error: 'Cross-site requests are not allowed.' })
        return
      }
    }
    next()
  })
  app.use(express.json({ limit: '8mb' }))

  const findApplication = (id: string | number) => db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as Application | undefined
  const findInterviews = (id: string | number) => db.prepare('SELECT * FROM interviews WHERE applicationId = ? ORDER BY date DESC, time DESC, id DESC').all(id) as Interview[]

  app.get('/api/applications', (_request, response) => {
    response.json(db.prepare('SELECT * FROM applications ORDER BY appliedOn DESC, id DESC').all())
  })

  app.get('/api/interviews', (_request, response) => {
    response.json(db.prepare('SELECT * FROM interviews ORDER BY date ASC, time ASC, id ASC').all())
  })

  app.get('/api/export/:kind', (request, response) => {
    const applicationExport = request.params.kind === 'applications.csv'
    if (!applicationExport && request.params.kind !== 'interviews.csv') {
      response.status(404).json({ error: 'Export not found.' })
      return
    }
    const columns = applicationExport
      ? ['id', ...Object.keys(applicationSchema.shape), 'createdAt', 'updatedAt']
      : ['id', 'applicationId', 'company', 'role', ...Object.keys(interviewSchema.shape), 'createdAt']
    const rows = applicationExport
      ? db.prepare('SELECT * FROM applications ORDER BY appliedOn DESC, id DESC').all()
      : db.prepare('SELECT interviews.*, applications.company, applications.role FROM interviews JOIN applications ON applications.id = interviews.applicationId ORDER BY date DESC').all()
    response.attachment(request.params.kind).type('text/csv').send(stringify(rows, { header: true, columns, escape_formulas: true }))
  })

  app.get('/api/backup', async (_request, response, next) => {
    const directory = await mkdtemp(join(tmpdir(), 'job-tracker-'))
    try {
      const filename = join(directory, 'applications.sqlite')
      await db.backup(filename)
      response.download(filename, 'job-tracker.sqlite', error => {
        void rm(directory, { recursive: true, force: true })
        if (error && !response.headersSent) next(error)
      })
    } catch (error) {
      await rm(directory, { recursive: true, force: true })
      next(error)
    }
  })

  app.post('/api/applications', (request, response) => {
    const values = applicationSchema.parse(request.body)
    const keys = Object.keys(values)
    const result = db.prepare(`INSERT INTO applications (${keys.join(', ')}) VALUES (${keys.map(key => `@${key}`).join(', ')})`).run(values)
    response.status(201).json({ ...findApplication(Number(result.lastInsertRowid)), interviews: [] })
  })

  app.use('/api/applications/:id', (request, response, next) => {
    if (!/^\d+$/.test(request.params.id) || !findApplication(request.params.id)) {
      response.status(404).json({ error: 'Application not found.' })
      return
    }
    next()
  })

  app.get('/api/applications/:id', (request, response) => {
    response.json({ ...findApplication(request.params.id), interviews: findInterviews(request.params.id) })
  })

  app.put('/api/applications/:id', (request, response) => {
    const values = applicationSchema.parse(request.body)
    db.prepare(`UPDATE applications SET ${Object.keys(values).map(key => `${key} = @${key}`).join(', ')}, updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = @id`).run({ ...values, id: request.params.id })
    response.json({ ...findApplication(request.params.id), interviews: findInterviews(request.params.id) })
  })

  app.delete('/api/applications/:id', (request, response) => {
    db.prepare('DELETE FROM applications WHERE id = ?').run(request.params.id)
    response.status(204).end()
  })

  app.post('/api/applications/:id/interviews', (request, response) => {
    const values = interviewSchema.parse(request.body)
    const keys = Object.keys(values)
    const result = db.prepare(`INSERT INTO interviews (applicationId, ${keys.join(', ')}) VALUES (@applicationId, ${keys.map(key => `@${key}`).join(', ')})`).run({ ...values, applicationId: request.params.id })
    response.status(201).json(db.prepare('SELECT * FROM interviews WHERE id = ?').get(result.lastInsertRowid))
  })

  app.use('/api/applications/:id/interviews/:interviewId', (request, response, next) => {
    if (!/^\d+$/.test(request.params.interviewId) || !db.prepare('SELECT id FROM interviews WHERE id = ? AND applicationId = ?').get(request.params.interviewId, request.params.id)) {
      response.status(404).json({ error: 'Interview not found.' })
      return
    }
    next()
  })

  app.put('/api/applications/:id/interviews/:interviewId', (request, response) => {
    const values = interviewSchema.parse(request.body)
    db.prepare(`UPDATE interviews SET ${Object.keys(values).map(key => `${key} = @${key}`).join(', ')} WHERE id = @id AND applicationId = @applicationId`).run({ ...values, id: request.params.interviewId, applicationId: request.params.id })
    response.json(db.prepare('SELECT * FROM interviews WHERE id = ?').get(request.params.interviewId))
  })

  app.delete('/api/applications/:id/interviews/:interviewId', (request, response) => {
    db.prepare('DELETE FROM interviews WHERE id = ? AND applicationId = ?').run(request.params.interviewId, request.params.id)
    response.status(204).end()
  })

  app.use('/api', (_request, response) => response.status(404).json({ error: 'Endpoint not found.' }))
  if (staticDirectory && existsSync(join(staticDirectory, 'index.html'))) {
    app.use(express.static(staticDirectory))
    app.get('/{*path}', (_request, response) => response.sendFile(join(staticDirectory, 'index.html')))
  }

  const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({ error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') })
    } else if (error.type === 'entity.parse.failed') {
      response.status(400).json({ error: 'Invalid JSON.' })
    } else if (error.type === 'entity.too.large') {
      response.status(413).json({ error: 'The submitted data is too large.' })
    } else {
      console.error('Request failed:', error.message)
      response.status(500).json({ error: 'Something went wrong. Please try again.' })
    }
  }
  app.use(handleError)
  return app
}