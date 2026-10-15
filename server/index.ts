import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { openDatabase } from './database.js'
import { createApp } from './app.js'

process.umask(0o077)
const root = fileURLToPath(new URL('../', import.meta.url))
const db = openDatabase(process.env.DATABASE_PATH || resolve(root, 'data/applications.sqlite'))
const port = Number(process.env.API_PORT || process.env.PORT || 3001)
const app = createApp(db, resolve(root, 'dist'))
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Job tracker: http://localhost:${port}`)
})
server.on('error', error => {
  console.error(error.message)
  db.close()
  process.exitCode = 1
})
function shutdown() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)