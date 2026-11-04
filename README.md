# Gutbrains Holiday Schedule

Team holiday calendar for the Laboratory of Gut-Brain Neurobiology, Duke University.

**Live site:** https://liowyijia.github.io/gutbrains-holidays/

The calendar uses Sunday-first month grids, Helvetica, and the lab's blue hexagon symbol. Team members can save days away without signing in, update their own responses using private edit links, and export the shared schedule as CSV.

## GitHub Pages

GitHub Pages serves the prebuilt `docs/` directory from the `main` branch. To rebuild after changing the interface:

```sh
npm ci
npm run build:github
```

Commit and push the source changes and updated `docs/` files. No custom domain or additional hosting account is required.

## Shared responses

The GitHub page uses the calendar's existing hosted API for shared responses. GitHub Pages hosts the interface; it does not run the database. Responses and private edit tokens are never committed to this repository.

The API permits browser requests from `https://liowyijia.github.io` and still requires a private edit token for updates. The old site can forward visitors and their stored edit access to the GitHub address.

## Source

- `app/holiday-calendar.tsx`: shared calendar interface.
- `app/globals.css`: Helvetica typography and lab styling.
- `public/favicon.svg`: transparent lab symbol.
- `github-pages/`: GitHub entry point.
- `app/api/responses/route.ts`: existing backend API.
- `PROJECT.md`: project details.
- `STARTER.md`: original framework and local database setup instructions.

For local backend checks, start the normal development server and run:

```sh
CALENDAR_TEST_URL=http://127.0.0.1:5173 python3 scripts/test-calendar-api.py
```
