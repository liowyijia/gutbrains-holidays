# Prototype verification — November 4, 2026

- TypeScript check passed (`tsc --noEmit`).
- Production build passed through the Sites build helper.
- The local preview returned HTTP 200.
- Local D1 migration applied successfully.
- API checks passed for response creation, shared persistence, zero-day schedules, date bounds, duplicate-name normalization, cross-origin write rejection, edit-token authorization, stale-edit conflict handling, and exclusion of edit credentials from public responses.
- Local API test data was removed. No test responses were seeded into the hosted calendar.

Browser visual and interaction QA remains outstanding: the in-app browser was unavailable, and access to Chrome was not approved in this session. Responsive styles are implemented but have not been visually verified on devices. Use the hosted prototype for the first aesthetic review.

Re-run the local API checks with a running development server using `python3 scripts/test-calendar-api.py`. This test only targets loopback and removes its own test row from local D1.

## Revision 2 — November 4, 2026

- Production build and TypeScript check passed after the copy, header, and color changes.
- Confirmed the requested phrases and original green accents are absent from the interface source.
- Confirmed the numbered Shared plans label and CSV export remain present.
- Selected-day text contrast is 6.91:1 against the soft blue visually matched to the supplied lab screenshots.
- The supplied screenshots identify the lab as “Laboratory of Gut-Brain Neurobiology,” Duke University. That identity is now used in the header and page metadata.
- This revision changes presentation only. The API and database schema retain their previously verified behavior.
- Browser interaction and responsive visual QA remain unverified because browser access was not available in this session.

## Revision 3 — November 4, 2026

- Production build and TypeScript check passed for the hexagon symbol and Helvetica typography.
- Rendered the lab SVG using Quick Look and inspected the outlined outer hexagon and filled inner hexagon.
- The SVG contains no background rectangle; both surrounding space and the gap between hexagons are transparent.
- The header and browser icons reference the same versioned SVG asset.
- Helvetica is first in the shared font stack; previously monospace labels and dates now inherit the same family. Bold headings and normal tracking follow the report reference.
- No calendar behavior or database changes were needed.

## Revision 4 — November 4, 2026

- Calendar month grids now start on Sunday, with matching weekday labels and leading-day offsets.
- Verified November 1, 2026 aligns to Sunday, December 1 to Tuesday, and January 1, 2027 to Friday.
- Production build passed. The date range, response data, and CSV ordering are unchanged.

## GitHub Pages migration — November 4, 2026

- GitHub static build and backend production build passed; TypeScript check passed.
- Local tests passed for GitHub CORS preflight, shared reads, creation from GitHub's origin, private-token updates from GitHub's origin, invalid-origin rejection, date bounds, duplicate names, zero-day schedules, stale-edit rejection, and credential privacy.
- Used the normal Vite preview for the local API tests because Wrangler's built-preview proxy restarted during writes. No production data was used in tests.
- The same calendar component is used for the original Site and GitHub Pages, retaining the Sunday-first layout, Helvetica, blue hexagon, and CSV export.
- Browser visual and interaction QA remains unavailable in this session.
- GitHub Pages inherits the account's existing `yijialiow.com` domain. Verified HTTPS HTTP 200 at the new project path and GitHub's redirect from `liowyijia.github.io`.
- Permitted both observed account origins for API access. The original Site forwards visitors and their stored edit identity to the personal-domain project path.

## Interface simplification — November 4, 2026

- GitHub static build, backend production build, and TypeScript check passed.
- Removed the whole-days/weekends row, date-range controls, clear control, and private-edit-link copy button, including unused client state and handlers.
- Added the requested three-step instructions and consistent numbered section headings.
- Moved the visibility note into a full-width, nonwrapping grid row with responsive font sizing.
- Retained individual-date selection, saved edit access, existing edit-link handling, and CSV export. No API or database changes were made.
- Visual browser verification remains unavailable in this session.

## Returning members and empty schedules — November 4, 2026

- Empty saved schedules are excluded from Team Schedule, its response count, and CSV export. The underlying edit identity remains available for later changes.
- “Edit on another device” copies a private fragment-based edit link after saving. Importing it in another browser restores the same record and token; it is removed from the address bar after import.
- Edit-link tests passed for exact identity recovery, preservation of the GitHub project path, fragment-only credentials, and malformed-link rejection.
- Local API checks passed for clearing all dates, reading the persisted empty response, and adding dates again with the original token from the other allowed origin, along with the existing authorization and revision checks. Local test data was removed.
- GitHub static build, Sites build, and TypeScript check passed. Browser visual/interaction QA remains unavailable.
- No production responses were changed, and no owner-wide deletion control was added in this revision.
