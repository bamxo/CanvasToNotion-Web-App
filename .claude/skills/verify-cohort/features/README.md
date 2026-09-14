# Cohort verification map

This directory is the maintained source for verifying the user-facing behavior of Cohort's web app. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Frontend running at `http://localhost:5173` (`npm run dev` from the repo root).
- Backend running at `http://localhost:3000` (`cd backend && npm run dev`), using the working dev credentials already in `backend/.env`.
- `curl -sf http://localhost:3000/health` returns `{"status":"ok",...}` before driving any feature that calls the API.
- A dedicated Chrome tab per run, opened via `mcp__claude-in-chrome__tabs_create_mcp` — never reuse one of the user's existing tabs unless asked.
- No two verification runs drive the same tab concurrently; this app has no per-run data isolation (one shared dev Firebase/Stripe/Notion project), so treat state-creating features (signup, contact, checkout) as one-at-a-time and see each feature file's own cleanup.

## Driving conventions

- Prefer `mcp__claude-in-chrome__find` by ARIA role + accessible name over screen coordinates or CSS selectors.
- Use `mcp__claude-in-chrome__form_input` to fill fields.
- Wait for the target element (via `find`/`read_page`) rather than acting immediately after `navigate` — several pages run an entry animation or splash screen.
- Never click a button wired to `window.open(...)` (Chrome Web Store install CTAs) or trigger `window.confirm`/`alert` without a documented plan for it (see `signup-settings-lifecycle.md`).
- Restore any state a drive creates (delete the test account, don't leave a checkout session dangling) before calling a run done.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen: a screenshot plus the exact accessible-name text of the element that proves success or failure.
- For anything backend-backed, confirm via `read_network_requests`: the right endpoint was called, with the right status code, and — for a validation path that should short-circuit — that no request was made at all.
- Record which feature ID and entry point you used with every piece of evidence.
- Report an unreachable path with the exact step that failed and the unmet precondition (backend down, port already in use by something else, etc.) — don't report a skipped path as verified through a different route.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior, then exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with claude-in-chrome`, `Gotchas`. Keep implementation detail out of the map — name only user paths, stable handles, required state, the exact tool calls, and the observable proof.

## Features

- [Landing page](./landing-page.md) — marketing site navigation and primary CTAs. No auth, no backend required.
- [Contact form](./contact-form.md) — validation states and a real submission that sends a live email.
- [Login](./login.md) — email/password sign-in, invalid-credential error path, Google sign-in entry point.
- [Signup → Settings → cleanup lifecycle](./signup-settings-lifecycle.md) — create a disposable account, verify the authenticated Settings page (profile, Free plan card, Notion connection entry point), then self-delete via Settings' Delete Account flow.
