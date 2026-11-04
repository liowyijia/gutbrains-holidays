# Days / Away

A shared holiday absence calendar for the Duke team. Source belongs in `Duke/04-miscellaneous/holiday_schedule/`, independently of the protein-sensing research project.

## GitHub hosting

The public team address is `https://liowyijia.github.io/gutbrains-holidays/`. GitHub Pages serves `docs/` from the `main` branch of `liowyijia/gutbrains-holidays`; `npm run build:github` rebuilds those assets. The existing Sites deployment continues to provide the shared API and D1 database, so no additional hosting account is needed. GitHub receives code and public interface assets, never the stored responses or edit tokens.

The client accepts separate API and asset bases so share links and the favicon work under the GitHub project path. The backend explicitly permits the GitHub account's origin for browser API access. Private edit-token checks, revision checks, and the stored response data are preserved. The optional `destinationUrl` property forwards old-site visitors to GitHub with their existing edit capability in the URL fragment.

## Prototype scope

- November 23, 2026 through January 10, 2027, inclusive; all dates represent whole calendar days, including weekends.
- Month grids start on Sunday. Changing the weekday order does not shift the stored date values or the seasonal date range.
- Name-based responses; no sign-in. A public calendar link shows everyone's saved schedules.
- Each response has a random private edit token. Only its SHA-256 hash is stored in D1. The plain token is returned once at creation, retained in browser storage, and included in an optional private edit link's fragment. Keep that link private.
- Click or drag to select days on desktop; click/tap or add a date range on other devices. Zero-day responses explicitly indicate no planned time away.
- Shared timeline, 30-second refresh, CSV export, duplicate-name checks, and revision checks to prevent accidental concurrent overwrites.
- Responses are stored in the Site's D1 database, never in the research repository. Browser storage holds edit access only.

## Design direction

Near-white paper, near-black type, thin grid lines, no shadows or decorative imagery. The lab's soft blue (visually matched to the supplied website screenshots as `#7da5c9`) is the accent and denotes the visitor's selection, with dark selected-day text and darker blue borders for contrast. Helvetica is used throughout, including headings, calendar dates, and small labels, as explicitly requested by the user. Arial and generic sans serif are fallbacks on devices without Helvetica. Colors, spacing, and responsive layouts are in `app/globals.css`.

The header and favicon share `public/favicon.svg`, a transparent vector recreation of the provided lab mark: an outlined blue hexagon with a smaller filled blue hexagon in its center. The mark blue is visually matched as `#5f8bb1`. Keep the mark's surrounding area and its inner gap transparent; the reference screenshot's dark background is not part of the logo. Increment the icon URL query when changing it to refresh cached browser favicons.

The page uses the direct heading “Holiday Season 2026 / 2027” and concise functional labels. Avoid taglines, promotional copy, and repeated explanations. Preserve the numbered “02 / Shared plans” label and CSV export. The header identifies the “Laboratory of Gut-Brain Neurobiology” and “Duke University,” as shown in the user's lab website screenshots. Keep the prototype's light background and calendar layout rather than adopting the reference website's dark background.

## Development

Node.js >=22.13.0 is required. Follow the Sites plugin workflow for dependency installation, builds, source synchronization, and deployment. The included starter `README.md` documents development and local D1 setup.

```
npm run dev
npm run db:generate
npm run build
```

The source manifest `.openai/hosting.json` contains this Site's identity and the `DB` binding. Reuse the Site ID on subsequent iterations. Do not create a replacement Site.

Local D1 state, dependencies, credentials, and generated output are ignored by Git. Local and hosted databases are separate. Schema migrations are tracked under `drizzle/`; do not modify a migration after deployment.

## Editing and access

The calendar is intentionally visible to anyone with its URL, as requested. New response creation is anonymous and limited to 200 names; updating a response requires its private edit token. Tokens never appear in public API responses. Creation and update requests require the same website origin. There is no name-only recovery if both browser storage and the private edit link are lost. Names are unique after whitespace normalization and case folding; people with the same name should add an initial.

This is a single-season prototype. Date configuration is in `lib/calendar.ts` and month presentation in `app/holiday-calendar.tsx`. Changing the season should be a deliberate source update; do not reinterpret existing responses as dates in a new season.
