# Login

Login lets an existing user sign in with email/password (POST to the backend, which verifies against Firebase) or Google. On success it stores the returned ID token and redirects to `/settings`; on failure it shows an inline error and stays on the page. There is no link to this page from the marketing site — reach it by direct URL.

## Sub-features

- `login-invalid` shows a user-friendly error for bad credentials without navigating away.
- `login-success` (requires a seeded test account — see `signup-settings-lifecycle.md`) stores the token and redirects to `/settings`.
- `login-google-entry` renders the styled Google sign-in button with Google's real GIS button overlaid on top (transparent), so clicking it opens Google's hosted OAuth popup window (`accounts.google.com`, `ux_mode: 'popup'`) rather than the docked One Tap chooser.
- `login-forgot-password` links to `/forgot-password`.

## How to get to it (user POV)

- Navigate to `http://localhost:5173/login` directly.
- From `/lookup`, click "Already have an account?" / the login link.

## Driving it with claude-in-chrome

Preconditions:

- Frontend and backend are both up.
- For `login-invalid`: no real account needed.
- For `login-success`: a seeded test account must already exist (see `signup-settings-lifecycle.md`'s signup step) — do not create one inline here.

- **Open the page.** `navigate` to `/login`. `find({ role: "heading", name: "Welcome Back" })` to confirm it loaded.
- **Invalid credentials.** `form_input` the `email` field with a syntactically valid but non-existent address (e.g. `verify-cohort-nonexistent@example.com`) and the `password` field with any string. Click the `Login` button. `read_network_requests` for the POST to the login endpoint; expect a non-2xx status. Confirm the rendered error text matches one of the mapped messages (e.g. "No account found with this email address..." or "Invalid email or password...") via `find`/`read_page` — do not just check that *some* red text appeared.
- **Valid credentials (only with a seeded account).** Same steps with the seeded test account's real email/password. Confirm navigation to `/settings` (check the tab's URL via `tabs_context_mcp` or `read_page` for the Settings heading `Overview`).
- **Proof.** Screenshot the error state with the exact error text visible, and the network request's status code from the invalid-credentials attempt.

## Gotchas

- The visible "Sign In with Google" button is a decoy — the real click target is Google's own `renderButton()` output, absolutely positioned on top with `opacity: 0` (`.google-button-overlay` in `Login.module.css`). Clicking it opens `accounts.google.com`'s real hosted OAuth consent screen as a genuine small popup *window* (not a docked bubble) and requires a real Google account — don't attempt to drive this end-to-end with browser automation; verifying the overlay renders inside `.google-button-wrapper` (via `read_page`, not a click) is sufficient proof for this entry point.
- The password field toggles type between `password` and `text` via an eye icon (`alt="toggle password visibility"`) — if you need to confirm the value was typed correctly, click the toggle before reading rather than relying on the masked value.
- A successful login also calls `chrome.runtime.sendMessage` to talk to the (separate-repo) browser extension. In a plain Chrome tab with no real extension installed this call throws, but the code treats it as non-fatal — a console error here is expected and is not itself a failure.
