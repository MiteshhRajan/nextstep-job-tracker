# Contributing to Nextstep

Thanks for helping improve Nextstep.

## Local setup

Use Node.js 20, 22, or 24 and run:

```sh
npm ci
npm run dev
```

The app is intentionally localhost-only. Do not commit database files, backups, screenshots containing private information, credentials, OAuth tokens, or `.env` files.

## Before opening a pull request

```sh
npm test
npm run lint
npm run build
```

For UI changes, check both light and dark themes and test a narrow mobile viewport. For application data changes, add or update API tests covering validation, persistence, and backups.

## Pull requests

- Explain the user problem and the smallest useful change.
- Include screenshots for visible UI changes.
- Keep Gmail integration, authentication, and hosting changes separate from tracker CRUD changes.
- Update `README.md` when setup, data, or privacy behavior changes.
- Never include real job applications, recruiter contact details, emails, or job-listing screenshots in commits.
