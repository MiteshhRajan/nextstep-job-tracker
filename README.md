# Nextstep

A personal job application tracker built with React, Node.js, Express, and SQLite. Runs on localhost without accounts, subscriptions, or external APIs.

## Contents

- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Your first application](#your-first-application)
- [Everyday use](#everyday-use)
- [Run the built app](#run-the-built-app)
- [Included features](#included)
- [Configuration](#configuration)
- [Data and backups](#data-and-backups)
- [Troubleshooting](#troubleshooting)
- [Security and hosting](#security-and-hosting-boundary)
- [Student hosting options](#student-hosting-options)
- [Future Gmail integration](#future-gmail-integration)
- [Open-source resources](#open-source-resources)
- [Development checks](#development-checks)
- [Project structure](#project-structure)

## Prerequisites

- A supported [Node.js LTS release](https://nodejs.org/en/download), with npm. Node 24 is recommended; this project was also tested with Node 20.20.2.
- A modern browser, such as Firefox, Chrome, Edge, or Safari.
- A terminal and a writable project folder. VS Code is optional.
- An internet connection for the initial package installation. After installation, the core tracker runs locally without an internet connection.

You do **not** need a separate SQLite installation, a database account, Docker, a hosting account, a Gmail connection, or an API key.

Check your installed tools:

```sh
node --version
npm --version
```

Run all commands from the project root, the folder containing `package.json` and `package-lock.json`. The setup script works from Windows PowerShell, Windows Command Prompt, Linux, macOS, and WSL. It uses `npm.cmd` automatically on Windows and `npm` on Unix-like systems.

## Quick start

1. Open the `app_tracking` folder in VS Code and choose **Terminal > New Terminal**, or navigate to that folder in your own terminal.
2. Run the one-file cross-platform setup script. It checks Node.js, installs the exact dependency versions, runs lint/tests/build, and leaves your database untouched:

```text
node setup.mjs
```

3. Start the frontend and backend together:

```sh
npm run dev
```

4. Open **http://localhost:5173** in your browser.

The first page is your Applications workspace. It starts empty, and the SQLite database is created automatically when the backend starts. No signup or database setup is required.

Keep the terminal running while using the app. Press **Ctrl+C** to stop both servers; closing the browser alone does not stop them. Vite selects another port if 5173 is occupied, so use the URL it prints in that case.

If using VS Code through WSL or Remote SSH, open the frontend through the **Ports** panel when localhost is not directly accessible. Keep forwarded ports private, never public.

## Your first application

1. Select **Add application** at the top of the Applications page.
2. Enter the required company name, role, and date applied.
3. Choose the status and current interview stage. Optionally enter location, the job posting URL, and recruiter contact details.
4. Enter the salary expectation you mentioned and choose **USD**, **GBP**, or **EUR**. Also choose whether it is per year, month, or hour. Leave the amount blank if you have not mentioned a salary.
5. In **Job listing archive**, paste the job description, upload a PNG/JPEG/WebP screenshot, or do both. This is required so the listing remains available after the company removes it. Screenshots are limited to 5 MB.
6. Add a follow-up date and notes, then select **Save application**. Clicking the backdrop outside a form will not discard your entered information; use Cancel or the close button when you want to leave.
7. Open the saved application by selecting its company name or arrow button.
8. Select **Add interview** to record an interview date, stage, questions, answers, and notes. Add each interview round separately to preserve its history.

Use **Edit** in the application details to update its status, salary expectation, or current stage. Interview outcomes are edited independently. Delete actions ask for confirmation; deleting an application also deletes all its interviews.

## Everyday use

- **Applications:** search by company, role, location, contact name, or application notes; filter by status; sort by date or company.
- **Interviews:** search across company, role, stage, interview questions, and notes; filter scheduled interviews or other outcomes.
- **Insights:** see the current status distribution and interview totals.
- **Coming up:** see scheduled interviews for active applications. Interview times are stored as the local clock time entered, without timezone conversion.
- **Follow-ups:** review the dates you entered, including overdue items. Clear or change a follow-up date using the application edit form after handling it. These are in-app reminders, not email or desktop notifications.
- **Appearance:** use the sun/moon button at the top right to switch themes. Your choice is remembered separately in each browser and site address.
- **Export CSV:** download all applications or all interviews from their respective views. Export does not apply the current search or filters.

Your records remain on disk when you close the browser or stop the server. To use the app again, open a terminal in the project folder, run `npm run dev`, and reopen the displayed URL. There is no need to reinstall packages or rebuild on every launch in development mode.

## Run the built app

For normal local use without the development server, Node.js can serve the compiled frontend and API together. Stop `npm run dev` first, then run:

```sh
npm run build
npm start
```

Open **http://localhost:3001** and keep that terminal running. On later launches, just run `npm start`; rebuild after changing frontend code. `npm run preview` is an alias for `npm start`, not a separate Vite preview server.

Development and built modes use the same database unless you change `DATABASE_PATH`. Do not run both on the same API port simultaneously. A successful build does not make the app safe for public hosting; see the security section below.

## Included

- Create, view, edit, and delete applications: company, role, date applied, status, current stage, salary expectation in USD/GBP/EUR, salary period, location, posting URL, recruiter, follow-up date, notes, and a required job-listing archive.
- Preserve removed job listings by pasting their text, uploading a PNG/JPEG/WebP screenshot, or saving both. Listing screenshots and text are included in the SQLite database backup and application CSV export.
- Record multiple interview rounds, each with a date, optional local time, stage, interviewer, outcome, questions, and answers/notes.
- Search applications and interview questions, filter by status/outcome, and sort applications.
- Upcoming interviews, follow-up dates, and application pipeline summaries.
- Separate application and interview CSV exports. Each export includes all records of that type, regardless of the current filters.
- Full SQLite database download, including interviews and notes.
- Light/dark button at the top right. Starts with the system preference and remembers the selected theme in this browser.
- Responsive layouts and keyboard-accessible dialogs.

Application status and current stage are edited manually. Recording an interview or changing its outcome does not automatically overwrite either field. Gmail integration is not implemented yet.

## Configuration

Configuration is optional. Defaults work without creating any extra files.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | `data/applications.sqlite` under the project root | SQLite file to use. Prefer an absolute path for a custom location. A new file and its parent directories are created if missing. |
| `API_PORT` | `3001` | Backend port; also configures Vite's API proxy in development. Takes precedence over `PORT` on the backend. |
| `PORT` | `3001` when `API_PORT` is unset | Alternative backend port, useful with `npm start`. Use `API_PORT` for development so the frontend proxy matches. |

For example, if backend port 3001 is occupied:

```sh
API_PORT=3002 npm run dev
```

The frontend still uses port 5173 or the next available port. For the built app on another port:

```sh
PORT=3002 npm start
```

Open `http://localhost:3002` in that case. Environment variables in these examples apply only to that command; supply the same custom database path each time you launch the app.

`.env` files are **not** loaded automatically. Set variables in your shell or launch command. The servers intentionally bind only to `127.0.0.1`; there is no public-host option.

## Data and backups

The database is created automatically at `data/applications.sqlite`. No sample records are inserted. The server enables foreign keys, uses SQLite WAL mode, and restricts newly created file permissions on Linux. Database files and environment files are ignored by Git.

Use **Download backup** in the sidebar (database icon on mobile). It creates a consistent database snapshot, including uncheckpointed WAL writes. Store backups somewhere private and separate from this project. CSV is useful for spreadsheets, but the database backup is the complete copy of your records.

To open a downloaded backup without overwriting your existing data:

1. Stop the running app with Ctrl+C.
2. Put the backup in a private folder.
3. Start the app with its absolute path:

```sh
DATABASE_PATH="/absolute/path/to/job-tracker.sqlite" npm run dev
```

This runs directly against that backup file. There is no browser-based import/restore operation. Do not replace a live SQLite file or copy only its main file while WAL writes are active. Theme preference is browser-local and is not part of the database backup.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `node` or `npm` is not found | Install Node.js LTS, reopen the terminal, and check `node --version` and `npm --version`. |
| `npm ci` cannot find the project | Open a terminal in the directory containing `package.json` and `package-lock.json`, not in `src/` or `server/`. |
| Native SQLite package installation fails | Use a supported Node.js LTS release and rerun `npm ci`. If a prebuilt binary is unavailable, the `better-sqlite3` build may require Python, a C/C++ compiler, and make. Check the first error in the install output; do not delete your database to fix package installation. |
| `EADDRINUSE` or backend port 3001 is occupied | Stop another copy of this app, or run `API_PORT=3002 npm run dev`. For built mode, use `PORT=3002 npm start`. |
| Port 5173 is already in use | Open the alternative frontend URL printed by Vite. Do not stop an unrelated service. |
| The page loads but data requests fail | Check that the API process is still running. `npm run dev` should start both processes. Use `API_PORT`, not only `PORT`, when changing ports in development. |
| `npm start` shows an old page or `Cannot GET /` | Run `npm run build`, then restart `npm start`. The built server needs the `dist/` output. |
| A form will not save | Complete required fields, archive the job listing by pasting text or uploading a PNG/JPEG/WebP screenshot, use a nonnegative salary with USD/GBP/EUR, and use an `http://` or `https://` job URL. |
| The database appears empty | Confirm the launch command uses the expected `DATABASE_PATH`. A typo can create a new empty database. Do not overwrite either file before checking your backups. |
| SQLite reports a permission or read-only error | Choose a writable database folder. SQLite also needs permission to create its WAL files beside the database. |
| A LAN IP address, public tunnel, or remote hostname is rejected | This is intentional. Use localhost or a private local port forward. Public access requires the security changes described below. |
| Theme preference seems to reset | Browser storage may be disabled, cleared, or private. `localhost`, `127.0.0.1`, and different ports each have separate browser preferences. |

After a failed save or interrupted connection, reload the application list and check whether the record was saved before submitting it again.

## Security and hosting boundary

This is a **single-user, localhost-only application**, not an authenticated public service. Both servers bind to `127.0.0.1`. The API rejects foreign hostnames and cross-site browser requests, requires a custom header on writes, validates inputs, uses parameterized SQL, sets security headers, and prevents spreadsheet formula execution in CSV exports.

There is no account login, database encryption, or multi-user isolation. Other users or programs with access to your machine may still access your records. Do not expose the app through a public tunnel or deploy it publicly as-is. Public deployment needs authentication/authorization, HTTPS, appropriate host/origin configuration, persistent storage, and scheduled backups first.

## Student hosting options

Official offers checked **October 14, 2026**. Eligibility, prices, and offers can change; confirm terms before provisioning anything. Cloud hosting companies are services, not necessarily open-source software. The application's software stack remains open-source and does not require their services.

| Option | Student benefit | Fit for this application |
| --- | --- | --- |
| [GitHub Student Developer Pack](https://education.github.com/pack) | A verified student account unlocks partner offers. Degree enrollment includes university study; current enrollment evidence may be required. | Start here to access Heroku and other benefits. GitHub Pages alone cannot run Node.js or a writable SQLite backend. |
| [Heroku for GitHub Students](https://www.heroku.com/github-students/) | $13/month in platform credits for 24 months. Requires age 18+, a verified GitHub student account, approval, and a credit/debit card. Unused monthly credits do not roll over; overages and use after expiry are charged. | Good managed-hosting option **after migrating SQLite to PostgreSQL** and adding authentication. The offer page lists $5/month Eco dynos and $5/month Mini Postgres as an example within the allowance. |
| [Azure for Students](https://azure.microsoft.com/en-us/free/students) | $100 credit usable within 12 months, no credit card required, with annual renewal while eligible. Intended for full-time university students. | A small Linux VM with a persistent local disk can keep SQLite. VM, disk, networking, and backup charges still consume the allowance; check pricing and spending limits. Requires more server administration. |
| University-provided hosting | Some departments offer student VMs or research computing access; availability and acceptable use vary. | Ask university IT whether a personal application is permitted. A persistent Linux VM can support this stack. This is not a verified entitlement at your institution. |

**Recommendation:** keep using localhost now. For future hosting while retaining SQLite, look at an eligible Azure VM or university VM with persistent storage. Choose Heroku if you prefer managed deployment and are happy to move to PostgreSQL.

[Heroku's SQLite documentation](https://devcenter.heroku.com/articles/sqlite3) explains why dyno-local SQLite files are unsuitable: the filesystem is ephemeral, and files can be lost on restarts/redeployments. Do not put your only database there. A migration to PostgreSQL has not been implemented in this version.

The old DigitalOcean student URL redirected to its general homepage when checked, so no current student credit is assumed here.

To apply for GitHub Education, follow the [official eligibility and application guide](https://docs.github.com/en/education/about-github-education/github-education-for-students/apply-to-github-education-as-a-student). A current enrollment letter, transcript, or dated student ID may be used; an academic email may also be required. PhD enrollment can meet the degree-program criterion, subject to verification.

## Future Gmail integration

Keep email synchronization separate from application CRUD. A future implementation can use Google OAuth with least-privilege Gmail scopes, securely store tokens server-side, deduplicate by Gmail message ID, match email threads to applications, and present proposed updates for confirmation. No email access or credentials are requested by this version. Automated polling only runs while the app or a dedicated worker is running. Public OAuth distribution may require additional Google verification.

## Open-source resources

React, Vite, Express, better-sqlite3, Zod, Helmet, csv-stringify, and the development/test tools are open-source packages. SQLite is public domain. Lucide supplies the icons; DM Sans and Manrope are open-font resources bundled locally via Fontsource. No remote font CDN, analytics, paid UI kit, or proprietary runtime API is used. Dependency license texts are distributed with their packages.

## Development checks

```sh
npm test
npm run lint
npm run build
```

The API tests cover application and interview CRUD, ownership, deletion cascades, invalid input, localhost request protections, CSV escaping, database backup, and persistence after reopening SQLite. Browser workflows were also checked manually with Playwright across desktop and mobile widths, including theme persistence, forms, edits, filters, interview search, exports, and deletion.

## GitHub launch preparation

Suggested repository name: **`nextstep-job-tracker`**. It is short, descriptive, easy to search, and matches the app name. Alternatives are `nextstep-applications`, `job-application-notebook`, and `career-pipeline-tracker`.

This repository includes a Node 20/22/24 GitHub Actions matrix in `.github/workflows/ci.yml` and contribution guidance in `CONTRIBUTING.md`. Those checks improve trust for visitors and catch regressions on pull requests.

Before publishing, consider adding a real light-mode and dark-mode screenshot, a short demo GIF, repository topics such as `job-tracker`, `job-application-tracker`, `react`, `nodejs`, `sqlite`, and `open-source`, an MIT `LICENSE`, and a first release with a clear changelog. These improve discoverability and conversion from a visitor to a star, but no technique can guarantee stars or follows. Never publish real application data or job screenshots.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the committed lockfile. |
| `npm run dev` | Start the frontend and backend with change watching. |
| `npm run build` | Typecheck frontend/backend code and create the compiled frontend. |
| `npm start` | Serve the built frontend and API on localhost. |
| `npm run preview` | Alias for `npm start`; build first. |
| `npm test` | Run the backend tests using isolated temporary/in-memory databases, not your application database. |
| `npm run lint` | Run Oxlint checks. |

## Project structure

```text
app_tracking/
	src/                  React interface, forms, dialogs, and theme styles
	shared/schema.ts      Shared validation rules and TypeScript types
	server/
		index.ts            Local server startup and environment configuration
		app.ts              API endpoints and request protections
		database.ts         SQLite setup and tables
		app.test.ts         Automated backend tests
	data/                 Your SQLite database; created at runtime, ignored by Git
	dist/                 Compiled frontend; generated by npm run build
	public/               Static assets
	package.json          Dependencies and npm commands
	package-lock.json     Reproducible dependency versions
	vite.config.ts        Frontend development server and API proxy
	README.md             This guide
```

Back up your data before updating the application. After a dependency change, run `npm ci`; after frontend changes, rebuild before using `npm start`. Never publish database files, downloaded backups, or future OAuth credentials with the source code.
