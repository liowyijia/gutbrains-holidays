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

Use the previous/next controls for November, December, and January, filter by member, toggle days away. Each task shows its title and member's name. Days away appear as neutral text labeled “Away”. Crowded dates have a “more” button opening the day's full agenda. **Your days away** and **Season overview** expand below the main calendar. The season overview shows only lab members’ days away; responsibilities stay in the month calendar. Existing task records and holiday schedules are retained. These entries retain the member as the responsibility’s owner. Helper coverage records who is taking over on specific dates after members arrange help themselves.

Responsibilities use the existing trusted, name-only editing model. Anyone with the link can select any profile; selecting a name is not authentication. Responsibility entries are stored in the existing D1 database, linked by stable profile ID, and survive profile renames. They refresh every 30 seconds. Edits and removals use revisions to reject stale writes. The appended migration adds a separate table and leaves existing responses unchanged.

Verification (disposable local database only):

- `node node_modules/typescript/bin/tsc --noEmit`
- `node --test scripts/test-task-calendar.mjs`
- `CALENDAR_TEST_URL=http://127.0.0.1:5173 python3 scripts/test-calendar-api.py`
- `CALENDAR_TEST_URL=http://127.0.0.1:5173 python3 scripts/test-responsibilities-api.py`

Publish the Sites backend, including its migration, before pushing the updated `docs/` interface to GitHub Pages. Never run write tests against production, or commit local database state.

## Helper coverage

Open your responsibility, choose **Add helper** under **Helped by**, select a saved lab member, and set **Cover from** and **Cover through** within the task’s dates. Multiple helpers can cover different, non-overlapping date ranges. The owner remains responsible for arranging help before entering it. The calendar displays `Claire > Lingyan` only on Lingyan’s coverage dates, and `Claire` on other dates. Member filters also include helpers on their coverage dates; CSV exports include helper names and date ranges. The season overview remains days-away-only.

If the selected helper has days away recorded during a coverage period, the popup asks the owner to check availability. This is an informational warning; the app does not send requests or claim a helper has accepted.

Coverage is stored atomically with the responsibility using its existing revision check. The appended migration adds a JSON text column with a constant empty-array default; existing tasks retain their data. Older cached clients that omit coverage on update preserve saved coverage; explicitly sending an empty array removes it. Coverage dates must remain inside the task, cannot overlap, and must reference an existing profile other than the owner.

Additional local checks:

- `node --test scripts/test-task-coverage.mjs`
- `CALENDAR_TEST_URL=http://127.0.0.1:5173 python3 scripts/test-coverage-api.py`

## Ownership and coverage

Members enter all of their year-end responsibilities, including tasks they will handle themselves. The task form identifies its responsibility owner, followed by **Coverage while away**. If the owner’s recorded days away overlap a task without a helper for those dates, the calendar shows **Coverage to arrange** and the popup lists the outstanding dates. These are derived from existing days-away and coverage records; the app does not assign helpers automatically.

Responsibility cards keep the existing palette with distinct assignments for the seven lab profiles: Naama lilac, Zach teal, Lingyan original orange (`#fae8db`), Claire rose, Caleb blue (`#e1ecf7`), Elizabeth green, and Maya gold. These assignments use stable profile IDs and survive renaming. Days-away entries are neutral, and the season timeline distinguishes your saved days from other members’ days away. Coverage cards keep the original owner’s color and show `Owner > Helper` on covered dates.

## Clean month design

The lab calendar uses uniform white date cells, unfilled weekday headings, and subtle neutral grid lines. Each month shows only the complete Sunday–Saturday weeks containing dates from that month. November 2026 has five rows, ending December 5; a separate December-only week is not included. Adjacent-month dates are shown with month labels, such as “Dec 1”, on the same background. Dates inside the planning period can open the task editor and take part in drag selection. Dates outside the November 15–January 10 planning period use muted date numbers and remain disabled, with the planning range displayed above the calendar. Today is marked with a small neutral dot; drag selection uses a neutral highlight. Member responsibility colors and existing task, helper coverage, days-away, and filter workflows are retained. Full task labels remain available on small screens through horizontal scrolling.

The page uses one **Lab Calendar** title, plain numbered instructions ending in periods, and an expandable **Your days away** section. The Today shortcut, task CSV export control, duplicate days-away heading, and task-save success message are removed.
