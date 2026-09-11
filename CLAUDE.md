# Cohort (formerly Canvas to Notion)

Web app for Cohort: landing page, auth, billing (subscriptions + lifetime),
and account settings for users of the Cohort browser extension. The
extension itself lives in a separate repo — this repo is web-app only
(frontend + backend), not the extension codebase.

Monorepo layout: `frontend/` (React 18 + TS + Vite + Tailwind), `backend/`
(Express + TS, Firebase/Firestore, Stripe billing, Notion API), `e2e/`
(end-to-end tests).

## Commands

- `npm run dev` — start frontend dev server (Vite)
- `npm run build` — production build (frontend)
- `npm run test:frontend` / `npm run test:backend` / `npm run test:e2e`
- `npm run lint` — eslint

## Rules

- This repo is web-app only. Never edit the extension repo.
- `tier` is always `free | pro | lifetime | legacy` — no separate flags.
- Canvas identity = `school_domain__canvas_user_id`, never raw ID alone.
- Free-tier synced classes can never be un-synced or swapped.
- No `useEffect` for data fetching — use TanStack Query
  (`@tanstack/react-query`).
- Copy the nearest existing working pattern before inventing a new one.
- For non-trivial logic (business rules, calculations, state machines):
  write the test first, then implement, then run the suite.
- No comments in generated code.
- Don't manually add useMemo/useCallback/React.memo in `frontend/` —
  React Compiler handles this automatically. Only reach for them if
  profiling shows a specific case the compiler doesn't handle.
- After building or changing a user-facing feature: add or update its
  page under `.claude/skills/verify-cohort/features/` (see that skill's
  README for the format), then run `verify-cohort` on it before
  considering the task done.

## More

See `conventions.md` for code style and structural conventions.
