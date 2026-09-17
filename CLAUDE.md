# Cohort (formerly Canvas to Notion)

Web app for Cohort: landing page, auth, billing (subscriptions + lifetime),
and account settings for users of the Cohort browser extension. This repo
is the web-app codebase (frontend + backend); the extension has its own
repo (see Rules below).

Monorepo layout: `frontend/` (React 18 + TS + Vite + Tailwind), `backend/`
(Express + TS, Firebase/Firestore, Stripe billing, Notion API).

## Commands

- `npm run dev` — start frontend dev server (Vite)
- `npm run build` — production build (frontend)
- `npm run test:frontend` / `npm run test:backend`
- `npm run lint` — eslint

## Rules

- Extension repo: `/Users/landonnguyen/Developer/c2n/CanvasToNotion-Extension`.
  Editing it is fine; after any edit there, run `npm run build:extension:dev`
  in that directory.
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
- After finishing a feature: build + test every part touched (`frontend/`,
  `backend/`, extension repo) and fix any failures before calling it done.

## More

See `conventions.md` for code style and structural conventions.
