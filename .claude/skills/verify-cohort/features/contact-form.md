# Contact form

The contact page lets a visitor send a message (with an optional attachment) to Cohort's support inbox. On submit it POSTs to the backend's contact endpoint, which sends a real email via Gmail using the credentials in `backend/.env` — a live side effect, not a mock.

## Sub-features

- `contact-validate` blocks submission until Name, Inquiry Type, Email, and Message are filled.
- `contact-submit` sends the message and shows a success banner.
- `contact-error` shows an inline error banner and preserves form input when the backend call fails.

## How to get to it (user POV)

- Navigate to `http://localhost:5173/contact` directly, or via the nav bar's `Contact` link from any landing page.

## Driving it with claude-in-chrome

Preconditions:

- Frontend and backend are both up (`/health` returns `ok`).
- You have explicit sign-off to send a real email — this recipe's "submit" step is NOT a dry run.

- **Open the form.** `navigate` to `/contact`. `find({ role: "heading", name: "Contact Us" })` to confirm the page loaded.
- **Verify the disabled/validation state.** Confirm the submit button (`find({ role: "button", name: /send/i })`, exact label from `read_page`) exists; the browser's native `required` validation blocks submission with empty fields — leaving the form empty and clicking submit should keep you on the page with no network request fired (confirm via `read_network_requests`).
- **Fill the form.** `form_input` each field by its accessible name: `Name *`, `Inquiry Type *` (select — choose `General Question`), `Email Address *`, `Message *`. Use an obviously-marked test message, e.g. name `Verify Run <timestamp>`, message body prefixed `[verify-cohort test — safe to ignore]`, so a human skimming the inbox can tell it's synthetic.
- **Submit.** Click the submit button. `read_network_requests` for the POST to the contact endpoint; confirm a `2xx` status. `find({ role: undefined, name: /sent successfully/i })` (the success banner text) to confirm the UI reflects it.
- **Proof.** Screenshot the success banner. Include the network request's status code and the exact request body you sent (so the sent test email is traceable) in your report.

## Gotchas

- **This sends a real email** to the address configured as `GMAIL_USER` in `backend/.env`. Never run the submit step speculatively or repeatedly "just to check" — one clearly-marked run is enough proof. Prefer the validation-only steps when you just need to confirm the form renders/validates.
- The file-attachment path switches the request from JSON to `multipart/form-data` — if verifying attachments specifically, check `read_network_requests` for the `Content-Type` header rather than assuming JSON.
- A 30-second client-side timeout aborts the request and shows a network-error banner; don't mistake a slow local backend for a genuine submit failure — check the backend terminal/log first.
