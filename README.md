# Gutbrains Holiday Schedule

Team holiday calendar for the Laboratory of Gut-Brain Neurobiology, Duke University.

**Live site:** https://yijialiow.com/gutbrains-holidays/

GitHub Pages uses the personal domain already configured on this GitHub account. `https://liowyijia.github.io/gutbrains-holidays/` redirects to the same page. No domain purchase or DNS change is needed for this project.

The calendar uses Sunday-first month grids, Helvetica, and the lab's blue hexagon symbol. Team members can save days away without signing in, reopen an existing profile by selecting their name from any browser, and export the shared schedule as CSV. Members can also add their own dated lab responsibilities, with a title, a single date or inclusive date range, and optional notes. Responsibilities appear on a shared month calendar, alongside days away. Click a day to add a task, drag across dates to select a range, or click a saved task to view or edit it.

## GitHub Pages

GitHub Pages serves the prebuilt `docs/` directory from the `main` branch. To rebuild after changing the interface:

```sh
npm ci
npm run build:github
```

Commit and push the source changes and updated `docs/` files. No custom domain or additional hosting account is required.

## Shared responses

The GitHub page uses the calendar's existing hosted API for shared responses. GitHub Pages hosts the interface; it does not run the database. Stored responses are never committed to this repository.

The API permits browser requests from `https://liowyijia.github.io` and `https://yijialiow.com` and uses name-only editing, as requested for a trusted shared poll: anyone with the calendar link can select and edit any profile. The old site forwards visitors and their remembered profile to the new address.

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

## Lab responsibilities

Save or select your existing profile at the top of the page, then click a day in **Lab Calendar** to add your responsibility. The popup pre-fills that day; drag across days on desktop to pre-fill an inclusive range, or set the start and end dates in the popup on any device. Click an existing task to see its details and edit or remove your own entry. On phones, the month calendar scrolls horizontally to keep day cells readable.

Use the previous/next controls for November, December, and January, filter by member, toggle days away, or export tasks as CSV. Each task shows its title and member's name. Days away have a dashed border. Crowded dates have a “more” button opening the day's full agenda. **Your days away** and **Season overview** expand below the main calendar. The season overview shows only lab members’ days away; responsibilities stay in the month calendar. Existing task records and holiday schedules are retained. These entries describe the member's own responsibilities; there are no coverage assignments.

Responsibilities use the existing trusted, name-only editing model. Anyone with the link can select any profile; selecting a name is not authentication. Responsibility entries are stored in the existing D1 database, linked by stable profile ID, and survive profile renames. They refresh every 30 seconds. Edits and removals use revisions to reject stale writes. The appended migration adds a separate table and leaves existing responses unchanged.

Verification (disposable local database only):

- `node node_modules/typescript/bin/tsc --noEmit`
- `node --test scripts/test-task-calendar.mjs`
- `CALENDAR_TEST_URL=http://127.0.0.1:5173 python3 scripts/test-calendar-api.py`
- `CALENDAR_TEST_URL=http://127.0.0.1:5173 python3 scripts/test-responsibilities-api.py`

Publish the Sites backend, including its migration, before pushing the updated `docs/` interface to GitHub Pages. Never run write tests against production, or commit local database state.
