# Owner bookings design alignment and page audit

**Goal:** Align `/owner/bookings` with the existing admin users table and identify other pages that do not follow the design system.

**References:** User screenshot; `docs/Thiết kế/00_HE_THONG_THIET_KE.md`; `docs/Thiết kế/01_Hung_GIAO_DIEN.md`; `FE/CLAUDE.md`.

**Approach:** Use Ant Design Table on desktop and a compact native list with accessible action menus below 992px. Reuse theme tokens, status dots, restrained typography and tabs/filter conventions. Preserve booking actions, ownership/API contracts and server pagination. Other pages receive a read-only audit with source evidence and browser confirmation where possible.

## Tasks

- [x] Add regression tests for semantic table headers, booking actions, mobile menus and status display; confirm failures before implementation.
- [x] Replace the CSS grid table, remove obsolete CSS and make the shared booking status badge follow StatusDot.
- [x] Align status tabs, named filters, date range, empty/error states and pagination with the admin table pattern; test filtering and rejection feedback.
- [x] Verify desktop/mobile/dark screenshots and preserve all allowed booking actions.
- [x] Audit remaining pages and write ranked findings with routes and evidence.
- [x] Run `npm run lint`, `npm test`, `npm run build`, inspect the diff and report baseline lint failures separately. No commits or pushes.

## Verification

- Final `npm test`: shared 33, BE 154, FE 87 tests passed (274 total).
- Final build and ESLint on changed files passed. Full repository lint retains baseline errors: BE 55 errors / 7 warnings; FE 10 errors / 10 warnings in other files.
- Chrome: checked desktop table, 375px mobile list without horizontal overflow, mobile details menu/drawer and dark theme. Main browser tab is left on the desktop bookings page.
- Review identified stale RTK Query court options when switching venue. A delayed-response regression test failed before the fix and passed after using currentData and disabling the court select during loading.
- Audit findings: `docs/Thiết kế/2026-11-28_RA_SOAT_GIAO_DIEN.md`; confirmed 375px overflow in court management and pricing, missing page heading/raw formatting in recurring creation, and heading inconsistency in owner schedule.
