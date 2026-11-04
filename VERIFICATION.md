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
