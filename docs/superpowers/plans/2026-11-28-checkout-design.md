# Checkout design alignment

**Goal:** Replace the old checkout Card/one-column Descriptions layout shown in the user's screenshot with the project's PageHeader/Section design system.

**Design:** Keep the form within 720px. Show venue and court as the main identity, then a responsive date/time/duration summary. Use a compact price table on desktop and a price list on mobile, with a single neutral total. Give contact fields and buttons the same spacing, borders and typography as the other forms. Use theme tokens and support 375px and dark mode. Preserve hold, validation and booking behavior.

**References:** User screenshot; `docs/Thiết kế/00_HE_THONG_THIET_KE.md`; `FE/CLAUDE.md`.

- [x] Confirm an accessible H1 regression fails before the UI change.
- [x] Replace checkout markup and add scoped CSS; adapt existing interval tests to the new summary semantics.
- [x] Run existing checkout/booking regression tests, lint and build.
- [x] Inspect desktop/mobile/dark in Chrome and verify booking still succeeds; cancel the local test booking.
- [x] Review the diff, run the full suite and record baseline lint failures. No commit/push.

## Verification — 28/11/2026

- Checkout/draft regression tests: 16 passed. Full `npm test`: 274 passed (shared 33, BE 154, FE 87).
- `npm run build`: passed. ESLint for the modified checkout TSX files: passed.
- Root `npm run lint`: blocked by existing BE lint findings (55 errors, 7 warnings).
- Chrome: inspected desktop 1440px, mobile 375px and dark mode. No horizontal overflow, including 50-character unbroken court/price labels.
- Created local test order `SG261128N37T` for two hours, confirmed the 600.000 ₫ total and cancelled it successfully.
- Review feedback about long strings was addressed with wrapping in the venue and price rows. No commit/push.
