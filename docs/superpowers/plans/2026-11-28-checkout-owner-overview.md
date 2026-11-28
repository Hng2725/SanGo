# Checkout fixes and owner overview implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement these tasks inline. Do not commit or push.

**Goal:** Fix the three reproduced checkout defects and align the owner overview with the existing admin overview and the user's screenshots.

**Architecture:** Preserve API contracts and backend behavior. Make hold cleanup safe under React StrictMode, handle errors by shared error code, and format each price row from its timestamps. Reuse the admin overview's PageHeader, Section, scoreboard styles and booking chart for the owner's existing data.

**Tech Stack:** React 19, Ant Design 6, RTK Query, shared Zod schemas, Vitest/RTL/MSW.

**Spec:** User request and reference screenshots; `docs/Thiết kế/00_HE_THONG_THIET_KE.md`, `docs/Thiết kế/01_Hung_GIAO_DIEN.md` (admin overview); project rules in `FE/CLAUDE.md`.

## Constraints and decisions

- Work in the current checkout so the existing local dev server and browser use the changes; no commits, pushes, migrations or dependencies.
- Keep shared DTOs and endpoints unchanged; do not invent occupancy, review totals or comparison data absent from the owner API.
- Use theme tokens and the existing shared dashboard styles. Preserve 7/14-day selection and owner navigation.
- Revenue points count completed bookings: describe that chart accurately.

## Review focus

- StrictMode effect replay must retain a hold; actual exit releases it exactly once; successful booking does not delete it.
- An expired server-side hold must stop resubmission and show the recovery action, even while the local timer is positive.
- Price rows always show the actual interval, including midnight and special-price labels.
- Refresh reloads summary, revenue, pending bookings and venues; errors must not appear as zero-valued success.
- Owner overview matches admin spacing/type/scoreboard/section hierarchy at desktop and 375px, including dark mode.

## Task 1: Checkout regression fixes

- [x] Add MSW behavior tests for StrictMode booking, real exit cleanup, success cleanup, error codes, and default/midnight price rows; run and confirm failures.
- [x] Defer hold release past StrictMode replay, retain real exit cleanup, use shared error helpers and context-aware messages.
- [x] Render intervals independently of optional price labels; reuse shared field validation and set page title.
- [x] Run checkout tests and confirm all pass.

## Task 2: Owner overview alignment

- [x] Add owner overview tests for refresh, range selection and loading/error behavior; confirm the refresh regression fails.
- [x] Extract the existing booking chart into a shared UI component with an optional accessible label; preserve the existing admin import via re-export.
- [x] Rebuild owner overview with PageHeader, scoreboard and Section, existing chart and task-list styles; replace the obsolete owner CSS with token-based responsive rules.
- [x] Use VN dates, actual query timestamps and refetch all current queries.
- [x] Verify owner and existing chart tests pass; update member checklists for the completed corrections.

## Task 3: Verification

- [x] Run `npm run lint`, `npm test`, `npm run build`; report unrelated baseline lint failures separately.
- [x] Verify booking succeeds through Chrome, cancel the local test booking, and verify an expired hold has the correct message.
- [x] Compare owner/admin dashboards at desktop and inspect owner at 375px and in dark mode.
- [x] Review the diff and working-tree status; no commit or push.

## Verification results

- Final full suite: shared 33, BE 154, FE 80 tests passed (267 total).
- Final `npm run build`: passed; ESLint on all changed TypeScript/TSX files: passed.
- Repository lint retains baseline failures: BE 55 errors / 7 warnings; FE 12 errors / 11 warnings in other files. The checkout lint error was also resolved.
- Chrome: created a two-hour, 600,000 VND booking and cancelled it; confirmed default price intervals; reproduced a missing server hold and verified the expiry message and disabled submit button.
- Owner overview inspected at 1440px and 375px, light/dark; 7/14-day switching and all refresh requests verified. No horizontal page overflow at 375px.
- Independent code review: no blocking findings; its large-revenue observation was covered with compact formatting shared with admin and an additional UI regression test.
