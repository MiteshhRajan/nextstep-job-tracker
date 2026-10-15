import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export function openDatabase(filename: string) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 })
  const db = new Database(filename)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      appliedOn TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Applied',
      stage TEXT NOT NULL DEFAULT 'Not started',
      salary REAL,
      currency TEXT NOT NULL DEFAULT 'USD',
      salaryPeriod TEXT NOT NULL DEFAULT 'year',
      location TEXT NOT NULL DEFAULT '',
      jobUrl TEXT NOT NULL DEFAULT '',
      contactName TEXT NOT NULL DEFAULT '',
      contactEmail TEXT NOT NULL DEFAULT '',
      followUpOn TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      jobListingText TEXT NOT NULL DEFAULT '',
      jobListingScreenshot TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicationId INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL DEFAULT '',
      interviewer TEXT NOT NULL DEFAULT '',
      outcome TEXT NOT NULL DEFAULT 'Scheduled',
      questions TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS interviews_application ON interviews(applicationId);
    PRAGMA user_version = 1;
  `)
  const columns = new Set((db.pragma('table_info(applications)') as Array<{ name: string }>).map(column => column.name))
  if (!columns.has('jobListingText')) db.exec("ALTER TABLE applications ADD COLUMN jobListingText TEXT NOT NULL DEFAULT ''")
  if (!columns.has('jobListingScreenshot')) db.exec("ALTER TABLE applications ADD COLUMN jobListingScreenshot TEXT NOT NULL DEFAULT ''")
  return db
}