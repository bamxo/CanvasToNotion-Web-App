# Signup → Settings → cleanup lifecycle

This is the one continuous path that proves account creation, the authenticated Settings page (profile, Free-tier plan card, Notion connection entry point, sign-out), and self-service account deletion. Because signup creates a real Firebase user in the shared dev project, this recipe is written to be self-cleaning: it deletes what it creates before finishing.

## Sub-features

- `signup-validate` blocks submission on a short password or mismatched confirmation.
- `signup-create` creates the account, auto-logs in, and lands on `/get-started`.
- `get-started-to-settings` — the "Go to Settings" button routes to `/settings`.
- `settings-profile` shows the signed-in user's name/email once the user-info request resolves.
- `settings-free-plan` shows the Free-tier plan card. A brand-new account has not connected Notion yet, so the card shows `Connect Notion to start syncing your classes`, not a `0/N classes synced` count — that count string only renders once `notionConnected` is true.
- `settings-notion-entry` shows "Not connected to Notion" and an "Add Connection" button (does not complete the real Notion OAuth handshake — that requires a live Notion workspace).
- `settings-delete-account` deletes the account via a confirmed `window.confirm`, returning the user to `/login` — this is this recipe's cleanup step, not a separate concern.

## How to get to it (user POV)

- `/lookup` → "Sign Up with Email" → `/signup`.
- Fill the signup form → `/get-started` → "Go to Settings" → `/settings`.
- `/settings` → "Delete Account" (confirms via a browser dialog) → back to `/login`.

## Driving it with claude-in-chrome

Preconditions:

- Frontend and backend both up.
- Pick a disposable test email you can recognize later if cleanup ever fails, e.g. `verify-cohort+<unix-timestamp>@example.com`. Password: any 8+ character string; confirmation must match exactly.

- **Open signup.** `navigate` to `/lookup`, `find({ role: "button", name: "Sign Up with Email" })`, click it, confirm URL is `/signup`.
- **Fill and submit.** `form_input` `email`, `password`, `confirmPassword` (both password fields must match). Click the submit button. `read_network_requests` for the signup POST (expect 2xx) and the follow-up login POST (expect 2xx with an `idToken` in the response body — don't just check the status code, the token is what makes every later step possible).
- **Land on Get Started.** Confirm navigation to `/get-started` and `find({ role: "heading", name: "Welcome to Canvas to Notion!" })`.
- **Go to Settings.** Click the `Go to Settings` button. Confirm navigation to `/settings`.
- **Verify profile.** `find`/`read_page` for the account's display name and email once the profile skeleton (`data-testid="profile-skeleton"`) is gone — don't read the name while the skeleton is still showing.
- **Verify the plan card.** Confirm the Free plan card renders (once the `PlanCardSkeleton` clears) showing `Free Plan (Active)`. Since this account hasn't connected Notion yet, assert the muted string `Connect Notion to start syncing your classes` — do **not** assert `0 / <limit> classes synced (0%)`; that string only appears once `notionConnected` is true, which a fresh signup never is.
- **Verify the Notion entry point.** Once `data-testid="connections-skeleton"` clears, confirm the text `Not connected to Notion` and a button named `Add Connection` are present. Do not click it — it navigates off-app to `https://api.notion.com/...` and needs a real Notion workspace login to complete.
- **Cleanup: delete the account.** Click `Delete Account`. This calls `window.confirm(...)` — **do not let the automation trigger a real unhandled browser dialog** (it blocks all further tool calls). Before clicking, arm a one-shot auto-accept via `mcp__claude-in-chrome__javascript_tool` injecting `window.confirm = () => true;` into the page, then click `Delete Account`. Confirm the network request to the delete-account endpoint returns 2xx, and that the app redirects to `/login`.
- **Proof.** Screenshot the Settings page showing the profile, Free plan card, and Notion entry point together, plus the delete-account request's 2xx status.

## Gotchas

- **Skip the `window.confirm` override and you can hang the whole browser session** — a real, un-mocked confirm dialog blocks every subsequent tool call. Always inject the override before clicking Delete Account.
- Signup auto-logs in and lands on `/get-started`, **not** `/settings` — don't treat a stall on `/get-started` as a failed signup.
- If the delete-account step fails partway (network blip, wrong selector), the disposable account is left behind in the shared dev Firebase project. Re-run just the delete step by logging back in with the same test credentials and retrying — don't abandon a half-created test account.
- The plan card and connections section each render a skeleton first; reading `0 / 0 classes synced` from a skeleton placeholder instead of the resolved card is a false proof — always wait for the matching `data-testid` skeleton to disappear.
- `chrome.runtime.sendMessage` calls throughout this flow (extension handoff) fail loudly in a plain Chrome tab with no real extension installed. That's expected and non-fatal — it's caught and logged, not surfaced to the user.
