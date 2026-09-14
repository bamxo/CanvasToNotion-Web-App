---
name: verify-cohort
description: Drives the Cohort web app (frontend/ + backend/) in a real Chrome tab via the claude-in-chrome tools to prove a user-facing feature actually works — marketing pages, auth, contact form, or the authenticated Settings/billing page. Use after building or changing a user-facing feature, per CLAUDE.md's "verify before done" rule, or whenever asked to verify/prove Cohort behavior in the browser.
---

# Verify Cohort

Cohort's user surface is a browser web app (React + Vite frontend, Express backend). This skill drives it the way a real user does — clicking, typing, reading the rendered page — using Claude-in-Chrome as the drive mechanism. There is no CLI control harness for this app; every step below is a claude-in-chrome tool call.

Read `features/README.md` first, then the matching feature file under `features/` for the exact recipe. If no feature file covers what changed, add one (see that README's "Feature entry contract") before or while verifying.

## 0. Load the tools

These are deferred MCP tools — call `ToolSearch` once with all of them before driving anything:

```
ToolSearch({ query: "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__find,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__read_network_requests,mcp__claude-in-chrome__form_input", max_results: 15 })
```

## 1. Launch

Two processes, started separately, both required for anything past the marketing pages:

- **Frontend** — from the repo root: `npm run dev` (Vite, `frontend/` as root). Ready when the terminal prints `Local: http://localhost:5173/`.
- **Backend** — `cd backend && npm run dev` (nodemon on `src/index.ts`). Ready when the terminal prints `Server running on port 3000`. `backend/.env` already carries working dev Firebase/Stripe/Notion/Gmail credentials — don't regenerate it.

Marketing-only features (Landing Page) only need the frontend running. Anything that calls the API — Login, Contact, Signup, Settings — needs both.

Teardown: `Ctrl+C` in each terminal, or `kill` the two node processes you started. Never `pkill node` — that can kill an unrelated process on the user's machine.

## 2. Doctor

Before driving anything, confirm both processes are actually the ones you (or the user) just started, on the expected ports:

```bash
curl -sf http://localhost:5173/ >/dev/null && echo "frontend: up" || echo "frontend: DOWN"
curl -sf http://localhost:3000/health && echo || echo "backend: DOWN"
```

`backend: DOWN` for a feature that needs the API means stop and (re)launch — don't drive against a half-up backend and call a timeout "verified." If port 5173 or 3000 is already bound by something you didn't start, ask before reusing it; don't assume it's safe to drive.

## 3. Drive

Open a dedicated tab, don't reuse one of the user's existing tabs unless they explicitly ask:

```
mcp__claude-in-chrome__tabs_create_mcp({})
mcp__claude-in-chrome__navigate({ tabId, url: "http://localhost:5173/<route>" })
```

Then follow the matching feature file's "Driving it with claude-in-chrome" section. General rules that apply across every feature:

- Prefer `mcp__claude-in-chrome__find` (by role/accessible name) or `read_page` over screen coordinates. Coordinates drift when the page reflows; accessible names don't.
- Use `mcp__claude-in-chrome__form_input` for filling form fields rather than clicking + typing character by character.
- The Landing Page and most auth pages render a splash/animation on first paint — `read_page` or `find` for the target element rather than acting immediately on navigation, so you're not clicking through a transition.
- Never trigger a real `window.confirm`/`alert` (Settings' "Delete Account" button calls `window.confirm` before deleting) — see that feature file for how to handle it safely.
- Any button that calls `window.open(...)` to an external site (the Chrome Web Store "Install Extension" / "Add to Chrome" buttons) opens a new tab you did not ask for. Don't click these during verification; close the extra tab immediately if one appears.

## 4. Evidence

For every drive, capture:

- A screenshot (`mcp__claude-in-chrome__computer` with a `screenshot` action) of the state right after the action that proves the feature, not just the landing state.
- The accessible-name text for the specific element that proves success (via `find` or `read_page`) — e.g. the exact error-message text, the exact success-banner text, the exact plan-tier heading.
- For anything that hit the backend: `read_network_requests` filtered to the relevant endpoint, showing status code and (for JSON responses) the response body shape — not just "a request happened."
- For anything that should NOT have produced a side effect (e.g. a validation error blocking submit): confirm via `read_network_requests` that the API call was never made, not just that an error string appeared.

Evidence has no fixed folder in this repo — describe what you captured and its content directly in your report to the user; don't invent a screenshots directory that nothing else reads.

## 5. Cleanup

- Close every tab you opened (`mcp__claude-in-chrome__tabs_close_mcp`) once evidence is captured, including any stray external tab opened by mistake.
- If a feature created real state (a Firebase user, a sent email, a Stripe checkout session), it must document its own cleanup in that feature's file — see `signup-settings-lifecycle.md` for the self-service Delete Account pattern. Never leave a disposable test account behind "to save time."
- Stop the frontend/backend processes you started for this run, unless the user is actively continuing to work against them.

## 6. Maintaining the map

When a feature changes shape (new field, new endpoint, new error copy), update its file under `features/` in the same change — see `/maintain-verification-skill` for the ongoing loop. Don't let the map describe a UI that no longer exists.
